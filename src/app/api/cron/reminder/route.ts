import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email/send";
import { addHours, differenceInHours } from "date-fns";

export const runtime = "nodejs";

const APPOINTMENT_TZ = "Europe/Istanbul";

function formatApptTime(date: Date) {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: APPOINTMENT_TZ });
}
function formatApptDate(date: Date) {
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: APPOINTMENT_TZ });
}

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

type ApptWithRelations = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  appointment_at: string;
  cancel_token?: string;
  reminder_sent_at?: string | null;
  organizations: { wa_token?: string; wa_phone_number_id?: string; name: string; email?: string };
  staff?: { full_name: string };
  service?: { name: string };
};

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";

  // Yaklaşan (0-2.5 saat): son hatırlatma. İlk hatırlatma şartı ARANMAZ —
  // son anda alınan randevular da en az bir hatırlatma alabilsin.
  const { data: imminent } = await supabase
    .from("appointments")
    .select("*, organizations(wa_token, wa_phone_number_id, name, email), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
    .gte("appointment_at", now.toISOString())
    .lte("appointment_at", addHours(now, 2.5).toISOString())
    .eq("status", "onaylandi")
    .is("reminder2_sent_at", null)
    .limit(500);

  // 2.5-25 saat arası: ilk hatırlatma (yaklaşan pencere hariç, çift mesaj olmasın)
  const { data: upcoming } = await supabase
    .from("appointments")
    .select("*, organizations(wa_token, wa_phone_number_id, name, email), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
    .gt("appointment_at", addHours(now, 2.5).toISOString())
    .lte("appointment_at", addHours(now, 25).toISOString())
    .eq("status", "onaylandi")
    .is("reminder_sent_at", null)
    .limit(500);

  // Müşteri e-postalarını tek sorguda topla (N+1 önlenir)
  const customerIds = [
    ...new Set(
      [...((imminent || []) as ApptWithRelations[]), ...((upcoming || []) as ApptWithRelations[])]
        .map((a) => a.customer_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const emailByCustomer = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: customerRows } = await supabase
      .from("customers")
      .select("id, email")
      .in("id", customerIds);
    for (const c of (customerRows || []) as { id: string; email?: string }[]) {
      if (c.email) emailByCustomer.set(c.id, c.email);
    }
  }

  let sent24 = 0;
  let sent2 = 0;

  for (const appt of (imminent || []) as ApptWithRelations[]) {
    const org = appt.organizations;
    const apptAt = new Date(appt.appointment_at);
    const apptTime = formatApptTime(apptAt);
    const hoursAway = Math.max(1, differenceInHours(apptAt, now));

    if (org.wa_token && org.wa_phone_number_id) {
      const message = `⏰ Hatırlatma! Bugün saat ${apptTime} için ${org.name}'deki randevunuz yaklaşıyor.\n\nHazır olun, sizi bekliyoruz! 💅`;
      try {
        await sendWhatsApp(appt.customer_phone, message, org.wa_token, org.wa_phone_number_id);
      } catch {}
    }

    const customerEmail = appt.customer_id ? emailByCustomer.get(appt.customer_id) : undefined;
    if (customerEmail) {
      try {
        await sendReminderEmail({
          to: customerEmail,
          customerName: appt.customer_name,
          orgName: org.name,
          serviceName: appt.service?.name ?? "",
          staffName: appt.staff?.full_name ?? "",
          appointmentAt: apptAt,
          cancelToken: appt.cancel_token,
        }, hoursAway);
      } catch {}
    }

    // İlk hatırlatma hiç gitmediyse onu da işaretle — 24h penceresi tekrar tetiklenmesin
    await supabase
      .from("appointments")
      .update(
        appt.reminder_sent_at
          ? { reminder2_sent_at: now.toISOString() }
          : { reminder2_sent_at: now.toISOString(), reminder_sent_at: now.toISOString() }
      )
      .eq("id", appt.id);
    sent2++;
  }

  for (const appt of (upcoming || []) as ApptWithRelations[]) {
    const org = appt.organizations;
    const apptAt = new Date(appt.appointment_at);
    const apptDate = formatApptDate(apptAt);
    const apptTime = formatApptTime(apptAt);
    const hoursAway = Math.max(1, differenceInHours(apptAt, now));

    if (org.wa_token && org.wa_phone_number_id) {
      const message = `Merhaba ${appt.customer_name}! 👋\n\n📅 ${apptDate} saat ${apptTime} için ${org.name}'de randevunuz var.\n\n💇 Hizmet: ${appt.service?.name ?? ""}\n👤 Personel: ${appt.staff?.full_name ?? ""}\n\nGelemeseniz lütfen önceden iptal edin: ${appUrl}/r/iptal/${appt.cancel_token}\n\nİyi günler! ✨`;
      try {
        await sendWhatsApp(appt.customer_phone, message, org.wa_token, org.wa_phone_number_id);
      } catch {}
    }

    const customerEmail = appt.customer_id ? emailByCustomer.get(appt.customer_id) : undefined;
    if (customerEmail) {
      try {
        await sendReminderEmail({
          to: customerEmail,
          customerName: appt.customer_name,
          orgName: org.name,
          serviceName: appt.service?.name ?? "",
          staffName: appt.staff?.full_name ?? "",
          appointmentAt: apptAt,
          cancelToken: appt.cancel_token,
        }, hoursAway);
      } catch {}
    }

    await supabase.from("appointments").update({ reminder_sent_at: now.toISOString() }).eq("id", appt.id);
    sent24++;
  }

  return NextResponse.json({ sent_24h: sent24, sent_2h: sent2 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
