import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { formatApptDateTime } from "@/lib/wa-templates/send";

type Params = { params: Promise<{ id: string }> };
type SmsPurpose = "onay" | "hatirlatma" | "iptal";

/**
 * WhatsApp'taki notify/route.ts ile aynı amaç: personelin randevu
 * detayından elle SMS gönderebilmesi. Şablon onayı gerektirmediği
 * için (WhatsApp'ın aksine) mesaj burada düz metin olarak kuruluyor.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { purpose?: SmsPurpose };
  const purpose = body.purpose;
  if (!purpose || !["onay", "hatirlatma", "iptal"].includes(purpose)) {
    return NextResponse.json({ error: "Geçersiz mesaj türü" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: appt }, { data: org }] = await Promise.all([
    supabase
      .from("appointments")
      .select("org_id, customer_name, customer_phone, appointment_at")
      .eq("id", id)
      .eq("org_id", member.org_id)
      .single(),
    supabase
      .from("organizations")
      .select("name, custom_reminder_message, custom_cancellation_message")
      .eq("id", member.org_id)
      .single(),
  ]);

  if (!appt) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (!appt.customer_phone) return NextResponse.json({ error: "Müşteri telefonu kayıtlı değil" }, { status: 400 });

  const { date, time } = formatApptDateTime(appt.appointment_at);
  const salon = org?.name || "Salonunuz";

  const message =
    purpose === "onay"
      ? `Sayın ${appt.customer_name}, ${salon} salonundaki ${date} ${time} tarihli randevunuz onaylandı.`
      : purpose === "hatirlatma"
        ? `Sayın ${appt.customer_name}, ${salon} salonundaki ${date} ${time} tarihli randevunuzu hatırlatırız.${org?.custom_reminder_message ? " " + org.custom_reminder_message : ""}`
        : `Sayın ${appt.customer_name}, ${salon} salonundaki ${date} ${time} tarihli randevunuz iptal edildi.${org?.custom_cancellation_message ? " " + org.custom_cancellation_message : ""}`;

  const result = await sendSms({ toPhone: appt.customer_phone, orgId: appt.org_id, message });

  if ("error" in result) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
