/**
 * Cerez/hesap/IP-ülke/Accept-Language zincirinden dil çıkarımı — hem
 * `src/i18n/request.ts` (dashboard/panel, next/headers ile) hem de
 * `src/proxy.ts` (pazarlama sayfaları için ilk-ziyaret yönlendirmesi, Edge
 * Request ile) tarafından kullanılır. next/headers gibi sunucuya özel
 * importlar İÇERMEZ ki proxy.ts'in Edge/Node çalışma zamanında da
 * kullanılabilsin (bkz. mobile-app-shared.ts'teki aynı gerekçe).
 */
export const LOCALES = ["tr", "en", "ru", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

const RU_COUNTRIES = ["RU", "BY", "KZ", "KG", "TJ", "UZ", "AM", "MD"];
const AR_COUNTRIES = [
  "SA", "AE", "QA", "KW", "BH", "OM", "YE", "IQ", "JO", "LB", "SY", "PS",
  "EG", "LY", "TN", "DZ", "MA", "MR", "SD", "SO", "DJ", "KM",
];
const EUR_COUNTRIES = ["DE", "FR", "ES", "IT", "NL", "BE", "SE", "NO", "DK", "FI", "PL", "CZ", "PT", "IE", "AT", "CH", "LU", "GR", "RO", "HR", "SK", "HU", "SI", "EE", "LV", "LT", "IS", "AD", "MC", "SM", "VA"];

function localeFromCountry(countryCode: string): Locale {
  const normalized = countryCode.toUpperCase();
  if (normalized === "TR") return "tr";
  if (EUR_COUNTRIES.includes(normalized)) return "en";
  if (RU_COUNTRIES.includes(normalized)) return "ru";
  if (AR_COUNTRIES.includes(normalized)) return "ar";
  return "en";
}

function localeFromAcceptLanguage(acceptLanguage: string): Locale | undefined {
  const primaryLang = acceptLanguage.split(",")[0].split(";")[0].trim().toLowerCase();
  return LOCALES.find((lang) => primaryLang.startsWith(lang));
}

export interface ResolveLocaleInput {
  /** NEXT_LOCALE çerezi — varsa her zaman kazanır. */
  cookieLocale?: string | null;
  /** Giriş yapmış kullanıcının hesabına kayıtlı tercih (user_metadata.locale). */
  accountLocale?: string | null;
  /** x-vercel-ip-country / cf-ipcountry vb. */
  countryCode?: string | null;
  /** Accept-Language başlığı. */
  acceptLanguage?: string | null;
}

/**
 * Öncelik sırası: 1) cookie, 2) hesap tercihi, 3) IP-ülke eşlemesi,
 * 4) Accept-Language, 5) "en" varsayılanı.
 */
export function resolveLocale(input: ResolveLocaleInput): Locale {
  if (isLocale(input.cookieLocale)) return input.cookieLocale;
  if (isLocale(input.accountLocale)) return input.accountLocale;
  if (input.countryCode) return localeFromCountry(input.countryCode);
  if (input.acceptLanguage) {
    const fromAcceptLanguage = localeFromAcceptLanguage(input.acceptLanguage);
    if (fromAcceptLanguage) return fromAcceptLanguage;
  }
  return "en";
}

/**
 * Arama motoru / AI crawler user-agent'ları — bkz. robots.ts'teki izin
 * listesiyle aynı bot aileleri + Googlebot/Bingbot'un kendisi. Bu istekler
 * asla IP/Accept-Language tahminine göre başka bir locale'e YÖNLENDİRİLMEZ:
 * her zaman varsayılan (tr, önek'siz) URL'i görürler ve diğer dilleri
 * yalnızca hreflang etiketleri üzerinden keşfederler. Aksi halde ABD IP'li
 * bir crawler `/fiyatlar`'a girip `/en/fiyatlar`'a yönlendirilir — GSC'nin
 * 17 Eylül'de düzeltilen "hangi URL asıl" karışıklığını yeniden yaratır.
 */
const CRAWLER_UA_MARKERS = [
  "Googlebot", "bingbot", "GPTBot", "OAI-SearchBot", "Google-Extended",
  "PerplexityBot", "ClaudeBot", "anthropic-ai", "FacebookBot", "Applebot",
  "cohere-ai", "CCBot", "DuckDuckBot", "YandexBot", "Bytespider",
];

export function isKnownCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA_MARKERS.some((marker) => userAgent.includes(marker));
}
