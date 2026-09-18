import { getLocale } from "next-intl/server";
import { LOCALES, type Locale } from "@/lib/i18n/resolve-locale";

export const SITE_BASE_URL = "https://siriplan.com";

/**
 * `as-needed` önek stratejisiyle bir yolun belirli bir locale'deki gerçek
 * URL'i: tr (varsayılan) hiç önek almaz, diğerleri /en, /ru, /ar alır.
 * Hem sayfa metadata'sında (buildAlternates) hem de sitemap.ts'te KULLANILAN
 * TEK URL üretim noktası — ikisi ayrı ayrı hesaplarsa sitemap ile
 * sayfa-içi canonical zamanla birbirinden sapabilir (klasik hreflang hatası).
 */
export function localizedUrl(pathname: string, locale: Locale): string {
  const path = pathname === "/" ? "" : pathname;
  return locale === "tr" ? `${SITE_BASE_URL}${path || "/"}` : `${SITE_BASE_URL}/${locale}${path}`;
}

/**
 * Bir pazarlama sayfasının `generateMetadata()`'sında kullanılacak
 * `alternates` bloğu: canonical KENDİ locale'ine işaret eder (asla tr'ye
 * geri dönmez — bu, GSC'nin 17 Eylül'de düzelttiği "hangi URL asıl"
 * karışıklığını yeniden yaratırdı), `languages` ise 4 dil + x-default'u
 * listeler (x-default = tr, önek'siz sürüm).
 *
 * `pathname` locale-neutral verilir (ör. "/fiyatlar", `/blog/${slug}`) —
 * mevcut `alternates: { canonical: "/fiyatlar" }` çağrılarıyla birebir aynı
 * string, tek fark `buildAlternates(...)` sarmalayıcısı.
 */
export async function buildAlternates(pathname: string) {
  const locale = (await getLocale()) as Locale;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localizedUrl(pathname, l);
  languages["x-default"] = localizedUrl(pathname, "tr");

  return {
    canonical: localizedUrl(pathname, locale),
    languages,
  };
}
