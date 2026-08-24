/**
 * Çeviri anahtarı denetimi — `node scripts/i18n-audit.mjs`
 *
 * NEDEN GEREKLİ: next-intl eksik anahtarda HATA FIRLATMAZ; `getMessageFallback`
 * ile anahtarın YOLUNU string olarak döndürür. Yani panelde
 * "dashboard.randevularPage.sortNewest" gibi ham metinler görünür ve hiçbir
 * derleme/tip hatası oluşmaz. `t.raw()` dizi beklenen bir yerde bunu yaparsa
 * string index'lenir ve tek harfler basılır.
 *
 * İKİ AYRI KONTROL, İKİSİ DE ŞART:
 *   1. Bu betik — KOD'da çağrılan anahtarları dört dile karşı doğrular.
 *   2. Diller arası parite — tr'yi referans alıp en/ru/ar'da eksik/fazla arar.
 *
 * Parite tek başına YETMEZ: bir anahtar dört dilde birden eksikse parite temiz
 * görünür. 2026-08-24'te RandevularFilters'ın 5 anahtarı tam olarak böyle
 * kaçtı ve Türkçe dahil her dilde ham metin basıyordu.
 *
 * Panel veya pazarlama i18n'ine dokunan her işten sonra çalıştırın.
 * Üçüncü tamamlayıcı kontrol: `next start` logunda MISSING_MESSAGE araması —
 * sayfa gerçekten render edilince ortaya çıkanları yakalar.
 */
import fs from "node:fs";
import path from "node:path";

const LOCALES = ["tr", "en", "ru", "ar"];
const REFERENCE = "tr";

const msgs = {};
for (const l of LOCALES) {
  msgs[l] = JSON.parse(fs.readFileSync(`messages/${l}.json`, "utf8").replace(/^﻿/, ""));
}

function has(locale, dotted) {
  let cur = msgs[locale];
  for (const k of dotted.split(".")) {
    if (cur && typeof cur === "object" && k in cur) cur = cur[k];
    else return false;
  }
  return true;
}

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v) ? flatten(v, key) : [key];
  });
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
})("src");

const problems = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");

  // Hangi değişken hangi namespace'i taşıyor?
  const vars = {};
  const withNs =
    /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:getTranslations|useTranslations)\(\s*["'`]([^"'`]*)["'`]\s*\)/g;
  let m;
  while ((m = withNs.exec(src))) vars[m[1]] = m[2];
  const noNs = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:getTranslations|useTranslations)\(\s*\)/g;
  while ((m = noNs.exec(src))) vars[m[1]] = "";

  for (const [v, ns] of Object.entries(vars)) {
    // t("x") / t.rich("x") / t.raw("x") / t.markup("x")
    // Şablon değişkeni içeren anahtarlar (`pricing.${key}.features`) atlanır.
    const call = new RegExp(`\\b${v}(?:\\.rich|\\.raw|\\.markup)?\\(\\s*["']([^"']+)["']`, "g");
    let c;
    while ((c = call.exec(src))) {
      const key = c[1];
      if (key.includes("${") || key.includes("{")) continue;
      const full = ns ? `${ns}.${key}` : key;
      const missing = LOCALES.filter((l) => !has(l, full));
      if (missing.length) problems.push({ file: file.replace(/\\/g, "/"), key: full, missing });
    }
  }

  // Anahtarın ADI bir veri yapısında durup sonra `t(item.tKey)` ile çağrıldığı
  // kalıp (Sidebar/MobileNav'daki nav dizileri). Düz `t("...")` araması bunları
  // GÖRMEZ — `dashboard.stock` tam olarak böyle kaçtı ve kenar çubuğunda ham
  // anahtar yolu göründü.
  const nsList = [...new Set(Object.values(vars))].filter(Boolean);
  if (nsList.length === 1) {
    const ns = nsList[0];
    const tKeyRe = /\btKey\s*:\s*["']([^"']+)["']/g;
    let k;
    while ((k = tKeyRe.exec(src))) {
      const full = `${ns}.${k[1]}`;
      const missing = LOCALES.filter((l) => !has(l, full));
      if (missing.length) problems.push({ file: file.replace(/\\/g, "/"), key: full, missing });
    }
  }
}

const seen = new Set();
const uniq = problems.filter((p) => {
  const id = `${p.file}|${p.key}`;
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
});

let failed = false;

console.log(`[1/2] Kodda çağrılan ama çevirilerde bulunmayan anahtar: ${uniq.length}`);
const allLocales = uniq.filter((p) => p.missing.length === LOCALES.length);
const someLocales = uniq.filter((p) => p.missing.length < LOCALES.length);
if (allLocales.length) {
  failed = true;
  console.log(`\n  -- HİÇBİR DİLDE YOK (${allLocales.length}) --`);
  for (const p of allLocales) console.log(`     ${p.key}\n        ${p.file}`);
}
if (someLocales.length) {
  failed = true;
  console.log(`\n  -- BAZI DİLLERDE YOK (${someLocales.length}) --`);
  for (const p of someLocales) console.log(`     ${p.key}  [yok: ${p.missing.join(",")}]\n        ${p.file}`);
}

const refKeys = new Set(flatten(msgs[REFERENCE]));
console.log(`\n[2/2] Diller arası parite (referans: ${REFERENCE}, ${refKeys.size} anahtar)`);
for (const l of LOCALES.filter((x) => x !== REFERENCE)) {
  const keys = new Set(flatten(msgs[l]));
  const missing = [...refKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !refKeys.has(k));
  const ok = missing.length === 0 && extra.length === 0;
  if (!ok) failed = true;
  console.log(`  ${l}: ${keys.size} anahtar, eksik=${missing.length}, fazla=${extra.length}${ok ? "" : "  <<<"}`);
  for (const k of missing.slice(0, 15)) console.log(`     EKSİK  ${k}`);
  for (const k of extra.slice(0, 15)) console.log(`     FAZLA  ${k}`);
}

console.log(failed ? "\nSONUÇ: BAŞARISIZ" : "\nSONUÇ: TEMİZ");
process.exit(failed ? 1 : 0);
