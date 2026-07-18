// Uygulamanın desteklediği diller — messages/*.json dosyalarıyla birebir aynı olmalı.
// Yeni dil eklerken önce messages/<kod>.json çeviri dosyasını oluşturun.
export const SUPPORTED_LANGUAGES = [
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "ar", flag: "🇸🇦", name: "العربية" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANGUAGE_CODES: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

export function isSupportedLanguage(code: unknown): code is LanguageCode {
  return typeof code === "string" && LANGUAGE_CODES.includes(code);
}
