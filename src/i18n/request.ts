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

// `import(\`...${locale}.json\`)` (template-string yolu) bundler için
// belirsizdir: hangi dosyanın gerekeceğini derleme zamanında kestiremediği
// için Turbopack/webpack DÖRT dilin de JSON'unu tek bir client-erişilebilir
// chunk'ta birleştiriyordu (~815KB ham veri — ar+ru+tr+en aynı pakette).
// Bunu müşteriye açık /r/[slug] randevu sayfası da indiriyordu, yani hiç
// giriş yapmamış her müşteri kullanmayacağı 3 dilin metnini de çekiyordu.
// Sabit (literal) yol içeren ayrı import() çağrıları bundler'a her dili
// KENDİ chunk'ına ayırma imkânı verir — çalışma zamanı davranışı (hangi
// dilin seçildiği) birebir aynı kalır, yalnızca paketleme değişir.
const MESSAGE_LOADERS = {
  tr: () => import("../../messages/tr.json"),
  en: () => import("../../messages/en.json"),
  ru: () => import("../../messages/ru.json"),
  ar: () => import("../../messages/ar.json"),
} satisfies Record<Locale, () => Promise<{ default: unknown }>>;

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
    messages: (await MESSAGE_LOADERS[locale]()).default,
  };
});
