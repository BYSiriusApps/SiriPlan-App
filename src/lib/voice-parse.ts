/**
 * Sesli randevu komutu için YEREL (AI'sız) ayrıştırıcı.
 *
 * `/api/ai/voice-booking` önce Gemini'yi dener; anahtar yoksa, Gemini hata
 * verirse ya da fonksiyon çağrısı üretmezse bu ayrıştırıcı devreye girer.
 * Ayrıca Gemini kısmi sonuç döndürdüğünde boş alanları buradan tamamlarız.
 *
 * Tasarım: "anlamadım" demek yerine ne çıkarabiliyorsa çıkarır ve `missing`
 * listesinde eksikleri bildirir. İstemci kısmi sonucu forma yazar, kullanıcı
 * eksikleri tamamlar.
 */
import {
  DEFAULT_ORG_TIMEZONE,
  istanbulDateStr,
  zonedWallTimeToUtc,
} from "@/lib/istanbul-time";

export interface VoiceStaff {
  id: string;
  full_name: string;
}
export interface VoiceService {
  id: string;
  name: string;
  price?: number | null;
  duration_minutes?: number | null;
}

export interface ParsedBooking {
  customer_name: string;
  customer_phone: string;
  staff_id: string;
  staff_name: string;
  service_id: string;
  service_name: string;
  /** ISO 8601, mutlak an (UTC). Bulunamazsa "". */
  appointment_at: string;
  note: string;
  /** Doldurulamayan zorunlu alanlar: "customer_name" | "service" | "datetime" */
  missing: string[];
}

/** Türkçe küçük harf + aksan/özel karakter sadeleştirme (fuzzy eşleştirme için). */
function deburr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/İ/g, "i")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const WEEKDAYS: Record<string, number> = {
  pazar: 0, pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const MONTHS: Record<string, number> = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7,
  agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** "üç", "on beş" gibi yazı ile sayıları 0-50 aralığında çözer (saat için). */
const NUM_WORDS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8,
  dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50,
};

function wordsToNumber(tokens: string[]): number | null {
  let total = 0;
  let matched = false;
  for (const tok of tokens) {
    if (tok in NUM_WORDS) {
      total += NUM_WORDS[tok];
      matched = true;
    } else {
      break;
    }
  }
  return matched ? total : null;
}

interface TimeResult {
  hour: number;
  minute: number;
}

/** Metinden saati çıkarır: "15:30", "15.30", "15 30", "saat 3", "üç buçuk", "yarım" vb. */
function parseTime(norm: string): TimeResult | null {
  // 15:30 / 15.30 / 15h30
  let m = norm.match(/\b([01]?\d|2[0-3])[:.\s]([0-5]\d)\b/);
  if (m) return { hour: Number(m[1]), minute: Number(m[2]) };

  // "saat 15" / "saat 9" / "15 te" / "9 da"
  m = norm.match(/\bsaat\s+([01]?\d|2[0-3])\b/);
  if (m) return { hour: Number(m[1]), minute: 0 };

  // "3 buçuk" / "üç buçuk"
  m = norm.match(/\b([01]?\d|2[0-3])\s+bucuk\b/);
  if (m) return { hour: Number(m[1]), minute: 30 };

  // rakam + "te/de/da/ta" eki: "15te", "9 da"
  m = norm.match(/\b([01]?\d|2[0-3])\s*(?:te|ta|de|da)\b/);
  if (m) return { hour: Number(m[1]), minute: 0 };

  // yazı ile: "saat üç", "üçte", "üç buçuk"
  const tokens = norm.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "saat" && tokens[i + 1]) {
      const n = wordsToNumber(tokens.slice(i + 1, i + 3));
      if (n !== null && n <= 23) {
        const half = tokens.slice(i + 1, i + 4).includes("bucuk");
        return { hour: n, minute: half ? 30 : 0 };
      }
    }
  }

  // gün bölümü ipuçları
  if (/\boglen\b|\bogle\b|\bnoon\b/.test(norm)) return { hour: 12, minute: 0 };
  return null;
}

interface DateResult {
  /** YYYY-MM-DD, org yerel takviminde. */
  dateStr: string;
}

function addDays(base: Date, days: number, tz: string): string {
  const d = new Date(base.getTime() + days * 86400000);
  return istanbulDateStr(d, tz);
}

