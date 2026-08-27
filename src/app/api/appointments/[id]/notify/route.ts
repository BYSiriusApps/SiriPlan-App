import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";
import type { WaPurpose } from "@/lib/wa-templates/registry";

type Params = { params: Promise<{ id: string }> };

/**
 * Personelin randevu detayından elle "hatırlatmayı şimdi gönder" veya
 * "iptal bildirimini yeniden gönder" yapabilmesi için — otomatik
 * cron/olay tetiklemelerinden bağımsız, aynı sendPurposeTemplate()
 * uygulamasını kullanır.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { purpose?: WaPurpose };
  const purpose = body.purpose;
  if (!purpose || !["onay", "iptal", "revize", "hatirlatma"].includes(purpose)) {
    return NextResponse.json({ error: "Geçersiz mesaj türü" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: appt } = await supabase
    .from("appointments")
    .select("org_id, customer_name, customer_phone, appointment_at, cancel_token, status")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (!appt) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (!appt.customer_phone) return NextResponse.json({ error: "Müşteri telefonu kayıtlı değil" }, { status: 400 });

  const { date, time } = formatApptDateTime(appt.appointment_at);

  const vars =
    purpose === "revize"
      ? { customer_name: appt.customer_name, new_date: date, new_time: time }
      : { customer_name: appt.customer_name, date, time };

  const result = await sendPurposeTemplate({
    toPhone: appt.customer_phone,
    orgId: appt.org_id,
    purpose,
    vars,
    appointmentAt: appt.appointment_at,
    cancelToken: appt.cancel_token,
  });

  if ("error" in result) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
