import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const root = process.cwd();
const rawSource = path.join(root, "public/brand/app-icon.png");
const iconsDir = path.join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

const NAVY = "#0a1c4a";

async function buildFullBleed() {
  // Kaynak görselde lacivert kare, beyaz bir tuval içinde yuvarlatılmış köşelerle
  // duruyor (Windows/Android'de kısayol ikonunun kenarları beyaz görünmesine
  // sebep oluyordu). Önce karenin dış sınırına, sonra köşe yuvarlamasının
  // beyaz üçgenlerini de kesecek kadar içeri kırpıyoruz — sonuçta kenardan
  // kenara %100 lacivert dolu bir kare kalıyor, yuvarlatmayı işletim sistemi
  // kendi ikon maskesiyle uyguluyor.
  const tight = await sharp(rawSource)
    .extract({ left: 77, top: 69, width: 1099, height: 1107 })
    .toBuffer();
  const fullBleed = await sharp(tight)
    .extract({ left: 90, top: 90, width: 1099 - 180, height: 1107 - 180 })
    .resize(1024, 1024, { fit: "cover" })
    .toBuffer();
  writeFileSync(path.join(root, "public/brand/app-icon-full-bleed.png"), fullBleed);
  return fullBleed;
}

async function buildMarkOnly(fullBleed) {
  // Metinsiz amblem — küçük favicon/UI logosu boyutlarında "SiriPlan BY
  // Sirius" yazısı okunaksız kaldığı için ayrı bir kırpım.
  const emblem = await sharp(fullBleed)
    .extract({ left: 0, top: 0, width: 1024, height: 700 })
    .toBuffer();
  return sharp(emblem).resize(512, 512, { fit: "contain", background: NAVY }).toBuffer();
}

async function main() {
  const fullBleed = await buildFullBleed();
  const markOnly = await buildMarkOnly(fullBleed);

  await sharp(markOnly).resize(256, 256).png().toFile(path.join(iconsDir, "icon-mark.png"));
  console.log("icon-mark.png");

  for (const size of [16, 32]) {
    await sharp(markOnly)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`icon-${size}x${size}.png (mark-only)`);
  }

  for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
    await sharp(fullBleed)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`icon-${size}x${size}.png`);
  }

  await sharp(fullBleed)
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: NAVY })
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));
  console.log("apple-touch-icon.png");

  // Basit çok boyutlu ICO (16/32/48) — PNG-in-ICO yöntemi, modern
  // tarayıcılar ve Windows Vista+ tarafından destekleniyor.
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    icoSizes.map((s) => sharp(markOnly).resize(s, s, { fit: "cover" }).ensureAlpha().png().toBuffer())
  );

  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * icoSizes.length;
  let offset = dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icoSizes.length, 4);

  const entries = [];
  pngBuffers.forEach((buf, i) => {
    const size = icoSizes[i];
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    entries.push(entry);
  });

  const ico = Buffer.concat([header, ...entries, ...pngBuffers]);
  writeFileSync(path.join(root, "src/app/favicon.ico"), ico);
  console.log("favicon.ico");
}

main();
