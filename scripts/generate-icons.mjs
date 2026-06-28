/**
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install sharp (dev)
 *
 * Converts public/icons/icon.svg → multiple PNG sizes needed for PWA manifest
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  let sharp;
  try {
    const req = createRequire(import.meta.url);
    sharp = req("sharp");
  } catch {
    console.error("❌  'sharp' is not installed. Run: npm install --save-dev sharp");
    process.exit(1);
  }

  const svgBuffer = readFileSync(join(root, "public/icons/icon.svg"));

  for (const size of sizes) {
    const outPath = join(root, `public/icons/icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✅  Generated ${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const applePath = join(root, "public/icons/apple-touch-icon.png");
  await sharp(svgBuffer).resize(180, 180).png().toFile(applePath);
  console.log("✅  Generated apple-touch-icon.png");

  console.log("\n🎉 All icons generated!");
}

run().catch(console.error);
