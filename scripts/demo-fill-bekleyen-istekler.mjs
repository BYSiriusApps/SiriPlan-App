// "Bekleyen İşler" (/dashboard/bekleyen-istekler) sayfasını demo hesapta test
// edebilmek için 3 bölüme de 5'er örnek kayıt ekler:
//   1) appointment_requests (WhatsApp/Instagram'dan gelen, onay bekleyen talepler)
//   2) appointments — status=onaylandi ama saati geçmiş (yeni "Sonuçlandırılmamış
//      Randevular" iş listesi bölümü için)
//   3) inventory_items — kritik stok eşiğinin altında ürünler
//
// Kullanım:  node scripts/demo-fill-bekleyen-istekler.mjs         (dry-run)
//            node scripts/demo-fill-bekleyen-istekler.mjs --apply (yazar)
//
// Bitince bu dosya silinebilir (demo-refresh.mjs ile aynı kullan-at mantığı).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const env = Object.fromEntries(
  readFileSync("d:/0000-BY SİRİUS PROJELER/15 PROJE TEMEL/randevu-sistemi/.env.local", "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ORG = "8e73d29c-e312-49d1-8259-2ce510028320";

const now = new Date();
const addHours = (h) => new Date(now.getTime() + h * 3600e3).toISOString();
const pick = (arr, i) => arr[i % arr.length];

const { data: staff, error: staffErr } = await sb.from("staff").select("id, full_name").eq("org_id", ORG).eq("is_active", true);
if (staffErr || !staff?.length) { console.error("staff okunamadı:", staffErr?.message); process.exit(1); }
const { data: services, error: svcErr } = await sb.from("services").select("id, name, price, duration_minutes").eq("org_id", ORG).eq("is_active", true);
if (svcErr || !services?.length) { console.error("services okunamadı:", svcErr?.message); process.exit(1); }

console.log(`org staff: ${staff.length}, services: ${services.length}${APPLY ? "  *** APPLYING ***" : "  (dry-run)"}`);

// ── 1) Bekleyen talepler (WhatsApp/Instagram) ──────────────────────────────
const REQS = [
  { customer_name: "Derya Aydın", customer_phone: "+905321234501", source: "whatsapp", note: "Saç kesimi + fön istiyorum, cumartesi uygun mu?", hoursFromNow: 26 },
  { customer_name: "Burak Şen", customer_phone: "+905321234502", source: "instagram", note: "Cilt bakımı için yeriniz var mı?", hoursFromNow: 30 },
  { customer_name: "Nazlı Kurt", customer_phone: "+905321234503", source: "whatsapp", note: null, hoursFromNow: 48 },
  { customer_name: "Emre Doğan", customer_phone: "+905321234504", source: "instagram", note: "Akşam saatleri müsait mi?", hoursFromNow: 52 },
  { customer_name: "Sibel Aksoy", customer_phone: "+905321234505", source: "whatsapp", note: "Arkadaşımla birlikte gelmek istiyoruz, iki kişilik yer var mı?", hoursFromNow: 72 },
];

// ── 2) Saati geçmiş ama hâlâ "Onaylandı" kalan randevular (yeni iş listesi) ─
const OVERDUE = [
  { customer_name: "Kerem Bulut", customer_phone: "+905331234601", hoursAgo: 2.2 },
  { customer_name: "İpek Şahin", customer_phone: "+905331234602", hoursAgo: 5.4 },
  { customer_name: "Onur Kaya", customer_phone: "+905331234603", hoursAgo: 21.3 },
  { customer_name: "Gamze Er", customer_phone: "+905331234604", hoursAgo: 27.1 },
  { customer_name: "Tolga Avcı", customer_phone: "+905331234605", hoursAgo: 33.7 },
];

// ── 3) Kritik stok ───────────────────────────────────────────────────────
const STOCK = [
  { name: "Saç Boyası — Kahve", category: "sac", current_stock: 1, min_stock_alert: 5, unit: "kutu" },
  { name: "Şampuan (1L)", category: "sac", current_stock: 2, min_stock_alert: 6, unit: "adet" },
  { name: "Manikür Seti", category: "tirnak", current_stock: 0, min_stock_alert: 3, unit: "adet" },
  { name: "Yüz Maskesi", category: "cilt", current_stock: 3, min_stock_alert: 10, unit: "adet" },
  { name: "Oje — Kırmızı", category: "tirnak", current_stock: 1, min_stock_alert: 4, unit: "adet" },
];

console.log("\n--- appointment_requests (pending) ---");
for (const [i, r] of REQS.entries()) {
  const svc = pick(services, i);
  const row = {
    org_id: ORG,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone,
    staff_id: pick(staff, i).id,
    service_id: svc.id,
    appointment_at: addHours(r.hoursFromNow),
    duration_minutes: svc.duration_minutes,
    price: svc.price,
    note: r.note,
    source: r.source,
    status: "pending",
  };
  console.log(`${row.source.padEnd(9)} ${row.appointment_at} ${row.customer_name} — ${svc.name}`);
  if (APPLY) {
    const { error } = await sb.from("appointment_requests").insert(row);
    if (error) console.error("  FAIL:", error.message);
  }
}

console.log("\n--- appointments (onaylandi, saati geçmiş) ---");
for (const [i, o] of OVERDUE.entries()) {
  const svc = pick(services, i);
  const st = pick(staff, i + 1); // farklı personel dağılımı için +1 kaydırma
  const row = {
    org_id: ORG,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    staff_id: st.id,
    service_id: svc.id,
    appointment_at: new Date(now.getTime() - o.hoursAgo * 3600e3).toISOString(),
    duration_minutes: svc.duration_minutes,
    price: svc.price,
    status: "onaylandi",
    source: "web",
  };
  console.log(`${row.appointment_at} ${st.full_name.padEnd(14)} ${row.customer_name} — ${svc.name}`);
  if (APPLY) {
    const { error } = await sb.from("appointments").insert(row);
    if (error) console.error("  FAIL (çakışan saat olabilir, tekrar deneyin):", error.message);
  }
}

console.log("\n--- inventory_items (kritik stok) ---");
for (const s of STOCK) {
  const row = { org_id: ORG, is_active: true, ...s };
  console.log(`${String(row.current_stock).padStart(3)} / ${row.min_stock_alert} ${row.unit.padEnd(6)} ${row.name}`);
  if (APPLY) {
    const { error } = await sb.from("inventory_items").insert(row);
    if (error) console.error("  FAIL:", error.message);
  }
}

console.log(APPLY ? "\nBitti." : "\n(dry-run — yazmak için --apply ekleyin)");
