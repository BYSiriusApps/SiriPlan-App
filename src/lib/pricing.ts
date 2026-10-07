export const PRICING_CURRENCIES = ["TRY", "USD", "EUR"] as const;
export type PricingCurrency = (typeof PRICING_CURRENCIES)[number];
export type PlanKey = "mini" | "starter" | "pro" | "business";

export type PlanPricing = {
  monthly: number;
  annual: number;
};

export const PRICING_BY_CURRENCY: Record<PricingCurrency, Record<PlanKey, PlanPricing>> = {
  TRY: {
    mini: { monthly: 399, annual: 3926 },
    starter: { monthly: 1199, annual: 11798 },
    pro: { monthly: 1799, annual: 17702 },
    business: { monthly: 4752, annual: 46760 },
  },
  USD: {
    mini: { monthly: 14, annual: 138 },
    starter: { monthly: 29, annual: 285 },
    pro: { monthly: 39, annual: 384 },
    business: { monthly: 99, annual: 974 },
  },
  EUR: {
    mini: { monthly: 13, annual: 128 },
    starter: { monthly: 26, annual: 256 },
    pro: { monthly: 33, annual: 325 },
    business: { monthly: 84, annual: 827 },
  },
} as const;

/** Mini aylık fiyatın indirim öncesi (üstü çizili) değeri; yalnızca eski fiyatı bilinen para birimleri. */
export const MINI_LIST_PRICE: Partial<Record<PricingCurrency, number>> = { TRY: 499 };

export const DEFAULT_PRICING = {
  currency: "TRY" as PricingCurrency,
  plans: PRICING_BY_CURRENCY.TRY,
};

/** Euro bölgesi + EUR fiyatlamanın beklendiği Avrupa ülkeleri. */
const EUR_COUNTRIES = ["DE", "FR", "ES", "IT", "NL", "BE", "SE", "NO", "DK", "FI", "PL", "CZ", "PT", "IE", "AT", "CH", "LU", "GR", "RO", "HR", "SK", "HU", "SI", "EE", "LV", "LT", "IS", "AD", "MC", "SM", "VA"];

export function getPricingCurrencyFromHeaders(headers?: Headers | Record<string, string | null | undefined>): PricingCurrency {
  const lookup = headers instanceof Headers ? headers.get.bind(headers) : (name: string) => headers?.[name] ?? null;
  const cookieHeader = lookup("cookie") ?? "";
  
  if (cookieHeader.includes("pricing_currency=TRY")) return "TRY";
  if (cookieHeader.includes("pricing_currency=USD")) return "USD";
  if (cookieHeader.includes("pricing_currency=EUR")) return "EUR";

  // SIRA ÖNEMLİ: x-vercel-ip-country önce. Vercel bu başlığı gelen istekte
  // EZER, yani sahte değer gönderilemez.
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

/**
 * Yapay zeka asistanlarının (web sohbet, panel yardımcısı) söyleyeceği GÜNCEL
 * fiyat özeti — tüm planlar, aylık/yıllık, TL + USD + EUR. Fiyat metinleri
 * elle yazılırsa eskiyip yanlış fiyat söylenir; bu yüzden tek kaynaktan üretilir.
 */
const ASSISTANT_UNITS = {
  tr: { perMonth: "/ay", yearly: "yıllık" },
  en: { perMonth: "/mo", yearly: "yearly" },
  ru: { perMonth: "/мес", yearly: "за год" },
  ar: { perMonth: "/شهر", yearly: "سنويًا" },
} as const;

export function pricingSummaryForAssistant(
  lang: keyof typeof ASSISTANT_UNITS = "tr",
  currencies: readonly PricingCurrency[] = PRICING_CURRENCIES,
): string {
  const u = ASSISTANT_UNITS[lang];
  const plans: { key: PlanKey; name: string }[] = [
    { key: "mini", name: "Mini" },
    { key: "starter", name: "Starter" },
    { key: "pro", name: "Pro" },
    { key: "business", name: "Business" },
  ];
  return plans
    .map(({ key, name }) => {
      const parts = currencies.map((cur) => {
        const p = PRICING_BY_CURRENCY[cur][key];
        return `${formatPrice(p.monthly, cur)}${u.perMonth} (${u.yearly} ${formatPrice(p.annual, cur)})`;
      });
      return `${name}: ${parts.join(" · ")}`;
    })
    .join("; ");
}
