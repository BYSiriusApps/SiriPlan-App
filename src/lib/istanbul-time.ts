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

// NOT: Intl.DateTimeFormat seçeneklerinde { timeZone } kısayol (shorthand) söz
// dizimi bilerek KULLANILMIYOR — bu projenin Turbopack production minifier'ı
// (bkz. AGENTS.md, standart Next.js'ten farklı) bu üç fonksiyon findAvailableStaff
// üzerinden iç içe çağrıldığında (istanbulDayOfWeek → getWeekdayFormatter)
// parametre isimlerini yeniden adlandırırken shorthand property'nin işaret ettiği
// değişkeni güncellemeyi atlıyor; üretimde "ReferenceError: timeZone is not
// defined" ile "Farketmez" (auto-assign) randevu akışını çökertiyordu (müşteri
// tarafında anlamsız "Bir hata oluştu" mesajına dönüşüyordu). Açık
// "timeZone: timeZone" yazımı bu minifier hatasını tetiklemiyor.
function getHmFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = hmFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
    hmFormatterCache.set(timeZone, f);
  }
  return f;
}

function getWeekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = weekdayFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: timeZone, weekday: "short" });
    weekdayFormatterCache.set(timeZone, f);
  }
  return f;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dateFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone });
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

/**
 * İŞLETME yerel duvar saatini ("2026-08-20", "14:30") mutlak UTC anına çevirir.
 *
 * NEDEN GEREKLİ: Randevu sayfası müsait saatleri /api/availability'den alır ve o
 * uç saatleri İŞLETMENİN saat diliminde üretir. Ama tarayıcı tarafında
 * `new Date("2026-08-20T14:30:00").toISOString()` yazıldığında JavaScript bu
 * metni ZİYARETÇİNİN saat diliminde yorumlar. Almanya'dan (veya saat dilimi
 * yanlış kurulmuş bir telefondan) İstanbul'daki bir salona randevu alan müşteri,
 * ekranda "14:30" seçtiği hâlde veritabanına 15:30/16:30 olarak yazılıyordu —
 * müşteri ile salon farklı saat bekliyordu. Bu fonksiyon dönüşümü her zaman
 * işletmenin saat dilimine göre yapar, ziyaretçinin cihazından bağımsız olarak.
 *
 * Yöntem: önce naif bir UTC anı varsayılır, sonra o anın hedef saat dilimindeki
 * karşılığıyla arasındaki fark (offset) düşülür. İkinci geçiş, yaz saati
 * sınırında offset'in değiştiği kenar durumları düzeltir.
 *
 * @param dateStr "YYYY-MM-DD"
 * @param timeStr "HH:mm"
 */
export function zonedWallTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = DEFAULT_ORG_TIMEZONE
): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const naiveUtc = Date.UTC(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0, 0);

  let guess = naiveUtc;
  for (let i = 0; i < 2; i++) {
    guess = naiveUtc - tzOffsetMs(new Date(guess), timeZone);
  }
  return new Date(guess);
}

/** Verilen anda `timeZone`'un UTC'ye göre farkı (ms). UTC+3 için +10800000. */
function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = getOffsetFormatter(timeZone).formatToParts(at);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // en-GB + hour12:false gece yarısını "24" olarak döndürür (bilinen Intl tuhaflığı);
  // Date.UTC'ye 24 verilirse gün bir ileri kayar ve offset 24 saat yanlış çıkar.
  const hour = pick("hour") % 24;
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    hour,
    pick("minute"),
    pick("second")
  );
  // formatToParts saniyeyi 0-59 döndürür; milisaniye farkı önemsiz olduğu için atılır.
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = offsetFormatterCache.get(timeZone);
  if (!f) {
    // shorthand { timeZone } KULLANILMIYOR — yukarıdaki minifier notuna bakınız.
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
    offsetFormatterCache.set(timeZone, f);
  }
  return f;
}
