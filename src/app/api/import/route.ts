import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import * as XLSX from "xlsx";

type Row = Record<string, string>;
type Table = { label: string; rows: Row[] };

/**
 * Başlıkları tek biçime indirger: "Ad_Soyad", "AD SOYAD", "ad-soyad", BOM'lu
 * "\uFEFFad soyad" ve "Doğum Tarihi" hepsi aynı anahtara düşer.
 *
 * NEDEN: dışa aktarma yapan her yazılım başlığı başka türlü yazıyor. Eskiden
 * yalnızca boşluklu Türkçe başlıklar tanınıyordu; alt çizgili ("ad_soyad") ya
 * da BOM ile başlayan bir CSV'de hiçbir sütun eşleşmediği için dosya sessizce
 * "0 kayıt aktarıldı" ile geçiyordu.
 */
const TR_LOWER: Record<string, string> = {
  "İ": "i", "I": "i", "Ş": "s", "Ğ": "g", "Ü": "u", "Ö": "o", "Ç": "c",
  "ı": "i", "ş": "s", "ğ": "g", "ü": "u", "ö": "o", "ç": "c",
};

function normalizeKey(raw: string): string {
  return (raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/[İIŞĞÜÖÇışğüöç]/g, (c) => TR_LOWER[c] ?? c)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // birleşik aksan işaretleri (é → e)
    .replace(/[\s._\-/\\]+/g, " ")
    .trim();
}

const FIELDS = {
  full_name: ["ad soyad", "adsoyad", "ad ve soyad", "isim", "isim soyisim", "musteri adi", "musteri", "musteri ad soyad", "full name", "fullname", "customer name", "client name", "name", "ad"],
  phone: ["telefon", "telefon numarasi", "telefon no", "cep telefonu", "cep", "gsm", "tel", "phone", "phone number", "mobile", "mobil"],
  email: ["e posta", "eposta", "e mail", "email", "mail", "e posta adresi"],
  birth_date: ["dogum tarihi", "dogum", "dogum gunu", "birth date", "birthdate", "birthday", "dob"],
  notes: ["notlar", "not", "notes", "note", "aciklama", "description", "comment", "comments"],
  service_name: ["hizmet adi", "hizmet", "service name", "service", "islem", "ad", "name"],
  price: ["fiyat (₺)", "fiyat", "ucret", "tutar", "price", "amount"],
  duration: ["sure (dk)", "sure", "dakika", "duration", "duration minutes", "sure dakika"],
  category: ["kategori", "category", "category tag", "grup"],
  visit_count: ["toplam ziyaret", "ziyaret sayisi", "ziyaret", "toplam randevu", "randevu sayisi", "visit count", "visits", "total visits", "ziyaret adedi"],
  total_spend: ["toplam harcama tl", "toplam harcama", "toplam harcama (₺)", "harcama", "toplam ciro", "ciro", "total spend", "lifetime value", "ltv", "total spent"],
  last_visit: ["son ziyaret tarihi", "son ziyaret", "son randevu", "son islem tarihi", "son gelis", "last visit", "last visit at", "last appointment"],
} as const;

