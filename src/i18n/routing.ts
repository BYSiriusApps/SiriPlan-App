import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en", "ru", "ar"],
  defaultLocale: "tr",
  localeDetection: true,
  localePrefix: "as-needed",
});
