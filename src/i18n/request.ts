import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const LOCALES = ["tr", "en", "ru", "ar"] as const;
type Locale = (typeof LOCALES)[number];

async function detectLocale(): Promise<Locale> {
  // 1. Giriş yapmış kullanıcının hesabına kayıtlı dil tercihi (org'dan bağımsız,
  // cihazdan bağımsız — asıl kaynak).
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const accountLang = user?.user_metadata?.locale;
    if (accountLang && LOCALES.includes(accountLang as Locale)) return accountLang as Locale;
  } catch {
    // Supabase erişilemezse (ör. build zamanı) sessizce devam et
  }

  // 2. Cookie (giriş yapmamış ziyaretçi / henüz senkronize olmamış anlık geçiş)
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLang && LOCALES.includes(cookieLang as Locale)) return cookieLang as Locale;

  // 3. Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get("accept-language") ?? "";
  for (const lang of LOCALES) {
    if (acceptLang.toLowerCase().startsWith(lang)) return lang;
  }

  return "tr";
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