function pick(row: Row, field: keyof typeof FIELDS): string {
  for (const candidate of FIELDS[field]) {
    const value = row[candidate];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function hasColumn(keys: string[], field: keyof typeof FIELDS): boolean {
  return keys.some((k) => (FIELDS[field] as readonly string[]).includes(k));
}

/** Excel'in 1899-12-30 başlangıçlı gün sayacını takvim tarihine çevirir. */
function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 60000) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * "1982-03-24", "24.03.1982", "24/03/1982", Excel seri numarası ve ISO zaman
 * damgalarını yyyy-MM-dd'ye indirger. Tanınmayan değer null döner: tek bir
 * bozuk doğum tarihi yüzünden tüm aktarımın patlaması engellenir.
 */
function normalizeDate(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (iso) return buildDate(+iso[1], +iso[2], +iso[3]);

  const dmy = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/.exec(value);
  if (dmy) {
    const [, a, b, year] = dmy;
    // Türkiye'de gg.aa.yyyy standart; ABD biçimli aa/gg/yyyy dosyalar için
    // ilk parça 12'den büyükse gün, ikinci parça 12'den büyükse ay kabul edilir.
    let day = +a, month = +b;
    if (+a <= 12 && +b > 12) { month = +a; day = +b; }
    return buildDate(+year, month, day);
  }

  if (/^\d{5}(\.\d+)?$/.test(value)) return fromExcelSerial(parseFloat(value));

  return null;
}

/**
 * "1.250,00", "1,250.00", "1250", "₺1.250" → 1250. Türkçe biçimde nokta binlik
 * ayırıcıdır: düz parseFloat "1.250" fiyatını 1,25 TL'ye çevirirdi.
 * Tek ayırıcı varsa ve ardından tam 3 hane geliyorsa binlik kabul edilir —
 * "999.500" gibi değerler bu yüzden 999500 okunur (TR biçimi esas alınmıştır).
 */
function parseAmount(raw: string): number {
  const s = (raw || "").replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;

  if (lastComma > -1 && lastDot > -1) {
    const dec = Math.max(lastComma, lastDot);
    normalized = s.slice(0, dec).replace(/[.,]/g, "") + "." + s.slice(dec + 1);
  } else if (lastComma > -1 || lastDot > -1) {
    const idx = Math.max(lastComma, lastDot);
    const sep = lastComma > -1 ? "," : ".";
    const groups = s.split(sep).length - 1;
    normalized = groups > 1 || s.length - idx - 1 === 3
      ? s.replace(/[.,]/g, "")
      : s.replace(",", ".");
  } else {
    normalized = s;
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

/** "11", "11 ziyaret", "1.234" → tam sayı; anlamsız değerler alt/üst sınıra çekilir. */
function clampInt(raw: string, min: number, max: number): number {
  const value = Math.round(parseAmount(raw));
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) return null;
  // Takvimde olmayan gün ("31.02.1982") Postgres'te hata verip o partideki TÜM
  // müşterileri düşürürdü; böyle bir değer tarihsiz kaydedilir.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseCSV(text: string): Row[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Ayırıcıyı başlık satırındaki adet üzerinden seç: tek bir ";" içeren virgüllü
  // dosya eskiden yanlışlıkla noktalı virgülle bölünüyordu.
  const header = lines[0];
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of header) if (ch in counts) counts[ch as keyof typeof counts]++;
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",") as string;

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map((h) => normalizeKey(h.replace(/^"|"$/g, "")));
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]).map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.every((v) => !v)) continue;
    const row: Row = {};
    headers.forEach((h, idx) => { if (h) row[h] = values[idx] ?? ""; });
    rows.push(row);
  }

  return rows;
}

/** JSON/Excel'den gelen nesneleri, CSV satırlarıyla aynı biçime indirger. */
function objectsToRows(items: unknown[]): Row[] {
  const rows: Row[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row: Row = {};
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (value === null || value === undefined || typeof value === "object") continue;
      const k = normalizeKey(key);
      if (k) row[k] = String(value).trim();
    }
    if (Object.keys(row).length) rows.push(row);
  }
  return rows;
}

function readWorkbook(buffer: ArrayBuffer): Table[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheets = wb.SheetNames.map((name) => ({
    name,
    key: normalizeKey(name),
    rows: objectsToRows(
      XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "", raw: false }) as unknown[]
    ),
  })).filter((s) => s.rows.length > 0);

  if (sheets.length === 0) return [];

  // Kendi Excel çıktımızda "Personel" ve "Randevular" sayfaları da Ad Soyad +
  // Telefon içeriyor; adı eşleşen sayfa varsa yalnızca onlar işlenir, yoksa ilk
  // sayfa. Aksi halde personel listesi müşteri olarak içeri akardı.
  const named = sheets.filter((s) =>
    /musteri|customer|client|hizmet|service/.test(s.key)
  );
  const chosen = named.length > 0 ? named : [sheets[0]];
  return chosen.map((s) => ({ label: s.name, rows: s.rows }));
}

