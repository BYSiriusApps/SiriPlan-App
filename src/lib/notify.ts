import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsAppMessage } from "@/lib/whatsapp-notify";
import { googleMapsLink } from "@/lib/wa-template";

interface AppointmentForNotify {
  id: string;
  org_id: string;
  customer_name: string;
  customer_phone: string;
  appointment_at: string;
  service_id?: string | null;
  staff_id?: string | null;
  assigned_staff_id?: string | null;
  price?: number | null;
  note?: string | null;
  source?: string | null;
  is_auto?: boolean;
}

interface Recipient {
  telegram_chat_id?: string | null;
  whatsapp_number?: string | null;
  label: string;
}

/** Randevunun nereden geldiğini kısa, okunur bir etikete çevirir. */
function sourceLabel(source?: string | null): string {
  switch (source) {
    case "web":
    case "website":
      return "🌐 Online Randevu Linki";
    case "whatsapp":
      return "💬 WhatsApp";
    case "instagram":
      return "📷 Instagram";
    case "tiktok":
      return "🎵 TikTok";
    case "telefon":
      return "☎️ Telefon";
    case "yuzyuze":
      return "🏠 Yüz Yüze (Panel)";
    default:
      return "✍️ Manuel (Personel)";
  }
}

function buildMessage(
  appt: AppointmentForNotify,
  serviceName: string,
  staffName: string,
  isRequest = false,
  locationLink?: string | null
): string {
  const date = new Date(appt.appointment_at).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
  const source = sourceLabel(appt.source);
  const locationLine = locationLink ? `📍 ${locationLink}\n` : "";

  if (isRequest) {
    return (
      `📋 <b>Yeni Randevu Talebi</b> — ${source}\n\n` +
      `👤 ${appt.customer_name} (${appt.customer_phone})\n` +
      `💇 ${serviceName}\n` +
      `👩‍💼 ${staffName}\n` +
      `🕐 ${date}\n` +
      (appt.price ? `💰 ₺${Number(appt.price).toLocaleString("tr-TR")}\n` : "") +
      locationLine +
      (appt.note ? `📝 ${appt.note}\n` : "") +
      `\nOnaylamak için panele girin.`
    );
  }

  return (
    `✅ <b>Randevu Onaylandı</b> — ${source}\n\n` +
    `👤 ${appt.customer_name} (${appt.customer_phone})\n` +
    `💇 ${serviceName}\n` +
    `👩‍💼 ${staffName}\n` +
    `🕐 ${date}\n` +
    (appt.price ? `💰 ₺${Number(appt.price).toLocaleString("tr-TR")}\n` : "") +
    locationLine +
    (appt.note ? `📝 ${appt.note}` : "")
  );
}

async function dispatch(recipient: Recipient, message: string): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (recipient.telegram_chat_id) {
    tasks.push(sendTelegramMessage(recipient.telegram_chat_id, message));
  }
  if (recipient.whatsapp_number) {
    // WhatsApp doesn't support HTML — strip tags for WA copy
    const plain = message.replace(/<[^>]+>/g, "");
    tasks.push(sendWhatsAppMessage(recipient.whatsapp_number, plain));
  }
  await Promise.allSettled(tasks);
}

