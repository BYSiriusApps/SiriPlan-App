/**
 * /indir sayfasının sektör görselleri (mutlu esnaf) — Gemini ile üretir, sharp ile
 * 640x640 webp'e çevirip public/indir/ altına yazar. Var olan dosyayı atlar.
 *   node scripts/indir-images/generate.mjs [--force]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "indir");
const MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const force = process.argv.includes("--force");

const STYLE = "Candid, warm, bright natural-light lifestyle photograph, shallow depth of field, genuinely smiling happy small-business owner proudly working in their own shop, modern and clean interior, rich warm colors, photorealistic, no text, no logos, no watermark, no phone screens.";
const SHOTS = {
  kuafor: "A cheerful female hairdresser laughing while styling a client's long wavy hair in a bright modern hair salon.",
  berber: "A smiling male barber in an apron giving a classic haircut to a happy customer in a stylish barbershop.",
  guzellik: "A happy beauty salon owner doing a facial treatment on a relaxed smiling client in a soft pink beauty studio.",
  spa: "A smiling spa therapist giving a hot stone massage in a calm warm spa room with candles and plants.",
  makyaj: "A joyful makeup artist applying makeup to a laughing woman in front of a ring-light mirror in a makeup studio.",
  tattoo: "A friendly tattoo artist smiling at a delighted customer while working in a bright clean tattoo studio.",
  diyetisyen: "A smiling dietitian showing a colorful healthy meal plan to a happy client in a bright consultation room.",
  nail: "A cheerful nail artist painting a client's nails with colorful polish, both smiling, in a trendy nail salon.",
  petkuafor: "A happy pet groomer grooming a fluffy smiling dog in a bright pet grooming salon.",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gen(prompt, attempt = 1) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } }),
  });
  if ((res.status === 429 || res.status >= 500) && attempt <= 5) { await sleep(attempt * 20000); return gen(prompt, attempt + 1); }
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  const part = (json.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) throw new Error("görsel dönmedi: " + (json.candidates?.[0]?.finishReason || "?"));
  return Buffer.from(part.inlineData.data, "base64");
}

for (const [name, shot] of Object.entries(SHOTS)) {
  const file = path.join(OUT, `${name}.webp`);
  if (!force && fs.existsSync(file)) { console.log("atla", name); continue; }
  try {
    const buf = await gen(`${shot} ${STYLE}`);
    await sharp(buf).resize(640, 640, { fit: "cover" }).webp({ quality: 80 }).toFile(file);
    console.log("tamam", name);
  } catch (e) { console.error("HATA", name, e.message); }
}
