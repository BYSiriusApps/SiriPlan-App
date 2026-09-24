import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { getTrackableMetricKeys } from "@/lib/customer-fields/catalog";

type Params = { params: Promise<{ id: string }> };

/**
 * Zaman içinde değişen sayısal müşteri metrikleri (kilo gibi).
 *  GET  /api/customers/[id]/metrics?metric_key=weight&limit=10
 *  POST /api/customers/[id]/metrics   { metric_key, value, note?, recorded_at? }
 *
 * bkz. supabase/migrations/20260922_customer_custom_fields.sql
 */

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const metricKey = searchParams.get("metric_key");
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 100);

  let query = supabase
    .from("customer_metrics")
    .select("id, metric_key, value, note, recorded_at, created_at")
    .eq("org_id", member.org_id)
    .eq("customer_id", id)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (metricKey) query = query.eq("metric_key", metricKey);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ metrics: data ?? [] });
}

const CreateSchema = z.object({
  metric_key: z.string().trim().min(1).max(60),
  value: z.number().finite(),
  note: z.string().trim().max(300).nullish(),
  recorded_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
  }
  const body = parsed.data;

  const trackable = getTrackableMetricKeys(member.organizations?.type);
  if (!trackable.includes(body.metric_key)) {
    return NextResponse.json({ error: "Bu sektörde takip edilmeyen bir metrik" }, { status: 400 });
  }

  // Müşteri gerçekten bu org'a mı ait — RLS zaten kapsar ama net 404 için ayrıca kontrol.
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  const { data, error } = await supabase
    .from("customer_metrics")
    .insert({
      org_id: member.org_id,
      customer_id: id,
      metric_key: body.metric_key,
      value: body.value,
      note: body.note ?? null,
      recorded_at: body.recorded_at ?? new Date().toISOString().slice(0, 10),
      created_by: user.id,
    })
    .select("id, metric_key, value, note, recorded_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ metric: data });
}
