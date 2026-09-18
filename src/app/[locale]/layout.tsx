import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/resolve-locale";

// `[locale]` yalnızca pazarlama sayfaları için var (bkz. proxy.ts'teki
// yönlendirme) — ama App Router seviyesinde teknik olarak HERHANGİ bir tek
// segmentli, eşleşmeyen path (ör. bir bot'un denediği /xyz) buraya
// düşebilir. next-intl'in kendi dokümantasyonu bu segmenti "bilinmeyen
// rotalar için catch-all gibi davranır" diye tarif eder; geçersiz bir
// locale'i sessizce "tr" gibi render etmek yerine 404'e düşürüyoruz.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Bu segment altındaki sunucu bileşenleri (ör. (marketing)/layout.tsx'teki
  // getMessages()) locale'i tekrar çözümlemeden senkron okuyabilsin diye.
  setRequestLocale(locale);

  return children;
}
