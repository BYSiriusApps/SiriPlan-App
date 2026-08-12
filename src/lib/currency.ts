export type ServiceCurrency = "TRY" | "USD" | "EUR";

export const CURRENCY_SYMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

export const CURRENCIES: { value: ServiceCurrency; label: string }[] = [
  { value: "TRY", label: "₺ TRY — Türk Lirası" },
  { value: "USD", label: "$ USD — Dolar" },
  { value: "EUR", label: "€ EUR — Euro" },
];

export function formatServicePrice(price: number | null, currency?: string | null): string {
  if (price === null || price === undefined) return "";
  const symbol = CURRENCY_SYMBOL[currency ?? "TRY"] ?? "₺";
  return `${symbol}${Number(price).toLocaleString("tr-TR")}`;
}
