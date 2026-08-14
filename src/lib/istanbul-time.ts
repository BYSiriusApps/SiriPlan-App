/**
 * Sunucu (Vercel/Node) runtime'ı UTC çalışır, ama salonların çalışma saatleri
 * ve randevu slotları işletmenin kendi saat dilimine (organizations.timezone,
 * varsayılan Europe/Istanbul) göre girilir/gösterilir. Ham
 * `Date.prototype.getHours()/getDay()` sunucuda UTC döner — bu da örneğin
 * "12:15" (İstanbul) bir randevuyu "09:15" sanıp müsaitlik/çalışma saati
 * kontrollerini 3 saat kaydırıyordu. Bu yardımcılar her zaman verilen
 * timezone'a göre hesaplar, sunucunun kendi timezone'ından bağımsız olarak.
 * Parametre verilmezse geriye dönük uyumluluk için Europe/Istanbul kullanılır.
 */

export const DEFAULT_ORG_TIMEZONE = "Europe/Istanbul";

const hmFormatterCache = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getHmFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = hmFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
    hmFormatterCache.set(timeZone, f);
  }
  return f;
}

function getWeekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = weekdayFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
    weekdayFormatterCache.set(timeZone, f);
  }
  return f;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dateFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone });
    dateFormatterCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Verilen anın işletme yerel saatindeki gün içi dakika karşılığı (0-1439). */
export function istanbulMinutesOfDay(date: Date, timeZone: string = DEFAULT_ORG_TIMEZONE): number {
  const parts = getHmFormatter(timeZone).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** Verilen anın işletme yerel saatindeki "HH:mm" gösterimi. */
export function istanbulTimeStr(date: Date, timeZone: string = DEFAULT_ORG_TIMEZONE): string {
  const parts = getHmFormatter(timeZone).formatToParts(date);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** Verilen anın işletme yerel saatindeki haftanın günü (0=Pazar...6=Cumartesi, Date.getDay() ile aynı). */
export function istanbulDayOfWeek(date: Date, timeZone: string = DEFAULT_ORG_TIMEZONE): number {
  const weekday = getWeekdayFormatter(timeZone).format(date);
  return WEEKDAY_MAP[weekday] ?? date.getDay();
}

/** Verilen anın işletme yerel tarihi, "YYYY-MM-DD" biçiminde. */
export function istanbulDateStr(date: Date, timeZone: string = DEFAULT_ORG_TIMEZONE): string {
  return getDateFormatter(timeZone).format(date);
}