function readJson(text: string): Table[] {
  const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));

  if (Array.isArray(parsed)) return [{ label: "JSON", rows: objectsToRows(parsed) }];

  if (parsed && typeof parsed === "object") {
    // Kendi JSON dışa aktarmamız: { customers: [...], services: [...] }
    const tables: Table[] = [];
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      if (!/musteri|customer|client|hizmet|service/i.test(key)) continue;
      const rows = objectsToRows(value);
      if (rows.length) tables.push({ label: key, rows });
    }
    if (tables.length) return tables;
  }

  return [];
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });

  // Sunucuyu tek bir dev dosyayla meşgul etmeyi engelleyen üst sınırlar.
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Dosya çok büyük (en fazla 5 MB)." }, { status: 400 });
  }

  const name = (file.name || "").toLowerCase();
  let tables: Table[] = [];

  try {
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
      tables = readWorkbook(await file.arrayBuffer());
    } else if (name.endsWith(".json")) {
      tables = readJson(await file.text());
    } else {
      tables = [{ label: "CSV", rows: parseCSV(await file.text()) }];
    }
  } catch {
    return NextResponse.json(
      { error: "Dosya okunamadı. CSV, Excel (.xlsx) veya JSON dosyası yükleyin." },
      { status: 400 }
    );
  }

  tables = tables.filter((t) => t.rows.length > 0);
  const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0);
  if (totalRows > 20000) {
    return NextResponse.json(
      { error: "Dosyada 20.000'den fazla satır var. Lütfen parçalara bölerek yükleyin." },
      { status: 400 }
    );
  }
  if (tables.length === 0) {
    return NextResponse.json({ error: "Dosyada veri bulunamadı" }, { status: 400 });
  }

  const orgId = member.org_id;
  const today = new Date().toISOString().slice(0, 10);
  let imported = 0;
  let duplicates = 0;
  let skipped = 0;
  const types = new Set<string>();
  const detectedColumns = new Set<string>();
  let dbError: string | null = null;

  for (const table of tables) {
    const keys = Object.keys(table.rows[0]);
    keys.forEach((k) => detectedColumns.add(k));

    // Telefon sütunu olan sayfa müşteri listesidir; olmayan ama hizmet/fiyat/süre
    // sütunu taşıyan sayfa hizmet kataloğudur.
    const isCustomers = hasColumn(keys, "phone");
    const isServices = !isCustomers &&
      (hasColumn(keys, "service_name") || hasColumn(keys, "price") || hasColumn(keys, "duration"));

    if (isCustomers) {
      types.add("customers");
      const seen = new Set<string>();
      const payload: Record<string, unknown>[] = [];

      for (const row of table.rows) {
        const full_name = pick(row, "full_name");
        const phone = normalizePhone(pick(row, "phone"));
        // Telefon birincil anahtar (org_id, phone) olduğu için zorunlu.
        if (!full_name || phone.length < 10) { skipped++; continue; }
        if (seen.has(phone)) { duplicates++; continue; }
        seen.add(phone);

        // Geçmiş özeti "devir bakiyesi" olarak taşınır: eski yazılımdaki ziyaret
        // sayısı, toplam harcama ve son ziyaret tarihi.
        //
        // NEDEN taşınıyor: (1) skor cron'u puanı bu üç alandan hesaplıyor —
        // taşınmazsa 15 yıllık VIP müşteri panelde sıfır puanlı yeni müşteri
        // görünür; (2) kampanya segmenti "son ziyaret NULL" olanı da pasif
        // sayıyor, yani dün gelen müşteriye "sizi özledik" mesajı giderdi;
        // (3) {{son_ziyaret_gun}} değişkeni boş basılırdı.
        //
        // NEDEN sahte randevu üretilmiyor: tamamlanan randevu trigger'ı her
        // kayıt için expenses'a gelir yazıyor — geçmişi randevu olarak kurmak
        // ciroyu ikinci kez sayar, takvimi doldurur ve aylık randevu kotasını
        // yerdi. Bu alanlar müşteri kartında durur, Gelir/Gider raporuna girmez.
        const lastVisit = normalizeDate(pick(row, "last_visit"));

        payload.push({
          org_id: orgId,
          full_name,
          phone,
          email: pick(row, "email") || null,
          birth_date: normalizeDate(pick(row, "birth_date")),
          notes: pick(row, "notes") || null,
          visit_count: clampInt(pick(row, "visit_count"), 0, 10000),
          total_spend: Math.min(Math.max(parseAmount(pick(row, "total_spend")), 0), 100_000_000),
          // Gelecek tarihli "son ziyaret" skorlamadaki yakınlık puanını bozar.
          last_visit_at: lastVisit && lastVisit <= today ? `${lastVisit}T12:00:00Z` : null,
          source: "migration",
        });
      }

      for (let i = 0; i < payload.length; i += 200) {
        const chunk = payload.slice(i, i + 200);
        const { data, error } = await supabase
          .from("customers")
          .upsert(chunk, { onConflict: "org_id,phone", ignoreDuplicates: true })
          .select("id");
        if (error) {
          dbError ??= error.message;
          skipped += chunk.length;
          continue;
        }
        // ignoreDuplicates ile yalnızca GERÇEKTEN eklenen satırlar döner;
        // kalanı zaten kayıtlı müşterilerdir.
        imported += data?.length ?? 0;
        duplicates += chunk.length - (data?.length ?? 0);
      }
    } else if (isServices) {
      types.add("services");
      const seen = new Set<string>();
      const payload: Record<string, unknown>[] = [];

      for (const row of table.rows) {
        const svcName = pick(row, "service_name");
        if (!svcName) { skipped++; continue; }
        const key = svcName.toLowerCase();
        if (seen.has(key)) { duplicates++; continue; }
        seen.add(key);

        const price = parseAmount(pick(row, "price"));
        const duration = parseInt(pick(row, "duration").replace(/[^\d]/g, ""), 10);

        payload.push({
          org_id: orgId,
          name: svcName,
          price,
          duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : 30,
          category_tag: pick(row, "category") || "genel",
          description: pick(row, "notes") || null,
          is_active: true,
          contributes_loyalty: true,
        });
      }

      for (let i = 0; i < payload.length; i += 200) {
        const chunk = payload.slice(i, i + 200);
        const { data, error } = await supabase
          .from("services")
          .upsert(chunk, { onConflict: "org_id,name", ignoreDuplicates: false })
          .select("id");
        if (error) {
          dbError ??= error.message;
          skipped += chunk.length;
          continue;
        }
        imported += data?.length ?? 0;
      }
    } else {
      skipped += table.rows.length;
    }
  }

  if (imported === 0 && duplicates === 0) {
    // Sessiz "0 kayıt aktarıldı" yerine hangi sütunları gördüğümüzü söyle:
    // kullanıcı dosyasını neye göre düzelteceğini böylece anlayabiliyor.
    const columns = [...detectedColumns].slice(0, 12).join(", ");
    return NextResponse.json(
      {
        error: dbError
          ? `Kayıt eklenemedi: ${dbError}`
          : `Dosyada "Ad Soyad" ve "Telefon" sütunları bulunamadı. Bulunan sütunlar: ${columns || "—"}`,
        detected: [...detectedColumns],
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    imported,
    duplicates,
    skipped,
    type: types.has("customers") ? "customers" : "services",
    warning: dbError,
  });
}
