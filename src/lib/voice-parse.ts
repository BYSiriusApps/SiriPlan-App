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

/**
 * İki kelimenin "aynı kökten" sayılıp sayılmayacağı — Türkçe çekim eklerini
 * tolere etmek için önek eşleşmesi ("kesim" ↔ "kesimi", "ahmet" ↔ "ahmete").
 * Kısa kelimelerde (<4) yanlış eşleşmeyi önlemek için yalnızca birebir kabul.
 */
function tokenSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  return a.startsWith(b) || b.startsWith(a);
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
  // 15:30 / 15.30 / "15 30" — deburr ayraçları boşluğa çevirdiği için \s dahil.
  // (Telefon numarası bu aşamadan önce stripPhone ile atıldığından "22 33"
  // gibi numara parçaları buraya gelmez.)
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
const PHONE_RE = /(?:\+?90[\s.-]?)?0?\s?(5\d{2})[\s.-]?(\d{3})[\s.-]?(\d{2})[\s.-]?(\d{2})/;

function parsePhone(raw: string): string {
  const m = raw.match(PHONE_RE);
  if (m) return `${m[1]}${m[2]}${m[3]}${m[4]}`;
  // Aksi halde 10-11 haneli bitişik bir dizi
  const digits = raw.replace(/\D/g, "");
  const d = digits.match(/(?:0?)(5\d{9})(?!\d)/);
  return d ? d[1] : "";
}

/**
 * Telefon numarasını metinden çıkarır — "0532 111 22 33" içindeki "22 33"
 * saat sanılıp randevuyu 22:33'e kaydırmasın diye tarih/saat/hizmet eşleştirmesi
 * numarasız metin üzerinde yapılır.
 */
function stripPhone(raw: string): string {
  return raw.replace(new RegExp(PHONE_RE, "g"), " ").replace(/\b0?5\d{9}\b/g, " ");
}

/**
 * Hizmet listesinden metne en iyi uyanı bulur.
 * Puanlama: eşleşen kelime oranı + tam ifade geçiyorsa bonus. Çekim eklerini
 * `tokenSimilar` ile tolere eder ("saç kesimi" ↔ "kesim"). İki hizmet birbirine
 * çok yakın puandaysa (ör. yalnızca "saç" ortak) belirsiz sayıp boş döner —
 * kullanıcı listeden seçsin.
 */
function matchService(norm: string, services: VoiceService[]): VoiceService | null {
  const normToks = norm.split(" ").filter((t) => t.length >= 2);
  const scored: { svc: VoiceService; score: number; full: string }[] = [];

  for (const svc of services) {
    const full = deburr(svc.name);
    if (!full) continue;
    const toks = full.split(" ").filter((t) => t.length >= 2 && t !== "ve" && t !== "ile");
    if (!toks.length) continue;

    let matched = 0;
    for (const st of toks) {
      if (normToks.some((nt) => tokenSimilar(nt, st))) matched++;
    }
    if (!matched) continue;

    let score = matched / toks.length;
    if (norm.includes(full)) score += 1; // tam ifade geçiyor
    scored.push({ svc, score, full });
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score || b.full.length - a.full.length);

  const [top, second] = scored;
  if (top.score >= 1) return top.svc; // tüm kelimeler ya da tam ifade
  if (second && top.score - second.score < 0.25) return null; // belirsiz
  if (top.score >= 0.5) return top.svc;
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

  // Ad ya da soyadın herhangi biri (çekim ekli olabilir) metinde geçiyorsa.
  // İlk kelime (i=0) neredeyse her zaman müşteri adıdır, atlanır. Metnin
  // sonuna yakın geçen eşleşme tercih edilir ("... Zeynep yapsın").
  const normToks = norm.split(" ").filter(Boolean);
  let best: VoiceStaff | null = null;
  let bestPos = -1;
  for (const st of staff) {
    const parts = deburr(st.full_name).split(" ").filter((p) => p.length >= 3);
    for (const p of parts) {
      if (excludeNorms.has(p)) continue;
      for (let i = 1; i < normToks.length; i++) {
        if (tokenSimilar(normToks[i], p) && i > bestPos) {
          best = st;
          bestPos = i;
        }
      }
    }
  }
  return best;
}

/** Bu kelimelerden biri gelince müşteri adının bittiğini varsayarız. */
const NAME_STOP = new Set([
  "randevu", "randevusu", "randevuya", "ver", "olustur", "olusturur", "ekle",
  "icin", "adina", "isimli", "isminde", "saat", "saatinde", "gun", "sonra",
  "lutfen", "istiyorum", "istiyor", "yaptir", "gelecek", "haftaya", "bugun",
  "yarin", "obur", "ertesi", "bucuk", "sabah", "aksam", "oglen", "ogleden",
  "bey", "beye", "beyefendi", "hanim", "hanima", "hanimefendi", "hanimefendiye",
  "musteri", "musterisi", "musteriye", "hizmet", "hizmeti", "personel", "personeli",
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
function guessCustomerName(
  original: string,
  service: VoiceService | null,
  serviceTokens: Set<string>,
): string {
  const serviceFirstTok = service ? deburr(service.name).split(" ")[0] : "";
  const hitsService = (n: string) =>
    n === serviceFirstTok ||
    serviceTokens.has(n) ||
    [...serviceTokens].some((st) => tokenSimilar(n, st));

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
        !hitsService(n)
      );
    });
    // "için"e en yakın 1-2 kelime yeterli
    const tail = toks.slice(-2);
    if (tail.join("").length >= 3) return titleCase(tail.join(" "));
  }

  const LEAD_IN = new Set(["musteri", "musterinin", "isim", "ismi", "adi", "ad", "sayin"]);
  const kept: string[] = [];
  for (const word of original.trim().split(/\s+/)) {
    const n = deburr(word);
    if (!n) continue;
    if (kept.length === 0 && LEAD_IN.has(n)) continue; // "müşteri Ahmet" → "Ahmet"
    if (/\d/.test(word)) break;
    if (NAME_STOP.has(n) || n in WEEKDAYS || n in MONTHS) break;
    if (hitsService(n)) break;
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
  // Tarih/saat/hizmet eşleştirmesi telefon numarasız metin üzerinde yapılır.
  const norm = deburr(stripPhone(transcript));

  const allServiceTokens = new Set<string>();
  for (const s of services) {
    for (const tk of deburr(s.name).split(" ")) {
      if (tk.length >= 3 && tk !== "ile") allServiceTokens.add(tk);
    }
  }

  const service = matchService(norm, services);
  const phone = parsePhone(transcript);
  const time = parseTime(norm);
  const date = parseDate(norm, now, tz);

  const customer_name = guessCustomerName(transcript, service, allServiceTokens);
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
