import { tr, enUS, ru, ar, de, es, type Locale } from "date-fns/locale";

const MAP: Record<string, Locale> = { tr, en: enUS, ru, ar, de, es };

/** Aktif arayüz dilinin date-fns karşılığı; bilinmeyen/boş dilde Türkçe (eski davranış). */
export function dateFnsLocaleOf(locale?: string | null): Locale {
  return (locale && MAP[locale]) || tr;
}
