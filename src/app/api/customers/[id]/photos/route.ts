import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveMember } from "@/lib/active-org";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { hasVisualResultFeature } from "@/lib/customer-fields/visual-sectors";

type Params = { params: Promise<{ id: string }> };

const BUCKET = "customer-photos";
const SIGNED_URL_TTL = 3600; // 1 saat — bkz. 20260923_customer_before_after_photos.sql (private bucket)

/**
 * Önce/Sonra müşteri fotoğrafları — yalnızca görsel-sonuç-odaklı sektörlerde
 * (bkz. hasVisualResultFeature) kullanılır.
 *  GET  /api/customers/[id]/photos
 *  POST /api/customers/[id]/photos   { before_path, after_path, note?, consent_confirmed }
 */

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data, error } = await supabase
    .from("customer_photos")
    .select("id, before_path, after_path, note, taken_at, created_at")
    .eq("org_id", member.org_id)
    .eq("customer_id", id)
    .order("taken_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bucket private — her görüntülemede kısa ömürlü imzalı URL üretilir,
  // ham path hiçbir zaman istemciye geri dönmez.
  const admin = await createAdminClient();
  const photos = await Promise.all(
    (data ?? []).map(async (p) => {
      const [before, after] = await Promise.all([
        admin.storage.from(BUCKET).createSignedUrl(p.before_path, SIGNED_URL_TTL),
        admin.storage.from(BUCKET).createSignedUrl(p.after_path, SIGNED_URL_TTL),
      ]);
      return {
        id: p.id,
        note: p.note,
        taken_at: p.taken_at,
        created_at: p.created_at,
        before_url: before.data?.signedUrl ?? null,
        after_url: after.data?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ photos });
}

const CreateSchema = z.object({
  before_path: z.string().trim().min(1).max(500),
  after_path: z.string().trim().min(1).max(500),
  note: z.string().trim().max(300).nullish(),
  consent_confirmed: z.literal(true, {
    error: "Fotoğrafı kaydetmeden önce müşteri rızası onayı gerekli",
  }),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  if (!hasVisualResultFeature(member.organizations?.type)) {
    return NextResponse.json({ error: "Bu sektörde kullanılamaz" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }
  const body = parsed.data;

  // Yol gerçekten bu org'a mı ait — istemcinin gönderdiği path'in çapraz-kiracı
  // bir yolu işaret etmediğinden emin ol (upload zaten org_id'ye sabitliyor
  // ama burada da doğrulanır, /api/uploads dışından çağrılma ihtimaline karşı).
  const orgPrefix = `${member.org_id}/customers/${id}/`;
  if (!body.before_path.startsWith(orgPrefix) || !body.after_path.startsWith(orgPrefix)) {
    return NextResponse.json({ error: "Geçersiz fotoğraf yolu" }, { status: 400 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  const { data, error } = await supabase
    .from("customer_photos")
    .insert({
      org_id: member.org_id,
      customer_id: id,
      before_path: body.before_path,
      after_path: body.after_path,
      note: body.note ?? null,
      consent_confirmed: true,
      created_by: user.id,
    })
    .select("id, note, taken_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ photo: data });
}
