/**
 * SMS kontör paketleri kataloğu (istemci + sunucu güvenli; sunucu bağımlılığı yok).
 *
 * Stripe Price kimlikleri env'den okunur (yerel .env.local + Vercel):
 *   STRIPE_PRICE_SMS_1000, STRIPE_PRICE_SMS_5000, STRIPE_PRICE_SMS_10000
 * Eski tek paket değişkeni STRIPE_PRICE_SMS_PACK, 1.000'lik paket için yedek olarak okunur.
 *
 * Yüklenecek kontör adedi YALNIZCA bu katalogdan gelir (istemciden asla alınmaz).
 */
export type SmsPackId = "1000" | "5000" | "10000";

export interface SmsPack {
  id: SmsPackId;
  credits: number;
  /** Panelde gösterilen liste fiyatı; tahsil edilen tutar Stripe Price (currency_options) ile aynı olmalı. */
  prices: { TRY: number; USD: number; EUR: number };
}

export const SMS_PACKS: readonly SmsPack[] = [
  { id: "1000", credits: 1000, prices: { TRY: 150, USD: 15, EUR: 10 } },
  { id: "5000", credits: 5000, prices: { TRY: 600, USD: 60, EUR: 50 } },
  { id: "10000", credits: 10000, prices: { TRY: 1000, USD: 100, EUR: 90 } },
];

export function getSmsPack(id: unknown): SmsPack | undefined {
  return SMS_PACKS.find((p) => p.id === id);
}

/** Paketin Stripe Price kimliği (sunucuda). Tanımsızsa boş string. */
export function getSmsPackPriceId(id: SmsPackId): string {
  switch (id) {
    case "1000":
      return process.env.STRIPE_PRICE_SMS_1000 || process.env.STRIPE_PRICE_SMS_PACK || "";
    case "5000":
      return process.env.STRIPE_PRICE_SMS_5000 || "";
    case "10000":
      return process.env.STRIPE_PRICE_SMS_10000 || "";
  }
}
