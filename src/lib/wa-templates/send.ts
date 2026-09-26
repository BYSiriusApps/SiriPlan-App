import { createAdminClient } from "@/lib/supabase/server";
import {
  resolveTemplate,
  type WaPurpose,
  type WaParamSource,
  type WaStyle,
} from "@/lib/wa-templates/registry";
import { googleMapsLink } from "@/lib/wa-template";
import { normalizePhone as toStoredPhoneFormat } from "@/lib/phone";

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
    .select("name, slug, locale, timezone, wa_template_styles, phone, whatsapp_number, address, location_url, settings_json")
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

  // Müşterinin panel/rehber üzerinde kayıtlı dil tercihi ('tr', 'en', 'ru', 'ar')
  // Dil tercihi yoksa: Türkiye işletmeleri için 'tr', yurtdışı işletmeler için 'en' esas alınır.
  const { data: customerRow } = await supabase
    .from("customers")
    .select("preferred_language")
    .eq("org_id", orgId)
    .eq("phone", toStoredPhoneFormat(toPhone))
    .maybeSingle();

  const customerLang = customerRow?.preferred_language;

  const isTurkeyOrg =
    org.locale === "tr" ||
    (org.phone && org.phone.replace(/\D/g, "").startsWith("90")) ||
    (org.whatsapp_number && org.whatsapp_number.replace(/\D/g, "").startsWith("90")) ||
    org.timezone === "Europe/Istanbul";

  const targetLang: "tr" | "en" | "ru" | "ar" =
    customerLang && ["tr", "en", "ru", "ar"].includes(customerLang)
      ? (customerLang as "tr" | "en" | "ru" | "ar")
      : isTurkeyOrg
      ? "tr"
      : "en";

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

  // WhatsApp mesaj gövdesi markdown/HTML link desteklemiyor — "Konum Bilgisi"
  // gibi özel bir tıklama yazısı gösteremiyoruz, metinde görünen tam olarak
  // linkin kendisi oluyor (bkz. registry.ts'teki hasUrlButton notları: buton
  // bileşeni denemeleri Meta'yı reddettiriyordu). Bari kısa görünsün diye
  // Google Maps'in uzun/çirkin arama linki yerine kendi kısa yönlendirmemiz
  // kullanılıyor (/k/[slug] → organizations.location_url ya da adresten
  // üretilen Maps linkine 302 ile yönlendirir, bkz. src/app/k/[slug]/route.ts).
  const hasLocationDestination = !!(org.location_url?.trim() || org.address?.trim());
  const locationLink =
    vars.location_link?.trim() ||
    (hasLocationDestination && org.slug ? `${appUrl}/k/${org.slug}` : "") ||
    org.location_url?.trim() ||
    (org.address?.trim() ? googleMapsLink(org.address.trim()) : "") ||
    bookingUrl;

  // "randevu_hatirlatma_*" şablonu {{3}} = randevuya kalan süre bekliyor.
  // Çağıran (cron / manuel gönder) vermezse randevu saatinden hesapla.
  const remainingTime =
    vars.remaining_time?.trim() ||
    (appointmentAt ? remainingTimeLabelFromDate(appointmentAt, new Date(), targetLang) : "");

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
      `[wa-templates] boş parametre "-" ile dolduruldu — purpose=${purpose} template=${def.metaName} orgId=${orgId} params=${emptyParams.join(",")}`
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

  async function attempt(templateName: string, languageCode: string): Promise<SendPurposeTemplateResult> {
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
          language: { code: languageCode },
          components,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        `[wa-templates] Meta API hatası — purpose=${purpose} template=${templateName} lang=${languageCode} orgId=${orgId} status=${res.status} detail=${errText}`
      );
      return { error: "Meta API hatası", detail: errText };
    }

    return { sent: true, template: templateName };
  }

  // Hedef dile (RU, AR, EN, TR) göre Meta API gönderimi ve kademeli yedekleme (fallback)
  if (targetLang === "ru") {
    const ruName = def.metaNameRu || def.metaNameEn || def.metaName;
    const ruResult = await attempt(ruName, "ru");
    if ("sent" in ruResult) return ruResult;

    if (def.metaNameEn) {
      const enResult = await attempt(def.metaNameEn, "en");
      if ("sent" in enResult) return enResult;
    }
  } else if (targetLang === "ar") {
    const arName = def.metaNameAr || def.metaNameEn || def.metaName;
    const arResult = await attempt(arName, "ar");
    if ("sent" in arResult) return arResult;

    if (def.metaNameEn) {
      const enResult = await attempt(def.metaNameEn, "en");
      if ("sent" in enResult) return enResult;
    }
  } else if (targetLang === "en") {
    if (def.metaNameEn) {
      const enResult = await attempt(def.metaNameEn, "en");
      if ("sent" in enResult) return enResult;
    }
  }

  return attempt(def.metaName, "tr");
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

export function remainingTimeLabel(hoursBefore: number, locale: string = "tr"): string {
  if (locale === "en") {
    if (hoursBefore >= 24 && hoursBefore % 24 === 0) {
      const days = hoursBefore / 24;
      return `${days} ${days === 1 ? "day" : "days"}`;
    }
    return `${hoursBefore} ${hoursBefore === 1 ? "hour" : "hours"}`;
  }
  if (locale === "ru") {
    if (hoursBefore >= 24 && hoursBefore % 24 === 0) {
      const days = hoursBefore / 24;
      return `${days} дн.`;
    }
    return `${hoursBefore} ч.`;
  }
  if (locale === "ar") {
    if (hoursBefore >= 24 && hoursBefore % 24 === 0) {
      const days = hoursBefore / 24;
      return `${days} يوم`;
    }
    return `${hoursBefore} ساعة`;
  }
  if (hoursBefore >= 24 && hoursBefore % 24 === 0) {
    const days = hoursBefore / 24;
    return `${days} gün`;
  }
  return `${hoursBefore} saat`;
}

/** Randevu zaman damgasından "2 saat" / "1 gün" gibi kalan-süre etiketi üretir.
 * Cron zaten offset_hours'tan hesaplayıp `remaining_time` geçiyor; bu yol
 * manuel "hatırlatmayı şimdi gönder" ve offset gelmeyen durumlar için. */
export function remainingTimeLabelFromDate(appointmentAt: string, now: Date = new Date(), locale: string = "tr"): string {
  const diffMs = new Date(appointmentAt).getTime() - now.getTime();
  const hours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
  return remainingTimeLabel(hours, locale);
}
