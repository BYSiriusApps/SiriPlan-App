export const PRICING_CURRENCIES = ["TRY", "USD", "EUR"] as const;
export type PricingCurrency = (typeof PRICING_CURRENCIES)[number];
export type PlanKey = "starter" | "pro" | "business";

export type PlanPricing = {
  monthly: number;
  annual: number;
};

export const PRICING_BY_CURRENCY: Record<PricingCurrency, Record<PlanKey, PlanPricing>> = {
  TRY: {
    starter: { monthly: 1752, annual: 17240 },
    pro: { monthly: 3024, annual: 29756 },
    business: { monthly: 5424, annual: 53372 },
  },
  USD: {
    starter: { monthly: 36, annual: 354 },
    pro: { monthly: 63, annual: 620 },
    business: { monthly: 113, annual: 1113 },
  },
  EUR: {
    starter: { monthly: 30, annual: 303 },
    pro: { monthly: 54, annual: 528 },
    business: { monthly: 96, annual: 951 },
  },
} as const;

export const DEFAULT_PRICING = {
  currency: "TRY" as PricingCurrency,
  plans: PRICING_BY_CURRENCY.TRY,
};

/** Euro bölgesi + EUR fiyatlamanın beklendiği Avrupa ülkeleri. */
const EUR_COUNTRIES = ["DE", "FR", "ES", "IT", "NL", "BE", "SE", "NO", "DK", "FI", "PL", "CZ", "PT", "IE", "AT", "CH", "LU", "GR", "RO", "HR", "SK", "HU", "SI", "EE", "LV", "LT", "IS", "AD", "MC", "SM", "VA"];

export function getPricingCurrencyFromHeaders(headers?: Headers | Record<string, string | null | undefined>): PricingCurrency {
  const lookup = headers instanceof Headers ? headers.get.bind(headers) : (name: string) => headers?.[name] ?? null;
  // SIRA ÖNEMLİ: x-vercel-ip-country önce. Vercel bu başlığı gelen istekte
  // EZER, yani sahte değer gönderilemez. Diğerleri (cf-ipcountry vb.) bu
  // platformda altyapı tarafından set EDİLMEDİĞİ için istemci istediğini
  // yazabilir; yalnızca başka bir CDN arkasına geçilirse anlam kazanırlar.
  //
  // BU YÜZDEN buradan dönen para birimi SADECE GÖSTERİM içindir; ödemede
  // Stripe Price ID belirleyicidir. İleride plana + para birimine göre ayrı
  // Price ID kullanılacak olursa para birimi ASLA bu başlıkla seçilmemeli —
  // aksi hâlde herkes en ucuz para biriminden satın alabilir.
  const countryCode = lookup("x-vercel-ip-country") ?? lookup("cf-ipcountry") ?? lookup("x-country-code") ?? lookup("x-country") ?? "";
  const normalized = countryCode.toUpperCase();

  if (normalized === "TR") return "TRY";
  if (EUR_COUNTRIES.includes(normalized)) return "EUR";

  // Ülkesi BİLİNEN ama Avrupa listesinde olmayan her ziyaretçi USD görür —
  // "Türkiye'de TL, yurt dışında döviz" kuralının doğal karşılığı budur.
  // Ülke bilgisi HİÇ yoksa (yerel geliştirme, build anı, geo header'ı
  // olmayan bir ortam) birincil pazara, TRY'ye düşülür.
  if (normalized) return "USD";

  return "TRY";
}

export function getAnnualMonthlyEquivalent(monthly: number, annual: number): number {
  return annual > 0 ? Math.round(annual / 12) : monthly;
}

export function getAnnualSavings(monthly: number, annual: number): number {
  return Math.max(0, monthly * 12 - annual);
}

export function formatPrice(amount: number, currency: PricingCurrency): string {
  const locale = currency === "TRY" ? "tr-TR" : "en-US";
  const displayAmount = Math.round(amount);
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(displayAmount);

  const symbol = currency === "TRY" ? "₺" : currency === "USD" ? "$" : "€";
  return `${symbol}${value}`;
}

export function getVisitorPricing(headers?: Headers | Record<string, string | null | undefined>) {
  const currency = getPricingCurrencyFromHeaders(headers);
  return {
    currency,
    plans: PRICING_BY_CURRENCY[currency],
  };
}
