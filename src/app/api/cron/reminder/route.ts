import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { format, addHours, subHours } from "date-fns";
import { tr } from "date-fns/locale";

export const runtime = "nodejs";

async function sendWhatsApp(phone: string, message: string, token: string, phoneNumberId: string) {
  const to = phone.replace(/\D/g, "").replace(/^0/, "90");
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });
}

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();

  // Find appointments in next 24h that haven't been reminded
  const window24Start = now.toISOString();
  const window24End = addHours(now, 25).toISOString();

  const { data: upcoming } = await supabase
    .from("appointments")
    .select("*, organizations(wa_token, wa_phone_number_id, name), staff(full_name), service:services(name)")
    .gte("appointment_at", window24Start)
    .lte("appointment_at", window24End)
    .eq("status", "onaylandi")
    .is("reminder_sent_at", null)
    .limit(500);

  // Find appointments in next 2h that haven't had second reminder
  const window2Start = now.toISOString();
  const window2End = addHours(now, 2.5).toISOString();

  const { data: imminent } = await supabase
    .from("appointments")
    .select("*, organizations(wa_token, wa_phone_number_id, name), staff(full_name), service:services(name)")
    .gte("appointment_at", window2Start)
    .lte("appointment_at", window2End)
    .eq("status", "onaylandi")
    .is("reminder2_sent_at", null)
    .not("reminder_sent_at", "is", null)
    .limit(500);

  let sent24 = 0;
  let sent2 = 0;

  for (const appt of (upcoming || [])) {
    const org = (appt as { organizations: { wa_token?: string; wa_phone_number_id?: string; name: string } }).organizations;
    if (!org?.wa_token || !org?.wa_phone_number_id) continue;

    const apptDate = format(new Date(appt.appointment_at), "d MMMM yyyy", { locale: tr });
    const apptTime = format(new Date(appt.appointment_at), "HH:mm");
    const message = `Merhaba ${appt.customer_name}! 👋

📅 Yarın ${apptDate} saat ${apptTime} için ${org.name}'de randevunuz var.

💇 Hizmet: ${(appt as { service?: { name: string } }).service?.name}
👤 Personel: ${(appt as { staff?: { full_name: string } }).staff?.full_name}

Gelemeseniz lütfen önceden iptal edin: ${process.env.NEXT_PUBLIC_APP_URL}/r/iptal/${appt.cancel_token}

İyi günler! ✨`;

    try {
      await sendWhatsApp(appt.customer_phone, message, org.wa_token, org.wa_phone_number_id);
      await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
      sent24++;
    } catch {}
  }

  for (const appt of (imminent || [])) {
    const org = (appt as { organizations: { wa_token?: string; wa_phone_number_id?: string; name: string } }).organizations;
    if (!org?.wa_token || !org?.wa_phone_number_id) continue;

    const apptTime = format(new Date(appt.appointment_at), "HH:mm");
    const message = `⏰ Hatırlatma! Bugün saat ${apptTime} için ${org.name}'deki randevunuz 2 saat sonra.

Hazır olun, sizi bekliyoruz! 💅`;

    try {
      await sendWhatsApp(appt.customer_phone, message, org.wa_token, org.wa_phone_number_id);
      await supabase.from("appointments").update({ reminder2_sent_at: new Date().toISOString() }).eq("id", appt.id);
      sent2++;
    } catch {}
  }

  return NextResponse.json({ sent_24h: sent24, sent_2h: sent2 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
