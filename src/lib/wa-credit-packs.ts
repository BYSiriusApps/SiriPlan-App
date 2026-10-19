/**
 * WhatsApp mesaj kredisi paketleri kataloğu (istemci + sunucu güvenli; sunucu bağımlılığı yok).
 * Tek seferlik Stripe ödemesi (SMS kontörüyle aynı model), web panelden satılır; mobil
 * uygulamada satın alma yüzeyi YOKTUR.
 *
 *   utility   : plan kotası dolunca devreye giren ek randevu bildirimi (onay/hatırlatma/iptal/revizyon)
 *   marketing : WhatsApp kampanya mesajı (plana dahil DEĞİL; yalnızca bu kredilerle gider)
 *
 * Stripe Price kimlikleri env'den okunur (yerel .env.local + Vercel):
 *   STRIPE_PRICE_WA_UTILITY_500, STRIPE_PRICE_WA_UTILITY_1000
 *   STRIPE_PRICE_WA_CAMPAIGN_500, STRIPE_PRICE_WA_CAMPAIGN_1000, STRIPE_PRICE_WA_CAMPAIGN_2500
 *
 * Yüklenecek kredi adedi YALNIZCA bu katalogdan gelir (istemciden asla alınmaz).
 * `prices` panelde gösterilen liste fiyatıdır; tahsil edilen tutar Stripe Price'taki
 * currency_options ile BİREBİR aynı olmalıdır (TRY değerleri iş kararı; USD/EUR ≈ TRY/50 önerisi).
 */
export type WaPackKind = "utility" | "marketing";
export type WaPackId = "u500" | "u1000" | "m500" | "m1000" | "m2500";

export interface WaCreditPack {
  id: WaPackId;
  kind: WaPackKind;
  credits: number;
  prices: { TRY: number; USD: number; EUR: number };
}

export const WA_CREDIT_PACKS: readonly WaCreditPack[] = [
  { id: "u500", kind: "utility", credits: 500, prices: { TRY: 400, USD: 8, EUR: 7 } },
  { id: "u1000", kind: "utility", credits: 1000, prices: { TRY: 800, USD: 16, EUR: 14 } },
  { id: "m500", kind: "marketing", credits: 500, prices: { TRY: 760, USD: 15, EUR: 13 } },
  { id: "m1000", kind: "marketing", credits: 1000, prices: { TRY: 1500, USD: 30, EUR: 26 } },
  { id: "m2500", kind: "marketing", credits: 2500, prices: { TRY: 3800, USD: 76, EUR: 66 } },
];

export function getWaCreditPack(id: unknown): WaCreditPack | undefined {
  return WA_CREDIT_PACKS.find((p) => p.id === id);
}

/** Paketin Stripe Price kimliği (sunucuda). Tanımsızsa boş string. */
export function getWaCreditPackPriceId(id: WaPackId): string {
  switch (id) {
    case "u500":
      return process.env.STRIPE_PRICE_WA_UTILITY_500 || "";
    case "u1000":
      return process.env.STRIPE_PRICE_WA_UTILITY_1000 || "";
    case "m500":
      return process.env.STRIPE_PRICE_WA_CAMPAIGN_500 || "";
    case "m1000":
      return process.env.STRIPE_PRICE_WA_CAMPAIGN_1000 || "";
    case "m2500":
      return process.env.STRIPE_PRICE_WA_CAMPAIGN_2500 || "";
  }
}