/** Metinden tarihi çıkarır: "bugün", "yarın", "öbür gün", "pazartesi", "3 gün sonra", "12 eylül". */
function parseDate(norm: string, now: Date, tz: string): DateResult | null {
  const todayStr = istanbulDateStr(now, tz);

  if (/\bbugun\b|\btoday\b/.test(norm)) return { dateStr: todayStr };
  if (/\byarin\b|\btomorrow\b/.test(norm)) return { dateStr: addDays(now, 1, tz) };
  if (/\bobur gun\b|\bertesi gun\b|\bday after tomorrow\b/.test(norm)) {
    return { dateStr: addDays(now, 2, tz) };
  }

  // "3 gün sonra" / "in 3 days"
  let m = norm.match(/\b(\d{1,2})\s*gun sonra\b/) || norm.match(/\bin (\d{1,2}) days?\b/);
  if (m) return { dateStr: addDays(now, Number(m[1]), tz) };

  // "12 eylül" / "12 september"
  m = norm.match(/\b(\d{1,2})\s+([a-z]+)\b/);
  if (m && MONTHS[m[2]]) {
    const day = Number(m[1]);
    const month = MONTHS[m[2]];
    const [y] = todayStr.split("-").map(Number);
    const candidate = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Geçmişteyse gelecek yıla al
    if (candidate < todayStr) {
      return { dateStr: `${y + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
    }
    return { dateStr: candidate };
  }

  // "12.09" / "12/09" (gün.ay)
  m = norm.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = m[3] ? Number(m[3]) : Number(todayStr.split("-")[0]);
      if (year < 100) year += 2000;
      const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!m[3] && candidate < todayStr) {
        return { dateStr: `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
      }
      return { dateStr: candidate };
    }
  }

  // haftanın günü — "pazartesi", "haftaya salı"
  const nextWeek = /\bhaftaya\b|\bgelecek hafta\b|\bnext week\b/.test(norm);
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`).test(norm)) {
      // org yerel gününü bul
      const [y, mo, d] = todayStr.split("-").map(Number);
      const localNoon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
      const curDow = localNoon.getUTCDay();
      let delta = (dow - curDow + 7) % 7;
      if (delta === 0) delta = 7; // "pazartesi" bugünse gelecek pazartesi
      if (nextWeek) delta += 7;
      return { dateStr: addDays(now, delta, tz) };
    }
  }

  return null;
}

/**
 * TR cep telefonu: "5xx xxx xx xx" biçimini (opsiyonel 0/+90 önekiyle, aralarda
 * boşluk/tire olabilir) yakalar. Metindeki başka rakamlar (saat vb.) numarayı
 * bozmasın diye ham rakam yığınına değil, telefon şekline bakar.
 */
function parsePhone(raw: string): string {
  const m = raw.match(/(?:\+?90[\s.-]?)?0?\s?(5\d{2})[\s.-]?(\d{3})[\s.-]?(\d{2})[\s.-]?(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}${m[4]}`;
  // Aksi halde 10-11 haneli bitişik bir dizi
  const digits = raw.replace(/\D/g, "");
  const d = digits.match(/(?:0?)(5\d{9})(?!\d)/);
  return d ? d[1] : "";
}

/** Hizmet listesinden metne en iyi uyanı bulur. */
function matchService(norm: string, services: VoiceService[]): VoiceService | null {
  let best: VoiceService | null = null;
  let bestLen = 0;
  for (const svc of services) {
    const sn = deburr(svc.name);
    if (!sn) continue;
    if (norm.includes(sn) && sn.length > bestLen) {
      best = svc;
      bestLen = sn.length;
    }
  }
  if (best) return best;

  // token bazlı: hizmet adındaki >=3 harfli her token metinde geçiyorsa
  for (const svc of services) {
    const toks = deburr(svc.name).split(" ").filter((t) => t.length >= 3);
    if (toks.length && toks.every((t) => new RegExp(`\\b${t}`).test(norm))) {
      return svc;
    }
  }
  return null;
}

/**
 * Personel listesinden metne uyanı bulur.
 * `excludeNorms`: müşteri adı olarak çıkarılan kelimeler (aynı ada sahip
 * personelle karışmasın diye dışlanır).
 */
function matchStaff(
  norm: string,
  staff: VoiceStaff[],
  excludeNorms: Set<string>,
): VoiceStaff | null {
  for (const st of staff) {
    const full = deburr(st.full_name);
    if (full && norm.includes(full)) return st;
  }
  for (const st of staff) {
    const first = deburr(st.full_name).split(" ")[0];
    if (!first || first.length < 3 || excludeNorms.has(first)) continue;
    // İlk kelime neredeyse her zaman müşteri adıdır — personel eşleşmesi sayma.
    const firstWordOfTranscript = norm.split(" ")[0];
    if (first === firstWordOfTranscript) continue;
    if (new RegExp(`\\b${first}\\b`).test(norm)) return st;
  }
  return null;
}

