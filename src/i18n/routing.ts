import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en", "ru", "ar", "de", "es"],
  defaultLocale: "tr",
  localeDetection: true,
  localePrefix: "as-needed",
});
