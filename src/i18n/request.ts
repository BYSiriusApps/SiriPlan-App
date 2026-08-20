import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const LOCALES = ["tr", "en", "ru", "ar"] as const;
type Locale = (typeof LOCALES)[number];

/**
 * Ülke → dil eşlemesi. Kullanıcının AÇIK tercihi (NEXT_LOCALE çerezi veya
 * hesabına kayıtlı dil) her zaman önce gelir; buradaki eşleme yalnızca hiç
 * tercih bildirmemiş ilk ziyaretçinin varsayılanını seçer ve sayfadaki dil
 * değiştiriciyle tek tıkla ezilebilir.
 */
const RU_COUNTRIES = ["RU", "BY", "KZ", "KG", "TJ", "UZ", "AM", "MD"];
const AR_COUNTRIES = [
  "SA", "AE", "QA", "KW", "BH", "OM", "YE", "IQ", "JO", "LB", "SY", "PS",
  "EG", "LY", "TN", "DZ", "MA", "MR", "SD", "SO", "DJ", "KM",
];

async function detectLocale(): Promise<Locale> {
  // 1. Cookie (en yaygın yol — giriş ve dil değişiminde zaten yazılıyor,
  // her sayfa geçişinde Supabase'e gitmeden anında karar verilir).
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLang && LOCALES.includes(cookieLang as Locale)) return cookieLang as Locale;

  // 2. Cookie yoksa (ör. yeni cihaz): hesaba kayıtlı dil tercihine bak.
  // Sadece bu durumda Supabase'e gidilir — her sayfada değil.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const accountLang = user?.user_metadata?.locale;
    if (accountLang && LOCALES.includes(accountLang as Locale)) return accountLang as Locale;
  } catch {
    // Supabase erişilemezse (ör. build zamanı) sessizce devam et
  }

  // 3. IP ülkesine göre varsayılan dil: TR -> tr, Rusça/Arapça konuşulan
  // ülkeler -> ru/ar, kalan her yer -> en.
  const headerStore = await headers();
  // x-vercel-ip-country önce: Vercel bu başlığı gelen istekte ezdiği için
  // sahtelenemez (bkz. lib/pricing.ts'teki aynı not). Sahte bir değer yine
  // de yalnızca dili değiştirir, hiçbir yetki taşımaz.
  const countryCode =
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("x-country-code") ??
    headerStore.get("x-country") ??
    "";

  if (countryCode) {
    const normalized = countryCode.toUpperCase();
    if (normalized === "TR") return "tr";
    if (RU_COUNTRIES.includes(normalized)) return "ru";
    if (AR_COUNTRIES.includes(normalized)) return "ar";
    return "en";
  }

  // 4. Ülke bilgisi yoksa (yerel geliştirme, geo header'ı olmayan ortam)
  // tarayıcı diline bakılır; desteklemediğimiz bir dilse İngilizce.
  const acceptLang = headerStore.get("accept-language") ?? "";
  const primaryLang = acceptLang.split(",")[0].split(";")[0].trim().toLowerCase();
  for (const lang of LOCALES) {
    if (primaryLang.startsWith(lang)) return lang;
  }

  return "en";
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
