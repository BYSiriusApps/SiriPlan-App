/**
 * Demo salonların görsellerini Gemini ile üretir, scripts/demo-assets/generated/ altına yazar.
 *
 * Yeniden çalıştırılabilir: daha önce üretilmiş dosyayı atlar, sadece eksikleri üretir.
 * Kota (429) durumunda bekleyip tekrar dener; ısrarla başarısız olanları rapor eder.
 *
 *   node scripts/demo-assets/generate-assets.mjs            -> eksikleri üret
 *   node scripts/demo-assets/generate-assets.mjs --only demo-cover
 *   node scripts/demo-assets/generate-assets.mjs --force    -> hepsini yeniden üret
 */
import fs from "node:fs";
import path from "node:path";
import { ASSETS } from "./assets-manifest.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "scripts", "demo-assets", "generated");
const MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
if (!KEY) { console.error("GEMINI_API_KEY yok"); process.exit(1); }

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(asset, attempt = 1) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: asset.prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: asset.aspectRatio },
        },
      }),
    }
  );

  if (res.status === 429 || res.status >= 500) {
    if (attempt > 5) throw new Error(`${res.status} — 5 denemede geçilemedi`);
    const body = await res.json().catch(() => ({}));
    const retry = Number(String(body?.error?.message || "").match(/retry in ([\d.]+)s/i)?.[1]) || attempt * 20;
    console.log(`   ${res.status} — ${Math.ceil(retry)}s bekleniyor (deneme ${attempt}/5)`);
    await sleep(Math.ceil(retry) * 1000 + 1000);
    return generate(asset, attempt + 1);
  }

  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);

  const part = (json.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) {
    const reason = json.candidates?.[0]?.finishReason || "bilinmiyor";
    throw new Error(`görsel dönmedi (finishReason: ${reason})`);
  }
  return Buffer.from(part.inlineData.data, "base64");
}

const targets = ASSETS.filter((a) => !only || a.id === only);
const failed = [];
let made = 0, skipped = 0;

for (const asset of targets) {
  const file = path.join(OUT_DIR, `${asset.id}.png`);
  if (!force && fs.existsSync(file) && fs.statSync(file).size > 10_000) { skipped++; continue; }
  process.stdout.write(`→ ${asset.id} (${asset.aspectRatio}) ... `);
  try {
    const buf = await generate(asset);
    fs.writeFileSync(file, buf);
    made++;
    console.log(`OK ${(buf.length / 1024).toFixed(0)}KB`);
  } catch (e) {
    failed.push({ id: asset.id, error: String(e.message || e) });
    console.log(`HATA: ${e.message}`);
  }
}

console.log(`\nÜretilen: ${made} | Atlanan: ${skipped} | Hatalı: ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(`  ✗ ${f.id}: ${f.error}`);
  process.exitCode = 1;
}
