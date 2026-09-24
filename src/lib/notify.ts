// Bildirim gönderimi service_role ile yapılır. NEDEN: bu modülün ana çağıranı
// herkese açık online randevu akışıdır (/api/appointments → anonim ziyaretçi).
// Kullanıcı kapsamlı istemci o akışta "anon" rolüyle çalışır ve anon rolünün
// organizations/staff/org_members tablolarına erişimi kaldırıldı (bkz.
// 20260817_public_data_lockdown.sql) — bu yüzden org satırı null dönüyor ve
// salon sahibine giden Telegram/WhatsApp bildirimi sessizce hiç gönderilmiyordu.
// Buradaki org_id her zaman sunucu tarafında doğrulanmış bir akıştan gelir.
import { createAdminClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsAppMessage } from "@/lib/whatsapp-notify";
import { sendInternalTemplate } from "@/lib/wa-templates/internal-send";
import type { WaInternalPurpose } from "@/lib/wa-templates/internal-registry";
import { formatApptDateTime } from "@/lib/wa-templates/send";
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
  /** false ise kişi Telegram numarasını doldurmuş ama kanalı Ayarlar'dan kapatmış demektir. */
  telegram_enabled?: boolean;
  whatsapp_number?: string | null;
  whatsapp_enabled?: boolean;
  /** Personelin panel dil tercihi ("en" ise WA şablonu önce İngilizce denenir, bkz. internal-send.ts). */
  locale?: string | null;
  label: string;
}

/** Personel/sahip kaydındaki notify_channels_json'dan kanal tercihini okur — anahtar yoksa varsayılan AÇIK. */
function staffChannels(row: { notify_channels_json?: Record<string, unknown> | null } | null | undefined): {
  telegram: boolean;
  whatsapp: boolean;
} {
  const c = (row?.notify_channels_json ?? {}) as Record<string, unknown>;
  return { telegram: c.telegram !== false, whatsapp: c.whatsapp !== false };
}

