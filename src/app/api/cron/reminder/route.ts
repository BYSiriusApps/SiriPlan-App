import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email/send";
import { googleMapsLink } from "@/lib/wa-template";
import { addHours, differenceInHours } from "date-fns";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

// NOT: WhatsApp hatırlatmaları artık burada değil, Supabase pg_cron
// (her 5 dakikada bir, migration 016) + /api/whatsapp/send-template
// üzerinden, tek platform numarasıyla ve dakika hassasiyetinde
// gönderiliyor. Bu route sadece e-posta (Resend) hatırlatmasından
// sorumlu — Vercel Hobby'nin günlük cron limiti e-posta için yeterli.

type ApptWithRelations = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  appointment_at: string;
  cancel_token?: string;
  reminder_sent_at?: string | null;
  organizations: { name: string; email?: string; address?: string; location_url?: string };
  staff?: { full_name: string };
  service?: { name: string };
};

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();

  // Yaklaşan (0-2.5 saat): son hatırlatma. İlk hatırlatma şartı ARANMAZ —
  // son anda alınan randevular da en az bir hatırlatma alabilsin.
  const { data: imminent } = await supabase
    .from("appointments")
    .select("*, organizations(name, email, address, location_url), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
    .gte("appointment_at", now.toISOString())
    .lte("appointment_at", addHours(now, 2.5).toISOString())
    .eq("status", "onaylandi")
    .is("reminder2_sent_at", null)
    .limit(500);

  // 2.5-25 saat arası: ilk hatırlatma (yaklaşan pencere hariç, çift mesaj olmasın)
  const { data: upcoming } = await supabase
    .from("appointments")
    .select("*, organizations(name, email, address, location_url), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
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
    const hoursAway = Math.max(1, differenceInHours(apptAt, now));

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
          orgAddress: org.address ?? "",
          locationUrl: org.location_url?.trim() || (org.address?.trim() ? googleMapsLink(org.address.trim()) : ""),
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
    const hoursAway = Math.max(1, differenceInHours(apptAt, now));

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
          orgAddress: org.address ?? "",
          locationUrl: org.location_url?.trim() || (org.address?.trim() ? googleMapsLink(org.address.trim()) : ""),
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