/** Bu kelimelerden biri gelince müşteri adının bittiğini varsayarız. */
const NAME_STOP = new Set([
  "randevu", "randevusu", "randevuya", "ver", "olustur", "olusturur", "ekle",
  "icin", "adina", "isimli", "isminde", "saat", "saatinde", "gun", "sonra",
  "lutfen", "istiyorum", "istiyor", "yaptir", "gelecek", "haftaya", "bugun",
  "yarin", "obur", "ertesi", "bucuk", "sabah", "aksam", "oglen", "ogleden",
  "bey", "beye", "beyefendi", "hanim", "hanima", "hanimefendi", "hanimefendiye",
  "musteri", "musterisi", "musteriye",
  "book", "appointment", "for", "with", "tomorrow", "today", "next", "week", "at", "an",
]);

function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}

/**
 * Müşteri adını tahmin eder.
 * 1) "... <Ad> için ..." kalıbı varsa ondan (personel dative'inden ayırır).
 * 2) Yoksa metnin başındaki kelimeleri ilk "stop" kelimesine kadar alır.
 */
function guessCustomerName(original: string, service: VoiceService | null): string {
  const serviceFirstTok = service ? deburr(service.name).split(" ")[0] : "";

  // "Selin için", "Selin Ak için" → "Selin Ak"
  const PARTICLES = new Set(["de", "da", "te", "ta", "e", "a", "ye", "ya", "na", "ne", "ile", "la", "le"]);
  const icinMatch = original.match(
    /([\p{L}]+(?:\s+[\p{L}]+)?(?:\s+[\p{L}]+)?)\s+i[çc]in\b/iu,
  );
  if (icinMatch) {
    const toks = icinMatch[1].trim().split(/\s+/).filter((w) => {
      const n = deburr(w);
      return (
        n.length > 1 &&
        !PARTICLES.has(n) &&
        !NAME_STOP.has(n) &&
        !(n in WEEKDAYS) &&
        !(n in MONTHS) &&
        n !== serviceFirstTok
      );
    });
    // "için"e en yakın 1-2 kelime yeterli
    const tail = toks.slice(-2);
    if (tail.join("").length >= 3) return titleCase(tail.join(" "));
  }

  const kept: string[] = [];
  for (const word of original.trim().split(/\s+/)) {
    const n = deburr(word);
    if (!n) continue;
    if (/\d/.test(word)) break;
    if (NAME_STOP.has(n) || n in WEEKDAYS || n in MONTHS) break;
    if (serviceFirstTok && n === serviceFirstTok) break;
    kept.push(word.replace(/[.,;:!?]+$/, ""));
    if (kept.length >= 3) break;
  }
  // Sondaki tek harfli artıkları at ("Ahmet Demir e" → "Ahmet Demir")
  while (kept.length && deburr(kept[kept.length - 1]).length <= 1) kept.pop();
  const name = kept.join(" ").trim();
  if (name.replace(/\s/g, "").length < 3) return "";
  return titleCase(name);
}

export function parseVoiceBooking(
  transcript: string,
  staff: VoiceStaff[],
  services: VoiceService[],
  opts?: { now?: Date; timezone?: string },
): ParsedBooking {
  const now = opts?.now ?? new Date();
  const tz = opts?.timezone || DEFAULT_ORG_TIMEZONE;
  const norm = deburr(transcript);

  const service = matchService(norm, services);
  const phone = parsePhone(transcript);
  const time = parseTime(norm);
  const date = parseDate(norm, now, tz);

  const customer_name = guessCustomerName(transcript, service);
  const nameNorms = new Set(deburr(customer_name).split(" ").filter(Boolean));
  const staffMatch = matchStaff(norm, staff, nameNorms);

  let appointment_at = "";
  if (date) {
    const t = time ?? { hour: 10, minute: 0 };
    try {
      appointment_at = zonedWallTimeToUtc(
        date.dateStr,
        `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`,
        tz,
      ).toISOString();
    } catch {
      appointment_at = "";
    }
  } else if (time) {
    // Sadece saat söylendi → bugün
    const todayStr = istanbulDateStr(now, tz);
    try {
      const iso = zonedWallTimeToUtc(
        todayStr,
        `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`,
        tz,
      );
      // Geçmişteyse yarına al
      appointment_at = (iso.getTime() < now.getTime()
        ? zonedWallTimeToUtc(addDays(now, 1, tz), `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`, tz)
        : iso
      ).toISOString();
    } catch {
      appointment_at = "";
    }
  }

  const missing: string[] = [];
  if (!customer_name) missing.push("customer_name");
  if (!service) missing.push("service");
  if (!appointment_at) missing.push("datetime");

  return {
    customer_name,
    customer_phone: phone,
    staff_id: staffMatch?.id ?? "",
    staff_name: staffMatch?.full_name ?? "",
    service_id: service?.id ?? "",
    service_name: service?.name ?? "",
    appointment_at,
    note: "",
    missing,
  };
}
