/**
 * İki demo salonun randevu sayfası verisini sunuma hazır hâle getirir.
 * Görsellerden BAĞIMSIZDIR; tek başına çalıştırılabilir, tekrar çalıştırmak güvenlidir.
 *
 * Yapılanlar:
 *  - Sirius Demo Güzellik Salonu -> "showcase" (vitrin) şablonu, tanıtım metni, sosyal hesaplar
 *  - BY Sirius Yönetim           -> "classic" şablonu, test1/2/3 kategorileri anlamlı adlara,
 *                                   hizmetler doğru kategorilere, yinelenen hizmetler pasife
 *  - Her ikisinde google_review_url TEMİZLENİR (istek: "google yorumları hariç")
 *
 * Hiçbir müşteri/randevu kaydına dokunmaz.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DEMO_ORG, BYS_ORG, BYS_CATEGORIES } from "./assets-manifest.mjs";

const ROOT = process.cwd();
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const WORKING_HOURS = {
  mon: { open: "09:00", close: "19:00" },
  tue: { open: "09:00", close: "19:00" },
  wed: { open: "09:00", close: "19:00" },
  thu: { open: "09:00", close: "20:00" },
  fri: { open: "09:00", close: "20:00" },
  sat: { open: "10:00", close: "18:00" },
  sun: null,
};

/** website_layout kolonu henüz uygulanmadıysa güncellemenin tamamı düşmesin. */
async function updateOrg(id, fields) {
  let { error } = await sb.from("organizations").update(fields).eq("id", id);
  if (error && /website_layout/.test(error.message)) {
    const { website_layout, ...rest } = fields;
    console.warn(`  ! website_layout kolonu yok (migration uygulanmamış) — şablon "${website_layout}" atlandı`);
    ({ error } = await sb.from("organizations").update(rest).eq("id", id));
  }
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- DEMO SALON
console.log("== Sirius Demo Güzellik Salonu ==");
await updateOrg(DEMO_ORG, {
  website_enabled: true,
  website_layout: "showcase",
  website_palette: "rose",
  website_tagline:
    "Kadıköy'ün kalbinde, 10 yıldır saç, cilt ve tırnak bakımında aynı titizlik. " +
    "Randevunuzu saniyeler içinde alın, gerisini bize bırakın.",
  address: "Bağdat Caddesi No:100, Kadıköy / İstanbul",
  city: "İstanbul",
  phone: "+90 532 000 11 22",
  instagram_handle: "siriusdemosalon",
  tiktok_handle: "siriusdemosalon",
  // "google yorumları hariç" — yorum kısayolu sayfada görünmesin.
  google_review_url: null,
  working_hours_json: WORKING_HOURS,
});
console.log("  ✓ vitrin şablonu + tanıtım/adres/sosyal/çalışma saatleri");

// ------------------------------------------------------------ BY SIRIUS ADMIN
console.log("== BY Sirius Yönetim ==");
await updateOrg(BYS_ORG, {
  website_enabled: true,
  website_layout: "classic",
  website_palette: "ocean",
  website_tagline:
    "Saç, sakal, tırnak ve fine-line dövme — tek çatı altında. Online randevu her zaman açık.",
  address: "Teknokent, Konyaaltı / Antalya",
  city: "Antalya",
  instagram_handle: "bysirius_ai",
  google_review_url: null,
  working_hours_json: WORKING_HOURS,
});
console.log("  ✓ klasik şablon + tanıtım/adres/çalışma saatleri");

// test1/test2/test3 -> anlamlı kategori adları
const CATEGORY_NAMES = [
  [BYS_CATEGORIES.sac, "Saç & Sakal", 0],
  [BYS_CATEGORIES.tirnak, "Tırnak & Nail Art", 1],
  [BYS_CATEGORIES.dovme, "Dövme & Piercing", 2],
];
for (const [id, name, order] of CATEGORY_NAMES) {
  const { error } = await sb.from("service_categories").update({ name, display_order: order }).eq("id", id);
  if (error) throw new Error(`kategori ${name}: ${error.message}`);
}
console.log("  ✓ kategoriler adlandırıldı: Saç & Sakal / Tırnak & Nail Art / Dövme & Piercing");

// Hizmetleri doğru kategoriye taşı (adına göre)
const SERVICE_CATEGORY = {
  "Erkek Kesim": BYS_CATEGORIES.sac,
  "Kadın Kesim": BYS_CATEGORIES.sac,
  "Çocuk Kesim": BYS_CATEGORIES.sac,
  "Saç Yıkama + Kesim": BYS_CATEGORIES.sac,
  "Saç Yıkama + Fön": BYS_CATEGORIES.sac,
  "Akrilik Tırnak (Takma)": BYS_CATEGORIES.tirnak,
  "Glitter Süsleme": BYS_CATEGORIES.tirnak,
  "Küçük Dövme (< 5 cm)": BYS_CATEGORIES.dovme,
};

const { data: bysServices, error: svcErr } = await sb
  .from("services")
  .select("id, name, price, category_id, is_active, created_at")
  .eq("org_id", BYS_ORG)
  .order("created_at");
if (svcErr) throw new Error(svcErr.message);

for (const [name, catId] of Object.entries(SERVICE_CATEGORY)) {
  const ids = bysServices.filter((s) => s.name === name).map((s) => s.id);
  if (!ids.length) continue;
  const { error } = await sb.from("services").update({ category_id: catId }).in("id", ids);
  if (error) throw new Error(`hizmet ${name}: ${error.message}`);
}
console.log("  ✓ hizmetler doğru kategorilere atandı");

// Yinelenen hizmetler: SİLİNMEZ, yalnızca pasife alınır (geri alınabilir).
const seen = new Set();
const duplicates = [];
for (const s of bysServices) {
  if (seen.has(s.name)) duplicates.push(s);
  else seen.add(s.name);
}
if (duplicates.length) {
  const { error } = await sb.from("services").update({ is_active: false }).in("id", duplicates.map((d) => d.id));
  if (error) throw new Error(error.message);
  console.log(`  ✓ ${duplicates.length} yinelenen hizmet pasife alındı: ${duplicates.map((d) => `${d.name} (${d.price})`).join(", ")}`);
}

console.log("\nTamam. Sayfalar:");
console.log("  https://siriplan.com/r/sirius-demo-salon   (vitrin)");
console.log("  https://siriplan.com/r/bysirius-admin      (klasik)");