/** Salon (org) düzeyindeki kanal tercihini settings_json'dan okur — mevcut wa_notify_* desenindeki gibi "false değilse açık". */
function orgChannels(row: { settings_json?: Record<string, unknown> | null } | null | undefined): {
  telegram: boolean;
  whatsapp: boolean;
} {
  const c = (row?.settings_json ?? {}) as Record<string, unknown>;
  return { telegram: c.notify_channel_telegram !== false, whatsapp: c.notify_channel_whatsapp !== false };
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
  locationLink?: string | null,
  timeZone: string = "Europe/Istanbul"
): string {
  const date = new Date(appt.appointment_at).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone,
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

async function dispatchWhatsApp(
  whatsappNumber: string,
  plainMessage: string,
  template?: { purpose: WaInternalPurpose; params: Record<string, string> },
  locale: string = "tr"
): Promise<void> {
  // Meta onaylı şablon varsa ÖNCE o denenir — 24 saatlik "müşteri hizmetleri
  // penceresi" kısıtına takılmaz, bu yüzden asıl güvenilir yol budur.
  // Onaylı şablon yoksa (henüz Meta'da submit edilmediyse) ya da gönderim
  // reddedilirse serbest metne düşülür (yalnızca pencere içindeyse teslim olur).
  if (template) {
    const sent = await sendInternalTemplate(whatsappNumber, template.purpose, template.params, locale);
    if (sent) return;
  }
  await sendWhatsAppMessage(whatsappNumber, plainMessage);
}

async function dispatch(
  recipient: Recipient,
  message: string,
  template?: { purpose: WaInternalPurpose; params: Record<string, string> }
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (recipient.telegram_chat_id && recipient.telegram_enabled !== false) {
    tasks.push(sendTelegramMessage(recipient.telegram_chat_id, message));
  }
  if (recipient.whatsapp_number && recipient.whatsapp_enabled !== false) {
    // WhatsApp doesn't support HTML — strip tags for WA copy
    const plain = message.replace(/<[^>]+>/g, "");
    tasks.push(dispatchWhatsApp(recipient.whatsapp_number, plain, template, recipient.locale ?? "tr"));
  }
  await Promise.allSettled(tasks);
}

/** Notify salon owner + assigned staff about a confirmed appointment */
export async function notifyAppointment(appt: AppointmentForNotify): Promise<void> {
  try {
    const supabase = await createAdminClient();

    // Resolve service and staff names
    const staffTargetId = appt.assigned_staff_id ?? appt.staff_id;
    const [{ data: service }, { data: staffRow }, { data: orgRow }] = await Promise.all([
      appt.service_id
        ? supabase.from("services").select("name").eq("id", appt.service_id).single()
        : Promise.resolve({ data: null }),
      staffTargetId
        ? supabase.from("staff").select("full_name, telegram_chat_id, whatsapp_number, notify_channels_json, preferred_language").eq("id", staffTargetId).single()
        : Promise.resolve({ data: null }),
      supabase.from("organizations").select("name, telegram_chat_id, whatsapp_number, address, location_url, timezone, settings_json").eq("id", appt.org_id).single(),
    ]);

    // Fetch owner's staff record (role=owner linked staff)
    const { data: ownerMember } = await supabase
      .from("org_members")
      .select("staff_id")
      .eq("org_id", appt.org_id)
      .eq("role", "owner")
      .single();

    let ownerStaff: { telegram_chat_id?: string | null; whatsapp_number?: string | null; notify_channels_json?: Record<string, unknown> | null; preferred_language?: string | null } | null = null;
    if (ownerMember?.staff_id) {
      const { data } = await supabase
        .from("staff")
        .select("telegram_chat_id, whatsapp_number, notify_channels_json, preferred_language")
        .eq("id", ownerMember.staff_id)
        .single();
      ownerStaff = data;
    }

    const serviceName = (service as { name: string } | null)?.name ?? "Hizmet";
    const staffName = (staffRow as { full_name: string } | null)?.full_name ?? "Personel";
    const orgForLocation = orgRow as { address?: string | null; location_url?: string | null; timezone?: string | null } | null;
    const locationLink =
      orgForLocation?.location_url?.trim() ||
      (orgForLocation?.address?.trim() ? googleMapsLink(orgForLocation.address.trim()) : "");
    const message = buildMessage(appt, serviceName, staffName, false, locationLink, orgForLocation?.timezone || "Europe/Istanbul");
    const { date: waDate, time: waTime } = formatApptDateTime(appt.appointment_at, orgForLocation?.timezone || "Europe/Istanbul");
    const waTemplateParams = {
      business_name: (orgRow as { name?: string } | null)?.name ?? "",
      customer_name: appt.customer_name,
      service_name: serviceName,
      staff_name: staffName,
      date: waDate,
      time: waTime,
    };

    const recipients: Recipient[] = [];
    const orgCh = orgChannels(orgRow as { settings_json?: Record<string, unknown> | null } | null);

    // Salon-level channels (owner)
    if (orgRow) {
      recipients.push({
        telegram_chat_id: (orgRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: orgCh.telegram,
        whatsapp_number: (orgRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: orgCh.whatsapp,
        label: "salon",
      });
    }

    // Owner's personal staff record channels
    if (ownerStaff) {
      const ch = staffChannels(ownerStaff);
      recipients.push({
        telegram_chat_id: ownerStaff.telegram_chat_id,
        telegram_enabled: ch.telegram,
        whatsapp_number: ownerStaff.whatsapp_number,
        whatsapp_enabled: ch.whatsapp,
        locale: ownerStaff.preferred_language,
        label: "owner-staff",
      });
    }

    // Assigned staff (only if different from owner)
    if (
      staffRow &&
      staffTargetId &&
      staffTargetId !== ownerMember?.staff_id
    ) {
      const ch = staffChannels(staffRow as { notify_channels_json?: Record<string, unknown> | null });
      recipients.push({
        telegram_chat_id: (staffRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: ch.telegram,
        whatsapp_number: (staffRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: ch.whatsapp,
        locale: (staffRow as { preferred_language?: string | null }).preferred_language,
        label: "assigned-staff",
      });
    }

    // Deduplicate by chat_id / number to avoid duplicate messages when same person listed twice
    const seenTg = new Set<string>();
    const seenWa = new Set<string>();
    const tasks: Promise<void>[] = [];

    for (const r of recipients) {
      const rCopy: Recipient = { label: r.label, locale: r.locale };
      if (r.telegram_chat_id && !seenTg.has(r.telegram_chat_id)) {
        rCopy.telegram_chat_id = r.telegram_chat_id;
        rCopy.telegram_enabled = r.telegram_enabled;
        seenTg.add(r.telegram_chat_id);
      }
      if (r.whatsapp_number && !seenWa.has(r.whatsapp_number)) {
        rCopy.whatsapp_number = r.whatsapp_number;
        rCopy.whatsapp_enabled = r.whatsapp_enabled;
        seenWa.add(r.whatsapp_number);
      }
      if (rCopy.telegram_chat_id || rCopy.whatsapp_number) {
        tasks.push(dispatch(rCopy, message, { purpose: "yeni_randevu", params: waTemplateParams }));
      }
    }

    await Promise.allSettled(tasks);
  } catch {
    // Bildirim hatası randevu akışını engellememeli
  }
}

/**
 * Bir stok hareketi ürünü ilk kez kritik sınırın altına düşürdüğünde salon
 * sahibine anlık bildirim (Telegram + WhatsApp). Yalnızca eşik GEÇİŞİNDE
 * çağrılır (bkz. lib/inventory-tx.ts) — her harekette değil, spam olmaz.
 */
export async function notifyLowStock(
  orgId: string,
  item: { name: string; current_stock: number; min_stock_alert: number; unit: string }
): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("name, telegram_chat_id, whatsapp_number, settings_json")
      .eq("id", orgId)
      .single();
    if (!orgRow) return;

    const orgCh = orgChannels(orgRow as { settings_json?: Record<string, unknown> | null });
    const message =
      `⚠️ <b>Kritik Stok Uyarısı</b>\n\n` +
      `📦 ${item.name}\n` +
      `Kalan: ${item.current_stock} ${item.unit} (uyarı sınırı: ${item.min_stock_alert})\n\n` +
      `Stok girişi yapmayı unutmayın.`;

    await dispatch(
      {
        telegram_chat_id: (orgRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: orgCh.telegram,
        whatsapp_number: (orgRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: orgCh.whatsapp,
        label: "salon",
      },
      message,
      {
        purpose: "kritik_stok",
        params: {
          business_name: (orgRow as { name?: string }).name ?? "",
          item_name: item.name,
          current_stock: String(item.current_stock),
          unit: item.unit,
        },
      }
    );
  } catch {
    // Bildirim hatası stok akışını engellememeli
  }
}

interface ProposalResponseForNotify {
  org_id: string;
  customer_name: string;
  proposed_appointment_at: string;
  accepted: boolean;
  staff_id?: string | null;
  assigned_staff_id?: string | null;
}

/** Müşteri işletmenin önerdiği yeni saati kabul/red edince salon+personele bildirim */
export async function notifyProposalResponse(p: ProposalResponseForNotify): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const staffTargetId = p.assigned_staff_id ?? p.staff_id;

    const [{ data: orgRow }, { data: staffRow }] = await Promise.all([
      supabase
        .from("organizations")
        .select("telegram_chat_id, whatsapp_number, timezone, settings_json")
        .eq("id", p.org_id)
        .single(),
      staffTargetId
        ? supabase.from("staff").select("telegram_chat_id, whatsapp_number, notify_channels_json, preferred_language").eq("id", staffTargetId).single()
        : Promise.resolve({ data: null }),
    ]);

    const { data: ownerMember } = await supabase
      .from("org_members")
      .select("staff_id")
      .eq("org_id", p.org_id)
      .eq("role", "owner")
      .single();

    let ownerStaff: { telegram_chat_id?: string | null; whatsapp_number?: string | null; notify_channels_json?: Record<string, unknown> | null; preferred_language?: string | null } | null = null;
    if (ownerMember?.staff_id) {
      const { data } = await supabase
        .from("staff")
        .select("telegram_chat_id, whatsapp_number, notify_channels_json, preferred_language")
        .eq("id", ownerMember.staff_id)
        .single();
      ownerStaff = data;
    }

    const timeZone = (orgRow as { timezone?: string | null } | null)?.timezone || "Europe/Istanbul";
    const dateLabel = new Date(p.proposed_appointment_at).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });

    const message = p.accepted
      ? `✅ <b>Öneri Kabul Edildi</b>\n\n👤 ${p.customer_name}\n🕐 Yeni saat: ${dateLabel}\n\nRandevu otomatik onaylandı.`
      : `❌ <b>Öneri Reddedildi</b>\n\n👤 ${p.customer_name}\n🕐 Önerilen saat: ${dateLabel}\n\nTalep hâlâ bekliyor — farklı bir saat önerin ya da iptal edin.`;

    const recipients: Recipient[] = [];
    const orgCh = orgChannels(orgRow as { settings_json?: Record<string, unknown> | null } | null);
    if (orgRow) {
      recipients.push({
        telegram_chat_id: (orgRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: orgCh.telegram,
        whatsapp_number: (orgRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: orgCh.whatsapp,
        label: "salon",
      });
    }
    if (ownerStaff) {
      const ch = staffChannels(ownerStaff);
      recipients.push({
        telegram_chat_id: ownerStaff.telegram_chat_id,
        telegram_enabled: ch.telegram,
        whatsapp_number: ownerStaff.whatsapp_number,
        whatsapp_enabled: ch.whatsapp,
        locale: ownerStaff.preferred_language,
        label: "owner-staff",
      });
    }
    if (staffRow && staffTargetId && staffTargetId !== ownerMember?.staff_id) {
      const ch = staffChannels(staffRow as { notify_channels_json?: Record<string, unknown> | null });
      recipients.push({
        telegram_chat_id: (staffRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: ch.telegram,
        whatsapp_number: (staffRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: ch.whatsapp,
        locale: (staffRow as { preferred_language?: string | null }).preferred_language,
        label: "assigned-staff",
      });
    }

    const seenTg = new Set<string>();
    const seenWa = new Set<string>();
    const tasks: Promise<void>[] = [];
    for (const r of recipients) {
      const rCopy: Recipient = { label: r.label, locale: r.locale };
      if (r.telegram_chat_id && !seenTg.has(r.telegram_chat_id)) {
        rCopy.telegram_chat_id = r.telegram_chat_id;
        rCopy.telegram_enabled = r.telegram_enabled;
        seenTg.add(r.telegram_chat_id);
      }
      if (r.whatsapp_number && !seenWa.has(r.whatsapp_number)) {
        rCopy.whatsapp_number = r.whatsapp_number;
        rCopy.whatsapp_enabled = r.whatsapp_enabled;
        seenWa.add(r.whatsapp_number);
      }
      if (rCopy.telegram_chat_id || rCopy.whatsapp_number) {
        tasks.push(dispatch(rCopy, message));
      }
    }
    await Promise.allSettled(tasks);
  } catch {
    // Bildirim hatası akışı engellememeli
  }
}

/** Notify salon owner + assigned staff about a new pending appointment request */
export async function notifyAppointmentRequest(
  req: AppointmentForNotify & { serviceName?: string; staffName?: string }
): Promise<void> {
  try {
    const supabase = await createAdminClient();

    // Servis/personel adı verilmediyse ID'den çöz — /r/[slug] (web) akışı
    // bunları hazır göndermiyor; bildirim "Hizmet / Personel" gibi boş
    // kalmasın diye burada tamamlanır.
    const staffTargetId = req.assigned_staff_id ?? req.staff_id;
    const [{ data: orgRow }, { data: svcRow }, { data: stfRow }] = await Promise.all([
      supabase
        .from("organizations")
        .select("name, telegram_chat_id, whatsapp_number, address, location_url, timezone, settings_json")
        .eq("id", req.org_id)
        .single(),
      !req.serviceName && req.service_id
        ? supabase.from("services").select("name").eq("id", req.service_id).single()
        : Promise.resolve({ data: null }),
      staffTargetId
        ? supabase.from("staff").select("full_name, telegram_chat_id, whatsapp_number, notify_channels_json, preferred_language").eq("id", staffTargetId).single()
        : Promise.resolve({ data: null }),
    ]);

    // Sahibin kendi personel kaydı (aynı öteki bildirim fonksiyonlarındaki desen) —
    // atanan personel sahibin kendisiyse tekrar mesaj gitmesin diye ayrı tutuluyor.
    const { data: ownerMember } = await supabase
      .from("org_members")
      .select("staff_id")
      .eq("org_id", req.org_id)
      .eq("role", "owner")
      .single();

    let ownerStaff: { telegram_chat_id?: string | null; whatsapp_number?: string | null; notify_channels_json?: Record<string, unknown> | null; preferred_language?: string | null } | null = null;
    if (ownerMember?.staff_id) {
      const { data } = await supabase
        .from("staff")
        .select("telegram_chat_id, whatsapp_number, notify_channels_json, preferred_language")
        .eq("id", ownerMember.staff_id)
        .single();
      ownerStaff = data;
    }

    const serviceName = req.serviceName ?? (svcRow as { name?: string } | null)?.name ?? "Hizmet";
    const staffName = req.staffName ?? (stfRow as { full_name?: string } | null)?.full_name ?? "Personel";
    const orgForLocation = orgRow as { address?: string | null; location_url?: string | null; timezone?: string | null } | null;
    const locationLink =
      orgForLocation?.location_url?.trim() ||
      (orgForLocation?.address?.trim() ? googleMapsLink(orgForLocation.address.trim()) : "");
    const message = buildMessage(req, serviceName, staffName, true, locationLink, orgForLocation?.timezone || "Europe/Istanbul");
    const { date: waDate, time: waTime } = formatApptDateTime(req.appointment_at, orgForLocation?.timezone || "Europe/Istanbul");
    const waTemplateParams = {
      business_name: (orgRow as { name?: string } | null)?.name ?? "",
      customer_name: req.customer_name,
      service_name: serviceName,
      staff_name: staffName,
      date: waDate,
      time: waTime,
    };

    const recipients: Recipient[] = [];
    const orgCh = orgChannels(orgRow as { settings_json?: Record<string, unknown> | null } | null);

    if (orgRow) {
      recipients.push({
        telegram_chat_id: (orgRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: orgCh.telegram,
        whatsapp_number: (orgRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: orgCh.whatsapp,
        label: "salon",
      });
    }

    if (ownerStaff) {
      const ch = staffChannels(ownerStaff);
      recipients.push({
        telegram_chat_id: ownerStaff.telegram_chat_id,
        telegram_enabled: ch.telegram,
        whatsapp_number: ownerStaff.whatsapp_number,
        whatsapp_enabled: ch.whatsapp,
        locale: ownerStaff.preferred_language,
        label: "owner-staff",
      });
    }

    if (stfRow && staffTargetId && staffTargetId !== ownerMember?.staff_id) {
      const ch = staffChannels(stfRow as { notify_channels_json?: Record<string, unknown> | null });
      recipients.push({
        telegram_chat_id: (stfRow as { telegram_chat_id?: string | null }).telegram_chat_id,
        telegram_enabled: ch.telegram,
        whatsapp_number: (stfRow as { whatsapp_number?: string | null }).whatsapp_number,
        whatsapp_enabled: ch.whatsapp,
        locale: (stfRow as { preferred_language?: string | null }).preferred_language,
        label: "assigned-staff",
      });
    }

    const seenTg = new Set<string>();
    const seenWa = new Set<string>();
    const tasks: Promise<void>[] = [];
    for (const r of recipients) {
      const rCopy: Recipient = { label: r.label, locale: r.locale };
      if (r.telegram_chat_id && !seenTg.has(r.telegram_chat_id)) {
        rCopy.telegram_chat_id = r.telegram_chat_id;
        rCopy.telegram_enabled = r.telegram_enabled;
        seenTg.add(r.telegram_chat_id);
      }
      if (r.whatsapp_number && !seenWa.has(r.whatsapp_number)) {
        rCopy.whatsapp_number = r.whatsapp_number;
        rCopy.whatsapp_enabled = r.whatsapp_enabled;
        seenWa.add(r.whatsapp_number);
      }
      if (rCopy.telegram_chat_id || rCopy.whatsapp_number) {
        tasks.push(dispatch(rCopy, message, { purpose: "yeni_talep", params: waTemplateParams }));
      }
    }
    await Promise.allSettled(tasks);
  } catch {
    // Bildirim hatası akışı engellememeli
  }
}
