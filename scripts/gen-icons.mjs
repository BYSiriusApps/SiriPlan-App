import sharp from "sharp";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";

const root = process.cwd();
const source = path.join(root, "public/brand/app-icon.png");
const iconsDir = path.join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

async function buildMarkOnly() {
  // Kırpılmış, sadece amblem (metinsiz) kare — küçük favicon boyutlarında
  // "SiriPlan BY Sirius" yazısı okunaksız kaldığı için ayrı bir varyant.
  const emblem = await sharp(source)
    .extract({ left: 150, top: 150, width: 950, height: 600 })
    .toBuffer();
  return sharp(emblem).resize(512, 512, { fit: "contain", background: "#0a1c4a" }).toBuffer();
}

async function main() {
  const markOnly = await buildMarkOnly();

  // Kalıcı metinsiz amblem — Sidebar/Navbar/Auth gibi küçük UI yuvalarında
  // tam logo (yazılı) yerine bu kullanılır, tekrar üretmeye gerek kalmasın.
  await sharp(markOnly).resize(256, 256).png().toFile(path.join(iconsDir, "icon-mark.png"));
  console.log("icon-mark.png");

  // Küçük boyutlar (sekme/favicon) → sadece amblem
  for (const size of [16, 32]) {
    await sharp(markOnly)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`icon-${size}x${size}.png (mark-only)`);
  }

  // Büyük boyutlar (ana ekran/PWA) → tam logo (metinli)
  for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
    await sharp(source)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`icon-${size}x${size}.png`);
  }

  await sharp(source)
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: "#0a1c4a" })
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

  rmSync(path.join(root, "public/brand/_test-crop.png"), { force: true });
  rmSync(path.join(root, "public/brand/_test-crop2.png"), { force: true });
  rmSync(path.join(root, "public/brand/_mark-only.png"), { force: true });
  rmSync(path.join(root, "public/brand/_mark-only2.png"), { force: true });
  rmSync(path.join(root, "public/brand/_test32.png"), { force: true });
}

main();
