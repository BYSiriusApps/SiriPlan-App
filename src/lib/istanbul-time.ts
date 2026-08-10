/**
 * Sunucu (Vercel/Node) runtime'ı UTC çalışır, ama salonların çalışma saatleri
 * ve randevu slotları hep Europe/Istanbul yerel saatine göre girilir/gösterilir.
 * Ham `Date.prototype.getHours()/getDay()` sunucuda UTC döner — bu da örneğin
 * "12:15" (İstanbul) bir randevuyu "09:15" sanıp müsaitlik/çalışma saati
 * kontrollerini 3 saat kaydırıyordu. Bu yardımcılar her zaman İstanbul'a göre
 * hesaplar, sunucunun kendi timezone'ından bağımsız olarak.
 */

const HM_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Istanbul",
  weekday: "short",
});

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Verilen anın İstanbul yerel saatindeki gün içi dakika karşılığı (0-1439). */
export function istanbulMinutesOfDay(date: Date): number {
  const parts = HM_FORMATTER.formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** Verilen anın İstanbul yerel saatindeki haftanın günü (0=Pazar...6=Cumartesi, Date.getDay() ile aynı). */
export function istanbulDayOfWeek(date: Date): number {
  const weekday = WEEKDAY_FORMATTER.format(date);
  return WEEKDAY_MAP[weekday] ?? date.getDay();
}

/** Verilen anın İstanbul yerel tarihi, "YYYY-MM-DD" biçiminde. */
export function istanbulDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(date);
}
