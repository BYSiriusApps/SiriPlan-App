/**
 * Sesli stok komutu için YEREL (AI'sız) ayrıştırıcı.
 *
 * `/api/ai/voice-booking` önce Gemini'yi dener; anahtar yoksa, Gemini hata
 * verirse ya da `manage_inventory` çağrısı üretmezse bu ayrıştırıcı devreye
 * girer. Sesli randevu ayrıştırıcısıyla (`voice-parse.ts`) aynı yardımcıları
 * (deburr / tokenSimilar / wordsToNumber) paylaşır.
 *
 * Tasarım: ürün adını mevcut stok listesine göre eşler, miktarı ve yönü
 * (giriş / çıkış / sayım) çıkarır. Emin olamazsa `matched: false` döner —
 * çağıran o zaman kullanıcıyı stok ekranına yönlendirir.
 */
import { deburr, tokenSimilar, wordsToNumber } from "@/lib/voice-parse";

export interface VoiceInventoryItem {
  id: string;
  name: string;
  unit?: string | null;
}

export interface ParsedInventoryCommand {
  item_id: string;
  item_name: string;
  /** "in" = stok girişi, "out" = kullanım/satış, "adjust" = sayım/düzeltme */
  type: "in" | "out" | "adjust";
  quantity: number;
  matched: boolean;
}

/** "3", "on beş" → sayı. Bulunamazsa null. */
function extractQuantity(norm: string): number | null {
  const digit = norm.match(/\b(\d{1,4})\b/);
  if (digit) return Number(digit[1]);

  const tokens = norm.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    const n = wordsToNumber(tokens.slice(i, i + 3));
    if (n !== null && n > 0) return n;
  }
  return null;
}

/** Stok listesinden metne en iyi uyan ürünü bulur (belirsizse null). */
function matchItem(norm: string, items: VoiceInventoryItem[]): VoiceInventoryItem | null {
  const normToks = norm.split(" ").filter((t) => t.length >= 2);
  const scored: { item: VoiceInventoryItem; score: number; full: string }[] = [];

  for (const item of items) {
    const full = deburr(item.name);
    if (!full) continue;
    const toks = full.split(" ").filter((t) => t.length >= 2 && t !== "ve" && t !== "ile");
    if (!toks.length) continue;

    let matched = 0;
    for (const st of toks) {
      if (normToks.some((nt) => tokenSimilar(nt, st))) matched++;
    }
    if (!matched) continue;

    let score = matched / toks.length;
    if (norm.includes(full)) score += 1;
    scored.push({ item, score, full });
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score || b.full.length - a.full.length);

  const [top, second] = scored;
  if (top.score >= 1) return top.item;
  if (second && top.score - second.score < 0.25) return null; // belirsiz
  if (top.score >= 0.5) return top.item;
  return null;
}

const OUT_RE = /\bcikis\b|\bcikti\b|kullan|harca|\bbitti\b|\bazalt\b|\bdusur\b|\bdus\b|\bsat\b|satti|satil|\bgitti\b|\beksilt\b|tuketil|\bverdim\b|\bverildi\b/;
const IN_RE = /\bgiris\b|\bgirdi\b|\bgeldi\b|\baldim\b|satin al|\beklendi\b|\bekle\b|\bartir\b|\btedarik\b|\bstok girisi\b/;
const ADJUST_RE = /\bsayim\b|\bduzelt\b|duzeltme|\bguncelle\b|\bkaldi\b|\boldu\b|\bmevcut\b|\bsayimi\b/;

/**
 * Metinden stok komutunu çıkarır.
 * Varsayılan yön `out` — salon günlük kullanımında en sık senaryo.
 */
export function parseVoiceInventory(
  transcript: string,
  items: VoiceInventoryItem[],
): ParsedInventoryCommand {
  const norm = deburr(transcript);

  const item = matchItem(norm, items);
  const qty = extractQuantity(norm);

  let type: "in" | "out" | "adjust" = "out";
  if (ADJUST_RE.test(norm)) type = "adjust";
  else if (IN_RE.test(norm)) type = "in";
  else if (OUT_RE.test(norm)) type = "out";

  return {
    item_id: item?.id ?? "",
    item_name: item?.name ?? "",
    type,
    quantity: qty ?? 1,
    matched: !!item && qty !== null,
  };
}
