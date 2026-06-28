import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email/send";
import { format, addHours } from "date-fns";
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

  // Appointments in next 24h not yet reminded
  const { data: upcoming } = await supabase
    .from("appointments")
    .select("*, organizations(wa_token, wa_phone_number_id, name, email), staff(full_name), service:services(name)")
    .gte("appointment_at", now.toISOString())
    .lte("appointment_at", addHours(now, 25).toISOString())
    .eq("status", "onaylandi")
    .is("reminder_sent_at", null)
    .limit(500);

  // Appointments in next 2h that got first reminder but not second
  const { data: imminent } = await supabase
    .from("appointments")
    .select("*, organizations(wa_token, wa_phone_number_id, name, email), staff(full_name), service:services(name)")
    .gte("appointment_at", now.toISOString())
    .lte("appointment_at", addHours(now, 2.5).toISOString())
    .eq("status", "onaylandi")
    .is("reminder2_sent_at", null)
    .not("reminder_sent_at", "is", null)
    .limit(500);

  let sent24 = 0;
  let sent2 = 0;

  type ApptWithRelations = {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_id?: string;
    appointment_at: string;
    cancel_token?: string;
    organizations: { wa_token?: string; wa_phone_number_id?: string; name: string; email?: string };
    staff?: { full_name: string };
    service?: { name: string };
  };

  // Helper: get customer email from customers table
  async function getCustomerEmail(customerId?: string): Promise<string | null> {
    if (!customerId) return null;
    const { data } = await supabase
      .from("customers")
      .select("email")
      .eq("id", customerId)
      .single();
    return (data as { email?: string } | null)?.email ?? null;
  }

  for (const appt of (upcoming || []) as ApptWithRelations[]) {
    const org = appt.organizations;
    const apptDate = format(new Date(appt.appointment_at), "d MMMM yyyy", { locale: tr });
    const apptTime = format(new Date(appt.appointment_at), "HH:mm");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";

    // WhatsApp
    if (org.wa_token && org.wa_phone_number_id) {
      const message = `Merhaba ${appt.customer_name}! 👋\n\n📅 Yarın ${apptDate} saat ${apptTime} için ${org.name}'de randevunuz var.\n\n💇 Hizmet: ${appt.service?.name ?? ""}\n👤 Personel: ${appt.staff?.full_name ?? ""}\n\nGelemeseniz lütfen önceden iptal edin: ${appUrl}/r/iptal/${appt.cancel_token}\n\nİyi günler! ✨`;
      try {
        await sendWhatsApp(appt.customer_phone, message, org.wa_token, org.wa_phone_number_id);
      } catch {}
    }

    // Email
    const customerEmail = await getCustomerEmail(appt.customer_id);
    if (customerEmail) {
      try {
        await sendReminderEmail({
          to: customerEmail,
          customerName: appt.customer_name,
          orgName: org.name,
          serviceName: appt.service?.name ?? "",
          staffName: appt.staff?.full_name ?? "",
          appointmentAt: new Date(appt.appointment_at),
          cancelToken: appt.cancel_token,
        }, 24);
      } catch {}
    }

    await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
    sent24++;
  }

  for (const appt of (imminent || []) as ApptWithRelations[]) {
    const org = appt.organizations;
    const apptTime = format(new Date(appt.appointment_at), "HH:mm");

    // WhatsApp
    if (org.wa_token && org.wa_phone_number_id) {
      const message = `⏰ Hatırlatma! Bugün saat ${apptTime} için ${org.name}'deki randevunuz 2 saat sonra.\n\nHazır olun, sizi bekliyoruz! 💅`;
      try {
        await sendWhatsApp(appt.customer_phone, message, org.wa_token, org.wa_phone_number_id);
      } catch {}
    }

    // Email
    const customerEmail = await getCustomerEmail(appt.customer_id);
    if (customerEmail) {
      try {
        await sendReminderEmail({
          to: customerEmail,
          customerName: appt.customer_name,
          orgName: org.name,
          serviceName: appt.service?.name ?? "",
          staffName: appt.staff?.full_name ?? "",
          appointmentAt: new Date(appt.appointment_at),
          cancelToken: appt.cancel_token,
        }, 2);
      } catch {}
    }

    await supabase.from("appointments").update({ reminder2_sent_at: new Date().toISOString() }).eq("id", appt.id);
    sent2++;
  }

  return NextResponse.json({ sent_24h: sent24, sent_2h: sent2 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
