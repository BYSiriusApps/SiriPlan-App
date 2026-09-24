import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, resolveLocale, type Locale } from "@/lib/i18n/resolve-locale";

/**
 * Dashboard/panel, auth, /r/[slug] vb. — hiçbiri `[locale]` segmentinin
 * altında değil, dolayısıyla `requestLocale` burada her zaman `undefined`
 * gelir (next-intl'in kendi tanımı: segment dışı render). Bu durumda dil
 * cookie/hesap/IP/Accept-Language zincirinden çıkarılır — mimari değişmedi,
 * yalnızca ortak `resolveLocale` fonksiyonuna taşındı (bkz.
 * lib/i18n/resolve-locale.ts, aynı mantık artık proxy.ts'in pazarlama
 * yönlendirmesiyle de paylaşılıyor).
 */
async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  let accountLocale: string | null = null;
  // Cookie zaten geçerliyse Supabase'e hiç gidilmez (yaygın yol, her sayfada
  // ağ isteği eklememek için).
  if (!isLocale(cookieLocale)) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      accountLocale = user?.user_metadata?.locale ?? null;
    } catch {
      // Supabase erişilemezse (ör. build zamanı) sessizce devam et
    }
  }

  const headerStore = await headers();
  // x-vercel-ip-country önce: Vercel bu başlığı gelen istekte ezdiği için
  // sahtelenemez (bkz. lib/pricing.ts'teki aynı not). Sahte bir değer yine
  // de yalnızca dili değiştirir, hiçbir yetki taşımaz.
  const countryCode =
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("x-country-code") ??
    headerStore.get("x-country");

  return resolveLocale({
    cookieLocale,
    accountLocale,
    countryCode,
    acceptLanguage: headerStore.get("accept-language"),
  });
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Pazarlama sayfaları artık `app/[locale]/(marketing)` altında — next-intl
  // proxy.ts'te eşleştirdiği locale'i buraya `requestLocale` olarak iletir.
  // Segment dışı her şey (dashboard/auth/api/r/randevu/onay) `undefined` alır
  // ve eski cookie/IP zincirine düşer (detectLocale) — iki ayrı sistem değil,
  // tek config, tek dallanma.
  const segmentLocale = await requestLocale;
  const locale = isLocale(segmentLocale) ? segmentLocale : await detectLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
