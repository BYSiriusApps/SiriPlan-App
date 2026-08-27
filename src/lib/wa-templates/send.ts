import { createAdminClient } from "@/lib/supabase/server";
import {
  resolveTemplate,
  type WaPurpose,
  type WaParamSource,
  type WaStyle,
} from "@/lib/wa-templates/registry";
import { googleMapsLink } from "@/lib/wa-template";

/**
 * Meta onaylı WhatsApp şablon mesajı gönderiminin tek gerçek uygulaması.
 * Hem /api/whatsapp/send-template route'u (pg_cron'un net.http_post ile
 * çağırdığı HTTP uç noktası) hem de Next.js tarafındaki senkron
 * tetikleyiciler (iptal/revize/manuel gönder) bu fonksiyonu kullanır —
 * mantık iki yerde tekrar edilmesin diye.
 */

export interface SendPurposeTemplateParams {
  toPhone: string;
  orgId: string;
  purpose: WaPurpose;
  vars: Partial<Record<WaParamSource, string>>;
  /** Randevunun ISO zaman damgası — "onay"/"hatirlatma" için geçmiş kontrolüne kullanılır. */
  appointmentAt?: string;
  cancelToken?: string;
}

// Saati geçmiş randevu için "onaylandı" ya da "yaklaşıyor" mesajı göndermek
// kafa karıştırıcı (müşteri saati geçmiş bir randevu için bildirim alır).
// Az miktarda tolerans, tam o an oluşturulan yüz yüze randevularda saniyelik
// gecikme yüzünden mesajın yanlışlıkla atlanmasını önler.
const PAST_APPOINTMENT_GRACE_MS = 5 * 60 * 1000;

export type SendPurposeTemplateResult =
  | { sent: true; template: string }
  | { skipped: true; reason: string }
  | { error: string; detail?: string };

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return "90" + digits.slice(1);
  if (digits.length === 10) return "90" + digits;
  return digits;
}

