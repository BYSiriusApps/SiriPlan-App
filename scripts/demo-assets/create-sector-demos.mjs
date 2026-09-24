/**
 * Yeni sektörler (pet kuaför, spa & masaj, nail art) için canlı Supabase'de
 * gerçek demo işletme hesapları oluşturur — quick-register akışının (bkz.
 * src/app/api/auth/quick-register/route.ts) service-role ile birebir
 * tekrarı: auth kullanıcısı + organizations + org_members(owner) + staff +
 * birkaç hizmet. Üstüne örnek müşteriler (custom_fields + customer_metrics
 * geçmişiyle) ekler ki panelde giriş yapılınca rozetler/delta dolu görünsün.
 *
 * Tek kullanımlıktır — tekrar çalıştırmak güvenlidir (email zaten varsa o
 * sektör atlanır, hata vermez).
 *
 * Çalıştırma: node scripts/demo-assets/create-sector-demos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TRIAL_PLAN_LIMITS = { max_staff: 999, max_appointments_monthly: 999999 };
const TWO_YEARS = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

function slugify(name) {
  return name
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SECTORS = [
  {
    key: "pet_kuafor",
    salonName: "Sirius Demo Pati Kuaför",
    fullName: "Aslı Yıldız",
    email: "demo-petkuafor@siriplan.com",
    phone: "+90 532 111 22 33",
    password: "PatiDemo2026!",
    services: [
      { name: "Köpek Yıkama (Küçük Irk)", duration_minutes: 45, price: 350 },
      { name: "Köpek Yıkama (Büyük Irk)", duration_minutes: 75, price: 600 },
      { name: "Kedi Yıkama", duration_minutes: 40, price: 400 },
      { name: "Irk Standardı Tıraş", duration_minutes: 90, price: 800 },
      { name: "Tırnak Kesimi", duration_minutes: 15, price: 150 },
    ],
    customers: [
      { full_name: "Ela Korkmaz", phone: "+90 533 400 10 01", custom_fields: { pet_name: "Boncuk", species: "kopek", breed: "Golden Retriever", weight: 28, status: "sadik" }, weightHistory: [30.2, 28] },
      { full_name: "Deniz Aksoy", phone: "+90 533 400 10 02", custom_fields: { pet_name: "Mırmır", species: "kedi", breed: "British Shorthair", weight: 4.8, status: "hassas" }, weightHistory: [5.1, 4.8] },
      { full_name: "Barış Yalçın", phone: "+90 533 400 10 03", custom_fields: { pet_name: "Zeytin", species: "kopek", breed: "Poodle", weight: 7.2, status: "sadik" }, weightHistory: [7.5, 7.2] },
      { full_name: "Nazlı Er", phone: "+90 533 400 10 04", custom_fields: { pet_name: "Findik", species: "kedi", breed: "Tekir", status: "kontrol_gerekli" } },
    ],
  },
  {
    key: "spa",
    salonName: "Sirius Demo Spa & Masaj",
    fullName: "Selin Kara",
    email: "demo-spa@siriplan.com",
    phone: "+90 532 111 22 44",
    password: "SpaDemo2026!",
    services: [
      { name: "İsveç Masajı (60 dk)", duration_minutes: 60, price: 900 },
      { name: "Aromaterapi Masajı", duration_minutes: 75, price: 1100 },
      { name: "Sıcak Taş Masajı", duration_minutes: 90, price: 1300 },
      { name: "Cilt Bakımı", duration_minutes: 60, price: 950 },
    ],
    customers: [
      { full_name: "Merve Şahin", phone: "+90 533 400 20 01", custom_fields: { membership: "premium", skin_type: "Karma cilt", status: "takipte" } },
      { full_name: "Onur Demirtaş", phone: "+90 533 400 20 02", custom_fields: { membership: "standart", skin_type: "Hassas cilt", status: "kontrol_gerekli" } },
      { full_name: "Ayşe Polat", phone: "+90 533 400 20 03", custom_fields: { membership: "premium", skin_type: "Kuru cilt", status: "takipte" } },
      { full_name: "Cem Aydın", phone: "+90 533 400 20 04", custom_fields: { membership: "standart", status: "tamamlandi" } },
    ],
  },
  {
    key: "nail",
    salonName: "Sirius Demo Nail Art Studio",
    fullName: "Buse Öztürk",
    email: "demo-nail@siriplan.com",
    phone: "+90 532 111 22 55",
    password: "NailDemo2026!",
    services: [
      { name: "Klasik Manikür", duration_minutes: 40, price: 300 },
      { name: "Kalıcı Oje", duration_minutes: 50, price: 450 },
      { name: "Jel Tırnak Uygulaması", duration_minutes: 90, price: 800 },
      { name: "Nail Art Tasarım", duration_minutes: 60, price: 500 },
    ],
    customers: [
      { full_name: "İrem Aksu", phone: "+90 533 400 30 01", custom_fields: { preferred_style: "Fransız manikür", status: "takipte" } },
      { full_name: "Gizem Yurt", phone: "+90 533 400 30 02", custom_fields: { allergy: "Aseton alerjisi — organik çözücü kullan", preferred_style: "Minimalist", status: "kontrol_gerekli" } },
      { full_name: "Sude Kaplan", phone: "+90 533 400 30 03", custom_fields: { preferred_style: "Ombre", status: "takipte" } },
      { full_name: "Elif Tan", phone: "+90 533 400 30 04", custom_fields: { preferred_style: "Chrome nail", status: "tamamlandi" } },
    ],
  },
];

async function ensureOrg(sector) {
  const { data: existingUsers } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const already = existingUsers?.users?.find((u) => u.email?.toLowerCase() === sector.email.toLowerCase());
  if (already) {
    console.log(`= ${sector.email} zaten var, atlanıyor.`);
    return null;
  }

  const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
    email: sector.email,
    password: sector.password,
    email_confirm: true,
    user_metadata: { full_name: sector.fullName, salon_name: sector.salonName },
  });
  if (createErr) throw new Error(`[${sector.key}] auth user: ${createErr.message}`);
  const userId = newUser.user.id;

  const slug = slugify(sector.salonName) + "-" + Math.random().toString(36).slice(2, 6);
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .insert({
      slug,
      name: sector.salonName,
      type: sector.key,
      phone: sector.phone,
      email: sector.email,
      plan: "trial",
      subscription_status: "active",
      trial_ends_at: TWO_YEARS,
      ...TRIAL_PLAN_LIMITS,
      locale: "tr",
      timezone: "Europe/Istanbul",
      has_auto_booking: false,
    })
    .select("id")
    .single();
  if (orgErr || !org) {
    await sb.auth.admin.deleteUser(userId);
    throw new Error(`[${sector.key}] organizations: ${orgErr?.message}`);
  }

  const now = new Date().toISOString();
  await sb.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    kvkk_consent: true,
    kvkk_consent_at: now,
    marketing_consent: false,
  });

  await sb.from("staff").insert({ org_id: org.id, full_name: sector.fullName, role: "Salon Sahibi", is_active: true });

  await sb.from("services").insert(
    sector.services.map((s, i) => ({
      org_id: org.id,
      name: s.name,
      duration_minutes: s.duration_minutes,
      price: s.price,
      contributes_loyalty: true,
      is_active: true,
      display_order: i,
    }))
  );

  console.log(`+ ${sector.salonName} oluşturuldu (org_id=${org.id})`);
  return org.id;
}

async function seedCustomers(orgId, sector) {
  for (const cust of sector.customers) {
    const { data: row, error } = await sb
      .from("customers")
      .insert({
        org_id: orgId,
        full_name: cust.full_name,
        phone: cust.phone,
        custom_fields: cust.custom_fields,
        kvkk_consent: true,
        marketing_consent: true,
        visit_count: cust.weightHistory ? cust.weightHistory.length : 2,
        last_visit_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      console.warn(`  ! müşteri eklenemedi (${cust.full_name}): ${error.message}`);
      continue;
    }

    if (cust.weightHistory) {
      const today = new Date();
      const rows = cust.weightHistory.map((value, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (cust.weightHistory.length - i) * 14);
        return {
          org_id: orgId,
          customer_id: row.id,
          metric_key: "weight",
          value,
          recorded_at: d.toISOString().slice(0, 10),
        };
      });
      const { error: metricErr } = await sb.from("customer_metrics").insert(rows);
      if (metricErr) console.warn(`  ! metrik eklenemedi (${cust.full_name}): ${metricErr.message}`);
    }
  }
  console.log(`  -> ${sector.customers.length} örnek müşteri eklendi.`);
}

for (const sector of SECTORS) {
  try {
    const orgId = await ensureOrg(sector);
    if (orgId) await seedCustomers(orgId, sector);
  } catch (e) {
    console.error(`HATA [${sector.key}]:`, e.message);
  }
}

console.log("\nDemo giriş bilgileri:");
for (const s of SECTORS) {
  console.log(`  ${s.salonName}: ${s.email} / ${s.password}`);
}
