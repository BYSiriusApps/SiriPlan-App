/**
 * SiriPlan'ın WhatsApp "hatları" ve sağlayıcıları. Müşteri/personel bildirimleri ve
 * kampanyalar HER ZAMAN SiriPlan'ın kendi numaralarından gider (işletmenin kendi Meta
 * hesabından değil — tek istisna: kampanya numarası tanımsızken eski serbest-metin akışı).
 *
 * İki hat, ikisi de ayrı ayrı iki sağlayıcıdan biriyle çalışabilir:
 *   - "utility"   : randevu onay/hatırlatma/iptal/revizyon + personel bildirimleri
 *   - "marketing" : kampanya (ayrı numara; pazarlama şikayeti randevu numarasını etkilemesin)
 *
 * Sağlayıcı (varsayılan "meta" = bugünkü Meta Cloud API, hiçbir ayar gerekmez):
 *   WHATSAPP_UTILITY_PROVIDER = meta | 360dialog
 *   WHATSAPP_CAMPAIGN_PROVIDER = meta | 360dialog
 *
 * Meta (varsayılan):
 *   utility  : WHATSAPP_TOKEN (veya WHATSAPP_META_TOKEN) + WHATSAPP_PHONE_ID (veya WHATSAPP_PHONE_NUMBER_ID)
 *   marketing: WHATSAPP_CAMPAIGN_TOKEN + WHATSAPP_CAMPAIGN_PHONE_ID
 * 360dialog (Cloud API ile aynı gövde; numara API anahtarına bağlıdır, phone id gerekmez):
 *   utility  : WHATSAPP_360_API_KEY
 *   marketing: WHATSAPP_CAMPAIGN_360_API_KEY
 *   (isteğe bağlı) WHATSAPP_360_BASE_URL — varsayılan https://waba-v2.360dialog.io
 *
 * Seçilen sağlayıcının kimlik bilgisi eksikse hat "tanımsız" (null) sayılır; çağıran
 * mevcut "whatsapp_not_configured" davranışına düşer. Sağlayıcıyı geri almak = env'i
 * silmek/`meta` yapmak; kod değişikliği gerekmez.
 */

export type WaLineName = "utility" | "marketing";
export type WaProvider = "meta" | "360dialog";

export interface WaLine {
  line: WaLineName;
  provider: WaProvider;
  /** Mesaj gönderim uç noktası. */
  url: string;
  headers: Record<string, string>;
  /** Meta için gönderen numara kimliği (RET onay mesajı vb. için); 360dialog'da null. */
  phoneId: string | null;
}

const META_API = "https://graph.facebook.com/v19.0";

function providerOf(line: WaLineName): WaProvider {
  const raw = (line === "utility" ? process.env.WHATSAPP_UTILITY_PROVIDER : process.env.WHATSAPP_CAMPAIGN_PROVIDER) ?? "";
  return raw.trim().toLowerCase() === "360dialog" ? "360dialog" : "meta";
}

function d360Base(): string {
  return (process.env.WHATSAPP_360_BASE_URL || "https://waba-v2.360dialog.io").replace(/\/+$/, "");
}

export function getWaLine(line: WaLineName): WaLine | null {
  const provider = providerOf(line);

  if (provider === "360dialog") {
    const key = line === "utility" ? process.env.WHATSAPP_360_API_KEY : process.env.WHATSAPP_CAMPAIGN_360_API_KEY;
    if (!key) return null;
    return {
      line,
      provider,
      url: `${d360Base()}/messages`,
      headers: { "D360-API-KEY": key, "Content-Type": "application/json" },
      phoneId: null,
    };
  }

  const token =
    line === "utility"
      ? process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_META_TOKEN
      : process.env.WHATSAPP_CAMPAIGN_TOKEN;
  const phoneId =
    line === "utility"
      ? process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID
      : process.env.WHATSAPP_CAMPAIGN_PHONE_ID;
  if (!token || !phoneId) return null;
  return {
    line,
    provider,
    url: `${META_API}/${phoneId}/messages`,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    phoneId,
  };
}

/** Hattan bir mesaj gönderir (Cloud API gövdesi iki sağlayıcıda da aynıdır). */
export function postWaMessage(line: WaLine, body: unknown): Promise<Response> {
  return fetch(line.url, { method: "POST", headers: line.headers, body: JSON.stringify(body) });
}
