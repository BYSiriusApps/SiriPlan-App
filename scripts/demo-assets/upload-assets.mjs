/**
 * scripts/demo-assets/generated/ altındaki görselleri Supabase Storage'a yükler ve
 * ilgili veritabanı satırlarını günceller.
 *
 * Tekrar çalıştırmak güvenlidir: aynı yollara upsert eder, galeri satırlarını
 * kategori bazında sıfırlayıp yeniden yazar (aynı fotoğraf iki kez eklenmez).
 * Üretilmemiş görseller sessizce atlanır — kısmi üretimden sonra da çalışır.
 *
 *   node scripts/demo-assets/upload-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ASSETS } from "./assets-manifest.mjs";

const ROOT = process.cwd();
const GEN_DIR = path.join(ROOT, "scripts", "demo-assets", "generated");

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const stamp = Date.now();

/**
 * sharp OPSİYONELDİR ve bilerek package.json'a eklenmemiştir: yalnızca bu
 * tek seferlik demo betiği için gereken ağır bir yerel (native) bağımlılık,
 * uygulamanın kendisi onu kullanmıyor. Kuruluysa görseller küçültülüp JPEG'e
 * çevrilir (750KB PNG -> ~80KB), kurulu değilse ham PNG yüklenir.
 *
 * Geçici olarak kullanmak için:
 *   npm i sharp --no-save   (veya)   NODE_PATH=<sharp'ın olduğu dizin> node ...
 */
let sharp = null;
try {
  ({ default: sharp } = await import("sharp"));
  console.log("sharp bulundu — görseller küçültülüp JPEG'e çevrilecek");
} catch {
  console.log("sharp yok — ham PNG yüklenecek (dosyalar büyük olacak)");
}

/** Hedef türüne göre makul en büyük genişlik: galeri küçük gösteriliyor, kapak tam genişlik. */
const MAX_WIDTH = {
  "org-cover": 1920,
  "category-cover": 1280,
  "category-gallery": 900,
  "service-photo": 600,
};

async function prepare(buffer, kind) {
  if (!sharp) return { body: buffer, ext: "png", contentType: "image/png" };
  const body = await sharp(buffer)
    .resize({ width: MAX_WIDTH[kind] ?? 1200, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return { body, ext: "jpg", contentType: "image/jpeg" };
}

async function upload(bucket, objectPath, body, contentType) {
  const { error } = await sb.storage.from(bucket).upload(objectPath, body, {
    upsert: true,
    cacheControl: "3600",
    contentType,
  });
  if (error) throw new Error(`${bucket}/${objectPath}: ${error.message}`);
  const { data } = sb.storage.from(bucket).getPublicUrl(objectPath);
  // ?t= damgası: upsert sonrası CDN'de duran eski görselin gösterilmesini engeller
  // (panelin kendi yükleme akışı da aynı deseni kullanıyor).
  return `${data.publicUrl}?t=${stamp}`;
}

// Hizmet adından id çözümü — manifest'te id yerine ad tutuluyor.
const serviceIdCache = new Map();
async function resolveServiceId(orgId, name) {
  const key = `${orgId}|${name}`;
  if (serviceIdCache.has(key)) return serviceIdCache.get(key);
  const { data } = await sb.from("services").select("id").eq("org_id", orgId).eq("name", name).limit(1);
  const id = data?.[0]?.id ?? null;
  serviceIdCache.set(key, id);
  return id;
}

// Galeri: kategori başına bir kez temizlenir, sonra sırayla eklenir.
const clearedGalleries = new Set();
const galleryOrder = new Map();

const present = ASSETS.filter((a) => {
  const f = path.join(GEN_DIR, `${a.id}.png`);
  return fs.existsSync(f) && fs.statSync(f).size > 10_000;
});
console.log(`Yüklenecek görsel: ${present.length} / ${ASSETS.length}`);

let ok = 0;
const failed = [];

for (const asset of present) {
  const raw = fs.readFileSync(path.join(GEN_DIR, `${asset.id}.png`));
  const { org, kind, categoryId, serviceName } = asset.target;
  try {
    const { body, ext, contentType } = await prepare(raw, kind);
    if (kind === "org-cover") {
      const url = await upload("org-logos", `${org}/cover.${ext}`, body, contentType);
      const { error } = await sb.from("organizations").update({ cover_url: url }).eq("id", org);
      if (error) throw new Error(error.message);
    } else if (kind === "category-cover") {
      const url = await upload("service-photos", `${org}/categories/${categoryId}.${ext}`, body, contentType);
      const { error } = await sb.from("service_categories").update({ photo_url: url }).eq("id", categoryId);
      if (error) throw new Error(error.message);
    } else if (kind === "category-gallery") {
      if (!clearedGalleries.has(categoryId)) {
        // Eski (test) galeri satırları temizlenir; depodaki dosyalar kalır ama
        // hiçbir sayfadan referans edilmez.
        const { error } = await sb.from("service_category_photos").delete().eq("category_id", categoryId);
        if (error) throw new Error(error.message);
        clearedGalleries.add(categoryId);
        galleryOrder.set(categoryId, 0);
      }
      const order = galleryOrder.get(categoryId) ?? 0;
      const photoId = crypto.randomUUID();
      const url = await upload("service-photos", `${org}/categories/${categoryId}/${photoId}.${ext}`, body, contentType);
      const { error } = await sb.from("service_category_photos").insert({
        org_id: org, category_id: categoryId, url, display_order: order,
      });
      if (error) throw new Error(error.message);
      galleryOrder.set(categoryId, order + 1);
    } else if (kind === "service-photo") {
      const serviceId = await resolveServiceId(org, serviceName);
      if (!serviceId) throw new Error(`hizmet bulunamadı: ${serviceName}`);
      const url = await upload("service-photos", `${org}/services/${serviceId}.${ext}`, body, contentType);
      const { error } = await sb.from("services").update({ photo_url: url }).eq("id", serviceId);
      if (error) throw new Error(error.message);
    } else {
      throw new Error(`bilinmeyen hedef: ${kind}`);
    }
    ok++;
    console.log(`  ✓ ${asset.id}`);
  } catch (e) {
    failed.push({ id: asset.id, error: String(e.message || e) });
    console.log(`  ✗ ${asset.id}: ${e.message}`);
  }
}

console.log(`\nYüklenen: ${ok} | Hatalı: ${failed.length}`);
if (failed.length) process.exitCode = 1;
