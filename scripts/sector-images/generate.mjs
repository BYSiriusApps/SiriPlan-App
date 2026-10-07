/**
 * Ana sayfa sektör vitrini (SectorShowcase, 4:5 portre) için mutlu esnaf fotoğrafları —
 * Gemini ile üretir, sharp ile 800x1000 jpg'e çevirip public/sectors/ altına yazar.
 * Var olan dosyayı atlar.
 *   node scripts/sector-images/generate.mjs [--force]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "sectors");
const MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const force = process.argv.includes("--force");

const STYLE = "Candid, warm, bright natural-light lifestyle photograph, shallow depth of field, genuinely smiling happy people, modern clean interior, rich warm colors, portrait composition with faces in the upper half, photorealistic, no text, no signs, no logos, no watermark, no phone screens.";
const SHOTS = {
  kuafor: "A cheerful female hairdresser laughing while blow-drying a smiling client's glossy long hair in a bright modern hair salon.",
  "guzellik-bakim": "A happy beauty salon owner giving a facial treatment to a relaxed smiling client in a soft pink beauty studio.",
  nail: "A cheerful nail artist painting a smiling client's nails with colorful polish in a trendy nail studio.",
  estetik: "A friendly smiling female aesthetic clinic doctor in a white coat talking warmly with a happy patient in a modern bright aesthetic clinic.",
  "dis-klinigi": "A smiling dentist in scrubs and a happy patient giving a thumbs up in a bright modern dental clinic.",
  kas: "A smiling lash and brow artist working on a relaxed client's eyebrows in a clean bright brow and lash studio.",
  petkuafor: "A happy pet groomer holding a fluffy smiling dog after a haircut in a bright pet grooming salon.",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gen(prompt, attempt = 1) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:5" } } }),
  });
  if ((res.status === 429 || res.status >= 500) && attempt <= 5) { await sleep(attempt * 20000); return gen(prompt, attempt + 1); }
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  const part = (json.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) throw new Error("görsel dönmedi: " + (json.candidates?.[0]?.finishReason || "?"));
  return Buffer.from(part.inlineData.data, "base64");
}

for (const [name, shot] of Object.entries(SHOTS)) {
  const file = path.join(OUT, `${name}.jpg`);
  if (!force && fs.existsSync(file)) { console.log("atla", name); continue; }
  try {
    const buf = await gen(`${shot} ${STYLE}`);
    await sharp(buf).resize(800, 1000, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(file);
    console.log("tamam", name);
  } catch (e) { console.error("HATA", name, e.message); }
}
