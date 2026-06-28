import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const LOCALES = ["tr", "en", "ru", "ar"] as const;
type Locale = (typeof LOCALES)[number];

async function detectLocale(): Promise<Locale> {
  // 1. Cookie (user preference, set on locale switch)
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLang && LOCALES.includes(cookieLang as Locale)) return cookieLang as Locale;

  // 2. Accept-Language header
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
