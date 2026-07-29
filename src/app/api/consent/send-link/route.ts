import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getActiveMember } from "@/lib/active-org";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { waMessageLink } from "@/lib/wa-template";

/**
 * Panel-yetkili: müşteri o an yanında değilken (telefon/geçmiş kayıt) KVKK
 * onay linki üretir. Meta onaylı bir şablon gerektirmemesi için Cloud API
 * yerine wa.me deep link döner — personel kendi WhatsApp'ından gönderir.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const customerId = typeof body.customer_id === "string" ? body.customer_id : undefined;
  const phone = typeof body.phone === "string" ? body.phone : undefined;
  if (!phone) return NextResponse.json({ error: "Telefon gerekli" }, { status: 400 });

  const admin = await createAdminClient();
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("consent_requests").insert({
    org_id: member.org_id,
    customer_id: customerId ?? null,
    phone,
    token,
    expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/onay/${token}`;
  const message = `Merhaba, randevu ve bilgilendirme mesajları gönderebilmemiz için KVKK onayınızı almamız gerekiyor. Lütfen şu linke tıklayın: ${link}`;

  return NextResponse.json({ link, wa_link: waMessageLink(phone, message) });
}
