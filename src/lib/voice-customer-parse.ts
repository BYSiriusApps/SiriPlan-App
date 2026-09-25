/**
 * "Müşteri Ekle" sayfasındaki mikrofon için YEREL (AI'sız) ayrıştırıcı.
 *
 * `voice-parse.ts`teki randevu ayrıştırıcısı isim sınırını hizmet/personel
 * adlarına göre çizer — burada öyle bir bağlam yok, yalnızca isim + telefon
 * var. Bu yüzden ayrı, daha sade bir ayrıştırıcı: Gemini'ye gerek kalmadan
 * tarayıcıda anında çalışır.
 */
import { deburr, dedupeAdjacentWords, parsePhone, PHONE_RE } from "@/lib/voice-parse";

/** İsim tahmininde durak kabul edilen doldurucu kelimeler. */
const STOP = new Set([
  "musteri", "musterinin", "musteriyi", "musteriye", "ekle", "kaydet", "yeni",
  "isim", "ismi", "adi", "ad", "soyadi", "soyadini", "telefon", "telefonu",
  "numara", "numarasi", "numaram", "cep", "eposta", "e-posta", "mail", "mailim",
  "not", "notlar", "lutfen", "olustur",
]);

/** Cümle başında geçip isme dahil edilmeyen kelimeler ("müşteri Ahmet" → "Ahmet"). */
const LEAD_IN = new Set(["musteri", "isim", "ismi", "adi", "ad", "sayin"]);

function titleCase(name: string): string {
  return dedupeAdjacentWords(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}

function guessName(withoutPhone: string): string {
  const kept: string[] = [];
  for (const word of withoutPhone.trim().split(/\s+/)) {
    const n = deburr(word);
    if (!n) continue;
    if (kept.length === 0 && LEAD_IN.has(n)) continue;
    if (/\d/.test(word)) break;
    if (STOP.has(n)) break;
    kept.push(word.replace(/[.,;:!?]+$/, ""));
    if (kept.length >= 3) break;
  }
  while (kept.length && deburr(kept[kept.length - 1]).length <= 1) kept.pop();
  const name = kept.join(" ").trim();
  if (name.replace(/\s/g, "").length < 3) return "";
  return titleCase(name);
}

export interface ParsedVoiceCustomer {
  full_name: string;
  phone: string;
  missing: string[];
}

export function parseVoiceCustomer(transcript: string): ParsedVoiceCustomer {
  const phone = parsePhone(transcript);
  const withoutPhone = transcript.replace(new RegExp(PHONE_RE, "g"), " ").replace(/\b0?5\d{9}\b/g, " ");
  const full_name = guessName(withoutPhone);

  const missing: string[] = [];
  if (!full_name) missing.push("full_name");
  if (!phone) missing.push("phone");

  return { full_name, phone, missing };
}
