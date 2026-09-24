// Play Store promosyon görsellerini (1080x1920) Apple App Store Connect'in
// iPad 13" Display kategorisi için zorunlu tuttuğu boyuta (2064x2752) dönüştürür.
// Kaynak: docs/sosyal-medya/2026-09-app-tanitim-gorselleri/playstore/
// Çıktı:  docs/app-store/screenshots-ipad/
//
// Yaklaşım: iPhone versiyonundan farklı olarak burada en/boy oranı ters yönde
// (iPad daha "kare"ye yakın) — bu yüzden yüksekliğe göre ölçekleyip sağ/sol
// kenarları (pillarbox) kenar rengiyle dolduruyoruz.

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.resolve(
  "docs/sosyal-medya/2026-09-app-tanitim-gorselleri/playstore"
);
const OUT_DIR = path.resolve("docs/app-store/screenshots-ipad");

const TARGET_W = 2064;
const TARGET_H = 2752;

// Mockup görselin merkezini kaplıyor, sol/sağ ~40px her zaman arka plan —
// bu şeridi tüm yükseklik boyunca örnekleyip ortalama rengi alıyoruz.
async function sideColor(filePath, width, height, fromLeft) {
  const margin = 40;
  const left = fromLeft ? 0 : width - margin;
  const data = await sharp(filePath)
    .extract({ left, top: 0, width: margin, height })
    .raw()
    .toBuffer();
  let r = 0,
    g = 0,
    b = 0;
  const n = data.length / 3;
  for (let i = 0; i < n; i++) {
    r += data[i * 3];
    g += data[i * 3 + 1];
    b += data[i * 3 + 2];
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

async function convertOne(file) {
  const srcPath = path.join(SRC_DIR, file);
  const meta = await sharp(srcPath).metadata();

  const scale = TARGET_H / meta.height;
  const resizedW = Math.round(meta.width * scale);

  const resizedBuffer = await sharp(srcPath)
    .resize(resizedW, TARGET_H)
    .flatten({ background: "#ffffff" })
    .toBuffer();

  const left = await sideColor(srcPath, meta.width, meta.height, true);
  const right = await sideColor(srcPath, meta.width, meta.height, false);

  const totalPad = TARGET_W - resizedW;
  const padLeft = Math.floor(totalPad / 2);
  const padRight = totalPad - padLeft;

  const leftPad = await sharp({
    create: {
      width: padLeft,
      height: TARGET_H,
      channels: 3,
      background: left,
    },
  })
    .png()
    .toBuffer();

  const rightPad = await sharp({
    create: {
      width: padRight,
      height: TARGET_H,
      channels: 3,
      background: right,
    },
  })
    .png()
    .toBuffer();

  const outName = file
    .replace("play-store-promo-", "app-store-ipad-")
    .replace("-1080x1920.png", `-${TARGET_W}x${TARGET_H}.png`);
  const outPath = path.join(OUT_DIR, outName);

  await sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 3,
      background: left,
    },
  })
    .composite([
      { input: leftPad, top: 0, left: 0 },
      { input: resizedBuffer, top: 0, left: padLeft },
      { input: rightPad, top: 0, left: padLeft + resizedW },
    ])
    .png()
    .toFile(outPath);

  console.log(`${file} -> ${outName} (${TARGET_W}x${TARGET_H})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(SRC_DIR)).filter(
    (f) => f.startsWith("play-store-promo-") && f.endsWith(".png")
  );
  files.sort();
  for (const f of files) {
    await convertOne(f);
  }
  console.log(`\n${files.length} görsel dönüştürüldü -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
