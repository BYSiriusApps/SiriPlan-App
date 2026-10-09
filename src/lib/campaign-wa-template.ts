import type { CampaignOffer } from "@/lib/campaign-offer";

/**
 * Kampanyaların Meta onaylı MARKETING şablonlarıyla, SiriPlan'ın AYRI kampanya
 * numarasından gönderimi. Serbest metin yalnızca müşteri son 24 saatte yazdıysa
 * iletilir; soğuk müşteriye pazarlama için onaylı şablon şarttır.
 *
 * Yalnızca WHATSAPP_CAMPAIGN_TOKEN + WHATSAPP_CAMPAIGN_PHONE_ID tanımlıysa
 * devreye girer. Tanımlı değilse campaign-send.ts eski (salonun kendi hesabı)
 * akışını aynen sürdürür. Randevu bildirim numarası (WHATSAPP_PHONE_ID) ile
 * ASLA karıştırılmaz: pazarlama şikayeti randevu mesajlarının kalitesini
 * düşürmesin diye numaralar ayrı tutulur.
 */

export type CampaignLang = "tr" | "en" | "ru" | "ar";
export type CampaignTemplateKind = "announcement" | "discount";

export interface CampaignWaConfig {
  token: string;
  phoneId: string;
}

export function getCampaignWaConfig(): CampaignWaConfig | null {
  const token = process.env.WHATSAPP_CAMPAIGN_TOKEN;
  const phoneId = process.env.WHATSAPP_CAMPAIGN_PHONE_ID;
  return token && phoneId ? { token, phoneId } : null;
}

export function campaignLang(preferred: string | null | undefined): CampaignLang {
  return preferred === "en" || preferred === "ru" || preferred === "ar" ? preferred : "tr";
}

// Meta'da onaylı adlar (scripts/_tmp/submit_campaign_templates.mjs).
const TEMPLATE_NAMES: Record<CampaignTemplateKind, Record<CampaignLang, string>> = {
  announcement: {
    tr: "kampanya_duyuru_1",
    en: "campaign_announcement_1",
    ru: "campaign_announcement_ru_1",
    ar: "campaign_announcement_ar_1",
  },
  discount: {
    tr: "kampanya_indirim_1",
    en: "campaign_discount_1",
    ru: "campaign_discount_ru_1",
    ar: "campaign_discount_ar_1",
  },
};

/** Meta gövde parametresi kuralları: tek satır, 4+ ardışık boşluk yok, boş olamaz. */
function cleanParam(value: string, maxLen: number): string {
  const flat = (value ?? "").replace(/\s+/g, " ").trim();
  if (!flat) return "-";
  return flat.length > maxLen ? flat.slice(0, maxLen - 1).trimEnd() + "…" : flat;
}

function numberLocale(lang: CampaignLang): string {
  return lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-US";
}

function fmtNumber(n: number, lang: CampaignLang): string {
  return n.toLocaleString(numberLocale(lang), { maximumFractionDigits: 2 });
}

/** {{3}} — şablonun "indirim özeti" alanı. */
export function discountSummary(offer: CampaignOffer, serviceNames: string[], lang: CampaignLang): string {
  const v = fmtNumber(offer.discount_value, lang);
  const pct = offer.discount_type === "percent";
  const head =
    lang === "en" ? (pct ? `${v}% off` : `${v} ₺ off`)
    : lang === "ru" ? (pct ? `скидка ${v}%` : `скидка ${v} ₺`)
    : lang === "ar" ? (pct ? `خصم ${v}%` : `خصم ${v} ₺`)
    : pct ? `%${v} indirim` : `${v} ₺ indirim`;

  const extras: string[] = [];
  if (serviceNames.length > 0) extras.push(serviceNames.join(", "));
  if (offer.min_amount) {
    const m = fmtNumber(offer.min_amount, lang);
    extras.push(
      lang === "en" ? `min. ${m} ₺`
      : lang === "ru" ? `от ${m} ₺`
      : lang === "ar" ? `الحد الأدنى ${m} ₺`
      : `en az ${m} ₺ işlemlerde`
    );
  }
  return extras.length > 0 ? `${head} (${extras.join("; ")})` : head;
}

/** {{4}} — şablonun "geçerlilik" alanı. valid_until: YYYY-MM-DD. */
export function discountValidity(validUntil: string, lang: CampaignLang): string {
  const [y, m, d] = validUntil.slice(0, 10).split("-");
  const date = `${d}.${m}.${y}`;
  return lang === "en" ? `until ${date}`
    : lang === "ru" ? `до ${date}`
    : lang === "ar" ? `حتى ${date}`
    : `${date} tarihine kadar`;
}

export type CampaignTemplateInput =
  | { kind: "announcement"; customerName: string; orgName: string; message: string }
  | { kind: "discount"; customerName: string; orgName: string; offer: CampaignOffer; serviceNames: string[] };

export type CampaignTemplateResult = { ok: true } | { ok: false; error: string };

async function postTemplate(
  cfg: CampaignWaConfig,
  to: string,
  name: string,
  lang: CampaignLang,
  params: string[]
): Promise<CampaignTemplateResult> {
  // Arapça (sağdan sola) metinde Latin/rakam içeren değerler çevre cümleyle
  // karışmasın diye her değer "first strong isolate" içine alınır (send.ts ile aynı).
  const parameters = params.map((p) => ({
    type: "text",
    text: lang === "ar" ? "⁨" + p + "⁩" : p,
  }));
  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/v19.0/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name, language: { code: lang }, components: [{ type: "body", parameters }] },
      }),
    });
  } catch {
    return { ok: false, error: "WhatsApp API'sine ulaşılamadı" };
  }
  if (res.ok) return { ok: true };
  const detail = await res.text().catch(() => "");
  console.error(`[campaign-wa] Meta API hatası — template=${name} status=${res.status} detail=${detail}`);
  return { ok: false, error: detail || "WhatsApp API hatası" };
}

/**
 * Tercih edilen dilde dener; olmazsa (şablon/dil sorunu) Türkçe'ye düşer —
 * müşteri mesajsız kalmasın (wa-templates/send.ts ile aynı yaklaşım).
 */
export async function sendCampaignTemplate(
  cfg: CampaignWaConfig,
  to: string,
  lang: CampaignLang,
  input: CampaignTemplateInput
): Promise<CampaignTemplateResult> {
  const build = (l: CampaignLang): string[] => {
    const name = cleanParam(input.customerName, 60);
    const org = cleanParam(input.orgName, 60);
    return input.kind === "announcement"
      ? [name, org, cleanParam(input.message, 600)]
      : [
          name,
          org,
          cleanParam(discountSummary(input.offer, input.serviceNames, l), 300),
          cleanParam(discountValidity(input.offer.valid_until, l), 60),
        ];
  };

  const first = await postTemplate(cfg, to, TEMPLATE_NAMES[input.kind][lang], lang, build(lang));
  if (first.ok || lang === "tr") return first;
  return postTemplate(cfg, to, TEMPLATE_NAMES[input.kind].tr, "tr", build("tr"));
}
