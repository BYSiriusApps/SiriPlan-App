export type ServiceCurrency = "TRY" | "USD" | "EUR";

export const CURRENCY_SYMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

export const CURRENCIES: { value: ServiceCurrency; label: string }[] = [
  { value: "TRY", label: "₺ TRY — Türk Lirası" },
  { value: "USD", label: "$ USD — Dolar" },
  { value: "EUR", label: "€ EUR — Euro" },
];

// Sayı biçimi (binlik/ondalık ayraç) panelin aktif diline göre değişir — para
// birimi SEMBOLÜ ise her zaman işletmenin seçtiği currency'den gelir, dilden
// değil. uiLocale next-intl locale kodu ("tr"/"en"/"ru"/"ar"); verilmezse
// geriye dönük uyumluluk için "tr-TR" varsayılır (müşteriye dönük sayfalar).
const NUMBER_LOCALE: Record<string, string> = { tr: "tr-TR", en: "en-US", ru: "ru-RU", ar: "ar-SA" };
export function numberLocaleOf(uiLocale?: string | null) {
  return NUMBER_LOCALE[uiLocale ?? "tr"] ?? "tr-TR";
}

export function formatServicePrice(price: number | null, currency?: string | null, uiLocale?: string | null): string {
  if (price === null || price === undefined) return "";
  const symbol = CURRENCY_SYMBOL[currency ?? "TRY"] ?? "₺";
  return `${symbol}${Number(price).toLocaleString(numberLocaleOf(uiLocale))}`;
}

/** Stok/gelir-gider/maaş gibi finans ekranlarında işletmenin seçtiği para birimiyle (2 ondalık) tutar biçimlendirir. */
export function formatMoney(amount: number, currencyCode?: string | null, uiLocale?: string | null): string {
  const symbol = CURRENCY_SYMBOL[currencyCode ?? "TRY"] ?? "₺";
  return `${symbol}${Number(amount).toLocaleString(numberLocaleOf(uiLocale), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
