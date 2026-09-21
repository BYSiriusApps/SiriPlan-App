// Play Store promosyon görsellerini (1080x1920) Apple App Store Connect'in
// 2026'da zorunlu tuttuğu tek iPhone boyutuna (6.9" = 1320x2868) dönüştürür.
// Kaynak: docs/sosyal-medya/2026-09-app-tanitim-gorselleri/playstore/
// Çıktı:  docs/app-store/screenshots/
//
// Yaklaşım: genişliği 1320'ye ölçekle (orantılı, bozulma yok), yüksekliği
// 2868'e tamamlamak için üst/alt kenar renklerini örnekleyip o renkle pad'le
// (görseller zaten üstte/altta düz degrade arka plan bırakıyor, dikiş görünmez).

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.resolve(
  "docs/sosyal-medya/2026-09-app-tanitim-gorselleri/playstore"
);
const OUT_DIR = path.resolve("docs/app-store/screenshots");

const TARGET_W = 1320;
const TARGET_H = 2868;

// Tam satırı ortalamak yanıltıyor: telefon mockup'ı satırın büyük kısmını
// kaplayabiliyor (beyaz kart / siyah çerçeve), gerçek arka plan yalnızca en
// kenarlarda (sol/sağ ~40px) görünüyor. Bu yüzden sadece kenar şeritlerinden
// örnekliyoruz.
async function edgeColor(filePath, width, height, y) {
  const margin = 40;
  const stripH = 3;
  const top = Math.max(0, Math.min(y, height - stripH));
  const left = await sharp(filePath)
    .extract({ left: 0, top, width: margin, height: stripH })
    .raw()
    .toBuffer();
  const right = await sharp(filePath)
    .extract({ left: width - margin, top, width: margin, height: stripH })
    .raw()
    .toBuffer();
  const data = Buffer.concat([left, right]);
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

  const scale = TARGET_W / meta.width;
  const resizedH = Math.round(meta.height * scale);

  const resizedBuffer = await sharp(srcPath)
    .resize(TARGET_W, resizedH)
    .flatten({ background: "#ffffff" })
    .toBuffer();

  // Renk örneklemesini orijinal (yeniden boyutlanmamış) dosyadan yapıyoruz —
  // düzgün ölçekleme renk değerini değiştirmez, sadece boyutu değiştirir.
  const top = await edgeColor(srcPath, meta.width, meta.height, 0);
  const bottom = await edgeColor(
    srcPath,
    meta.width,
    meta.height,
    meta.height - 1
  );

  const totalPad = TARGET_H - resizedH;
  const padTop = Math.floor(totalPad / 2);
  const padBottom = totalPad - padTop;

  // Üst ve alt pad'i ayrı ayrı kendi kenar rengiyle oluşturup birleştiriyoruz
  // (tek renkle extend etmek üst/alt farklı tonlarda dikiş bırakırdı).
  const topPad = await sharp({
    create: {
      width: TARGET_W,
      height: padTop,
      channels: 3,
      background: top,
    },
  })
    .png()
    .toBuffer();

  const bottomPad = await sharp({
    create: {
      width: TARGET_W,
      height: padBottom,
      channels: 3,
      background: bottom,
    },
  })
    .png()
    .toBuffer();

  const outName = file
    .replace("play-store-promo-", "app-store-")
    .replace("-1080x1920.png", `-${TARGET_W}x${TARGET_H}.png`);
  const outPath = path.join(OUT_DIR, outName);

  await sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 3,
      background: top,
    },
  })
    .composite([
      { input: topPad, top: 0, left: 0 },
      { input: resizedBuffer, top: padTop, left: 0 },
      { input: bottomPad, top: padTop + resizedH, left: 0 },
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