export async function sendPurposeTemplate({
  toPhone,
  orgId,
  purpose,
  vars,
  appointmentAt,
  cancelToken,
}: SendPurposeTemplateParams): Promise<SendPurposeTemplateResult> {
  if (
    (purpose === "onay" || purpose === "hatirlatma") &&
    appointmentAt &&
    new Date(appointmentAt).getTime() < Date.now() - PAST_APPOINTMENT_GRACE_MS
  ) {
    return { skipped: true, reason: "appointment_in_past" };
  }

  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error(`[wa-templates] whatsapp_not_configured — purpose=${purpose} orgId=${orgId}`);
    return { skipped: true, reason: "whatsapp_not_configured" };
  }

  const supabase = await createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug, wa_template_styles, phone, whatsapp_number, address, location_url, settings_json")
    .eq("id", orgId)
    .single();

  if (!org) {
    console.error(`[wa-templates] org_not_found — purpose=${purpose} orgId=${orgId}`);
    return { skipped: true, reason: "org_not_found" };
  }

  const notifySettingKey: Partial<Record<WaPurpose, string>> = {
    onay: "wa_notify_onay",
    revize: "wa_notify_revize",
    iptal: "wa_notify_iptal",
  };
  const settingsJson = (org.settings_json ?? {}) as Record<string, unknown>;
  const key = notifySettingKey[purpose];
  // Varsayılan: işaretli (gönderilir) — yalnızca kullanıcı açıkça kapatmışsa (false) atlanır.
  if (key && settingsJson[key] === false) {
    return { skipped: true, reason: "purpose_disabled" };
  }

  const styles = (org.wa_template_styles ?? {}) as Record<string, string>;
  const style = (styles[purpose] ?? "sicak") as WaStyle;
  const def = resolveTemplate(purpose, style);
  if (!def) {
    console.error(`[wa-templates] template_not_found — purpose=${purpose} style=${style} orgId=${orgId}`);
    return { skipped: true, reason: "template_not_found" };
  }

  const templateName = def.metaName;

  // Salonun kendi randevu vitrini — konum/telefon boşsa bile daima geçerli bir
  // bağlantı. Meta, gövde parametrelerinden herhangi biri BOŞ olursa şablon
  // mesajını (#131009) ile reddediyor → o param'ı olan tüm şablonlar (onay 6,
  // hatirlatma 7) hiç gitmiyordu. Buradaki fallback'ler param'ların asla boş
  // kalmamasını garanti eder.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  const bookingUrl = org.slug ? `${appUrl}/r/${org.slug}` : appUrl;

  const businessPhone =
    vars.business_phone?.trim() ||
    org.phone?.trim() ||
    org.whatsapp_number?.trim() ||
    process.env.PLATFORM_SUPPORT_PHONE ||
    bookingUrl;

  const locationLink =
    vars.location_link?.trim() ||
    org.location_url?.trim() ||
    (org.address?.trim() ? googleMapsLink(org.address.trim()) : "") ||
    bookingUrl;

  // "randevu_hatirlatma_*" şablonu {{3}} = randevuya kalan süre bekliyor.
  // Çağıran (cron / manuel gönder) vermezse randevu saatinden hesapla.
  const remainingTime =
    vars.remaining_time?.trim() ||
    (appointmentAt ? remainingTimeLabelFromDate(appointmentAt) : "");

  const paramValues: Record<WaParamSource, string> = {
    ...vars,
    business_name: org.name,
    business_phone: businessPhone,
    location_link: locationLink,
    remaining_time: remainingTime,
  } as Record<WaParamSource, string>;

  // Meta gövde parametresi kuralları: boş olamaz, satır sonu / sekme / 4+ ardışık
  // boşluk içeremez (aksi halde (#131009) / (#132000)). Değerleri tek satıra
  // indir, boş kalanı "-" ile doldur ve hangi param'ın boş geldiğini logla.
  const emptyParams: WaParamSource[] = [];
  const bodyParameters = def.bodyParamOrder.map((source) => {
    const cleaned = (paramValues[source] ?? "").replace(/\s+/g, " ").trim();
    if (!cleaned) emptyParams.push(source);
    return { type: "text", text: cleaned || "-" };
  });
  if (emptyParams.length) {
    console.error(
      `[wa-templates] boş parametre "-" ile dolduruldu — purpose=${purpose} template=${templateName} orgId=${orgId} params=${emptyParams.join(",")}`
    );
  }

  let finalCancelToken = cancelToken;
  if (!finalCancelToken && def.hasUrlButton) {
    const statusFilter = purpose === "iptal" ? "iptal" : "onaylandi";
    let query = supabase
      .from("appointments")
      .select("cancel_token")
      .eq("org_id", orgId)
      .eq("customer_phone", normalizePhone(toPhone))
      .eq("status", statusFilter);

    if (appointmentAt) {
      query = query.eq("appointment_at", appointmentAt);
    } else {
      query = query.gte("appointment_at", new Date().toISOString()).order("appointment_at", { ascending: true });
    }

    const { data: apptRow } = await query.limit(1).maybeSingle();
    if (apptRow) {
      finalCancelToken = apptRow.cancel_token;
    }
  }

  const components: Record<string, unknown>[] = [{ type: "body", parameters: bodyParameters }];

  if (def.hasUrlButton && finalCancelToken) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text: finalCancelToken,
        },
      ],
    });
  }

  const to = normalizePhone(toPhone);

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "tr" },
        components,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(
      `[wa-templates] Meta API hatası — purpose=${purpose} template=${templateName} orgId=${orgId} status=${res.status} detail=${errText}`
    );
    return { error: "Meta API hatası", detail: errText };
  }

  return { sent: true, template: templateName };
}

/** Randevu tarihinden {{date}}/{{time}} param çiftini üretir. timeZone verilmezse
 * geriye dönük uyumluluk için Europe/Istanbul kullanılır. */
export function formatApptDateTime(appointmentAt: string, timeZone: string = "Europe/Istanbul"): { date: string; time: string } {
  const d = new Date(appointmentAt);
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("day")}.${get("month")}.${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function remainingTimeLabel(hoursBefore: number): string {
  if (hoursBefore >= 24 && hoursBefore % 24 === 0) {
    const days = hoursBefore / 24;
    return `${days} gün`;
  }
  return `${hoursBefore} saat`;
}

/** Randevu zaman damgasından "2 saat" / "1 gün" gibi kalan-süre etiketi üretir.
 * Cron zaten offset_hours'tan hesaplayıp `remaining_time` geçiyor; bu yol
 * manuel "hatırlatmayı şimdi gönder" ve offset gelmeyen durumlar için. */
export function remainingTimeLabelFromDate(appointmentAt: string, now: Date = new Date()): string {
  const diffMs = new Date(appointmentAt).getTime() - now.getTime();
  const hours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
  return remainingTimeLabel(hours);
}
