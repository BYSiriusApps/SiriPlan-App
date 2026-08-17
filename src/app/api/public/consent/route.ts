import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { renderKvkkNotice } from "@/lib/kvkk";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

async function findByToken(token: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("consent_requests")
    .select("id, org_id, phone, customer_id, completed_at, expires_at, organizations(name, kvkk_notice_text)")
    .eq("token", token)
    .single();
  return { supabase, req: data as unknown as {
    id: string; org_id: string; phone: string; customer_id: string | null;
    completed_at: string | null; expires_at: string;
    organizations?: { name: string; kvkk_notice_text: string | null } | null;
  } | null };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }

  const { req: consentReq } = await findByToken(token);
  if (!consentReq) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  if (new Date(consentReq.expires_at) < new Date()) {
    return NextResponse.json({ error: "Bu bağlantının süresi dolmuş." }, { status: 410 });
  }

  const orgName = consentReq.organizations?.name ?? "";
  return NextResponse.json({
    org_name: orgName,
    notice_text: renderKvkkNotice(consentReq.organizations?.kvkk_notice_text, orgName),
    completed: !!consentReq.completed_at,
  });
}

export async function POST(req: NextRequest) {
  // Token tahmin denemelerini ve customer_consents tablosuna sahte kayıt
  // yağdırma (KVKK kayıt bütünlüğü) girişimlerini sınırlar.
  const limit = limitByIp(req, "public-consent", 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }
  const kvkk = !!body?.kvkk;
  const marketing = !!body?.marketing;
  if (!kvkk) {
    return NextResponse.json({ error: "KVKK onayı zorunludur." }, { status: 400 });
  }

  const { supabase, req: consentReq } = await findByToken(token);
  if (!consentReq) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  if (new Date(consentReq.expires_at) < new Date()) {
    return NextResponse.json({ error: "Bu bağlantının süresi dolmuş." }, { status: 410 });
  }

  const noticeSnapshot = renderKvkkNotice(consentReq.organizations?.kvkk_notice_text, consentReq.organizations?.name ?? "");
  const now = new Date().toISOString();

  let customerId = consentReq.customer_id;
  if (!customerId) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", consentReq.org_id)
      .eq("phone", consentReq.phone)
      .single();
    customerId = existing?.id ?? null;
  }

  if (customerId) {
    await supabase
      .from("customers")
      .update({
        kvkk_consent: true,
        kvkk_consent_at: now,
        marketing_consent: marketing,
        marketing_consent_at: marketing ? now : null,
      })
      .eq("id", customerId);
  }

  await supabase.from("customer_consents").insert([
    {
      org_id: consentReq.org_id,
      customer_id: customerId,
      phone: consentReq.phone,
      consent_type: "kvkk",
      given: true,
      source_channel: "link",
      consent_text_snapshot: noticeSnapshot,
      captured_via: "link",
    },
    ...(marketing
      ? [
          {
            org_id: consentReq.org_id,
            customer_id: customerId,
            phone: consentReq.phone,
            consent_type: "marketing",
            given: true,
            source_channel: "link",
            consent_text_snapshot: noticeSnapshot,
            captured_via: "link",
          },
        ]
      : []),
  ]);

  await supabase.from("consent_requests").update({ completed_at: now }).eq("id", consentReq.id);

  return NextResponse.json({ success: true });
}