/** Notify salon owner + assigned staff about a confirmed appointment */
export async function notifyAppointment(appt: AppointmentForNotify): Promise<void> {
  try {
    const supabase = await createClient();

    // Resolve service and staff names
    const staffTargetId = appt.assigned_staff_id ?? appt.staff_id;
    const [{ data: service }, { data: staffRow }, { data: orgRow }] = await Promise.all([
      appt.service_id
        ? supabase.from("services").select("name").eq("id", appt.service_id).single()
        : Promise.resolve({ data: null }),
      staffTargetId
        ? supabase.from("staff").select("full_name, telegram_chat_id, whatsapp_number").eq("id", staffTargetId).single()
        : Promise.resolve({ data: null }),
      supabase.from("organizations").select("telegram_chat_id, whatsapp_number, address, location_url").eq("id", appt.org_id).single(),
    ]);

    // Fetch owner's staff record (role=owner linked staff)
    const { data: ownerMember } = await supabase
      .from("org_members")
      .select("staff_id")
      .eq("org_id", appt.org_id)
      .eq("role", "owner")
      .single();

    let ownerStaff: { telegram_chat_id?: string | null; whatsapp_number?: string | null } | null = null;
    if (ownerMember?.staff_id) {
      const { data } = await supabase
        .from("staff")
        .select("telegram_chat_id, whatsapp_number")
        .eq("id", ownerMember.staff_id)
        .single();
      ownerStaff = data;
    }

    const serviceName = (service as { name: string } | null)?.name ?? "Hizmet";
    const staffName = (staffRow as { full_name: string } | null)?.full_name ?? "Personel";
    const orgForLocation = orgRow as { address?: string | null; location_url?: string | null } | null;
    const locationLink =
      orgForLocation?.location_url?.trim() ||
      (orgForLocation?.address?.trim() ? googleMapsLink(orgForLocation.address.trim()) : "");
    const message = buildMessage(appt, serviceName, staffName, false, locationLink);

    const recipients: Recipient[] = [];

    // Salon-level channels (owner)
    if (orgRow) {
      recipients.push({
        telegram_chat_id: (orgRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        whatsapp_number: (orgRow as { whatsapp_number?: string | null }).whatsapp_number,
        label: "salon",
      });
    }

    // Owner's personal staff record channels
    if (ownerStaff) {
      recipients.push({
        telegram_chat_id: ownerStaff.telegram_chat_id,
        whatsapp_number: ownerStaff.whatsapp_number,
        label: "owner-staff",
      });
    }

    // Assigned staff (only if different from owner)
    if (
      staffRow &&
      staffTargetId &&
      staffTargetId !== ownerMember?.staff_id
    ) {
      recipients.push({
        telegram_chat_id: (staffRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        whatsapp_number: (staffRow as { whatsapp_number?: string | null }).whatsapp_number,
        label: "assigned-staff",
      });
    }

    // Deduplicate by chat_id / number to avoid duplicate messages when same person listed twice
    const seenTg = new Set<string>();
    const seenWa = new Set<string>();
    const tasks: Promise<void>[] = [];

    for (const r of recipients) {
      const rCopy: Recipient = { label: r.label };
      if (r.telegram_chat_id && !seenTg.has(r.telegram_chat_id)) {
        rCopy.telegram_chat_id = r.telegram_chat_id;
        seenTg.add(r.telegram_chat_id);
      }
      if (r.whatsapp_number && !seenWa.has(r.whatsapp_number)) {
        rCopy.whatsapp_number = r.whatsapp_number;
        seenWa.add(r.whatsapp_number);
      }
      if (rCopy.telegram_chat_id || rCopy.whatsapp_number) {
        tasks.push(dispatch(rCopy, message));
      }
    }

    await Promise.allSettled(tasks);
  } catch {
    // Bildirim hatası randevu akışını engellememeli
  }
}

/** Notify salon owner about a new pending appointment request */
export async function notifyAppointmentRequest(
  req: AppointmentForNotify & { serviceName?: string; staffName?: string }
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: orgRow } = await supabase
      .from("organizations")
      .select("telegram_chat_id, whatsapp_number, address, location_url")
      .eq("id", req.org_id)
      .single();

    const serviceName = req.serviceName ?? "Hizmet";
    const staffName = req.staffName ?? "Personel";
    const orgForLocation = orgRow as { address?: string | null; location_url?: string | null } | null;
    const locationLink =
      orgForLocation?.location_url?.trim() ||
      (orgForLocation?.address?.trim() ? googleMapsLink(orgForLocation.address.trim()) : "");
    const message = buildMessage(req, serviceName, staffName, true, locationLink);

    if (orgRow) {
      await dispatch(
        {
          telegram_chat_id: (orgRow as { telegram_chat_id?: string | null }).telegram_chat_id,
          whatsapp_number: (orgRow as { whatsapp_number?: string | null }).whatsapp_number,
          label: "salon",
        },
        message
      );
    }
  } catch {
    // Bildirim hatası akışı engellememeli
  }
}
