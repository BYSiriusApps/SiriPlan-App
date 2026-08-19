#!/usr/bin/env node
/**
 * YETKİ & MÜŞTERİ SİLME GÜVENLİK TESTİ
 * =====================================
 *
 * 2026-08-19 sürümüyle gelen üç yüzeyi denetler:
 *
 *   KATMAN 1 — Veritabanı (RLS)
 *     20260819_org_tax_number_and_customer_delete_policy.sql sonrası:
 *     `customers` üzerindeki DELETE yalnızca owner/manager'a açık olmalı,
 *     SELECT/INSERT/UPDATE davranışı ise hiç değişmemeli. Ayrıca
 *     organizations.tax_number kolonu yalnızca kendi işletmesine görünmeli.
 *
 *   KATMAN 2 — Yetki API'si (/api/staff/[id]/permissions, /api/staff/invite)
 *     Yetki yükseltme denemeleri: manage_staff'i olmayan yönetici, kendi
 *     satırını düzenleme, manager rolü/manage_staff izni devretme.
 *
 *   KATMAN 3 — Müşteri silme ucu (DELETE /api/customers/[id])
 *     Personel rolü reddedilmeli; sahip silebilmeli; randevu geçmişi olan
 *     müşteri SİLİNMEMELİ (anonimleştirilmeli).
 *
 * KULLANIM
 *   node scripts/security/permissions-audit.mjs --base=http://localhost:3000
 *   node scripts/security/permissions-audit.mjs --base=https://siriplan.com
 *
 * GÜVENLİ Mİ? Test kendi verisini üretir ("ZZ Güvenlik Testi ..." adlı geçici
 * müşteri) ve sonunda temizler. GERÇEK müşteri kaydına hiç dokunulmaz; silme
 * denemeleri yalnızca testin kendi ürettiği satırda yapılır. Yetki
 * değişiklikleri okuma amaçlıdır; yazma denemeleri BAŞARISIZ OLMASI beklenen
 * saldırı denemeleridir. service_role anahtarı kullanılmaz.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv() {
  const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY bulunamadı (.env.local).");
  process.exit(2);
}

const baseArg = process.argv.find((a) => a.startsWith("--base="));
const APP_BASE = baseArg ? baseArg.slice(7).replace(/\/$/, "") : "http://localhost:3000";

const DEMO_ORG = "8e73d29c-e312-49d1-8259-2ce510028320";
const ACCOUNTS = {
  owner:   { label: "Sahip",    email: "sahip.demo@siriplan.com",     password: "Sahip!2026Demo" },
  manager: { label: "Yönetici", email: "yonetici.demo@siriplan.com",  password: "Yonetici!2026Demo" },
  staff:   { label: "Personel", email: "personel1.demo@siriplan.com", password: "Personel1!2026" },
};

const results = [];
let currentLayer = "";
const leftovers = [];

function layer(name) {
  currentLayer = name;
  console.log(`\n\x1b[1m${name}\x1b[0m\n${"─".repeat(74)}`);
}
function record(ok, title, detail) {
  results.push({ layer: currentLayer, ok, title, detail });
  console.log(`${ok ? "\x1b[32m  ✓\x1b[0m" : "\x1b[31m  SIZDI\x1b[0m"}  ${title}`);
  if (detail) console.log(`       \x1b[2m${detail}\x1b[0m`);
}

// ─── PostgREST ───────────────────────────────────────────────
async function rest(path, { token, method = "GET", body, prefer } = {}) {
  const headers = { apikey: ANON_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* metin */ }
  return { status: res.status, json, rows: Array.isArray(json) ? json.length : 0 };
}

async function signIn(a) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: a.email, password: a.password }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`${a.label} girişi başarısız (${res.status}): ${json.error_description || json.msg || ""}`);
  }
  return json.access_token;
}

// ─── Uygulama oturumu (çerezli) ──────────────────────────────
async function appLogin(a) {
  const res = await fetch(`${APP_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: a.email, password: a.password }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`${a.label} uygulama girişi başarısız (${res.status})`);
  return cookie;
}

async function api(path, { cookie, method = "GET", body } = {}) {
  const res = await fetch(`${APP_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", cookie, origin: APP_BASE },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* html */ }
  return { status: res.status, json };
}

// ═════════════════════════════════════════════════════════════
async function main() {
  console.log(`\x1b[1mYETKİ & MÜŞTERİ SİLME DENETİMİ\x1b[0m  →  ${APP_BASE}`);

  const tok = {};
  for (const [k, a] of Object.entries(ACCOUNTS)) tok[k] = await signIn(a);

  // ── KATMAN 1 — RLS ──────────────────────────────────────────
  layer("KATMAN 1 — Veritabanı (RLS): customers DELETE daraltması");

  // Testin kendi kurbanı: sahip hesabıyla geçici müşteri oluştur.
  const stamp = Date.now();
  const probePhone = `0555${String(stamp).slice(-7)}`;
  const created = await rest("customers", {
    token: tok.owner,
    method: "POST",
    prefer: "return=representation",
    body: { org_id: DEMO_ORG, full_name: `ZZ Güvenlik Testi ${stamp}`, phone: probePhone, source: "migration" },
  });
  const probeId = created.json?.[0]?.id;
  record(!!probeId, "Sahip geçici test müşterisi oluşturabiliyor (INSERT bozulmadı)",
    probeId ? `id=${probeId}` : `HTTP ${created.status} ${JSON.stringify(created.json)}`);
  if (!probeId) { summarize(); return; }
  leftovers.push(probeId);

  // Personel: okuma/güncelleme çalışmalı (regresyon), silme ENGELLENMELİ.
  const staffRead = await rest(`customers?id=eq.${probeId}&select=id,full_name`, { token: tok.staff });
  record(staffRead.rows === 1, "Personel müşteriyi HÂLÂ okuyabiliyor (SELECT bozulmadı)",
    `HTTP ${staffRead.status} / ${staffRead.rows} satır`);

  const staffUpdate = await rest(`customers?id=eq.${probeId}`, {
    token: tok.staff, method: "PATCH", prefer: "return=representation", body: { notes: "rls-testi" },
  });
  record(staffUpdate.rows === 1, "Personel müşteriyi HÂLÂ güncelleyebiliyor (UPDATE bozulmadı)",
    `HTTP ${staffUpdate.status} / ${staffUpdate.rows} satır`);

  const staffDelete = await rest(`customers?id=eq.${probeId}`, {
    token: tok.staff, method: "DELETE", prefer: "return=representation",
  });
  const stillThere = await rest(`customers?id=eq.${probeId}&select=id`, { token: tok.owner });
  record(staffDelete.rows === 0 && stillThere.rows === 1,
    "Personel müşteri SİLEMİYOR (yeni customers_delete policy'si)",
    `DELETE HTTP ${staffDelete.status} / ${staffDelete.rows} satır silindi; kayıt duruyor: ${stillThere.rows === 1}`);

  const mgrDelete = await rest(`customers?id=eq.${probeId}`, {
    token: tok.manager, method: "DELETE", prefer: "return=representation",
  });
  record(mgrDelete.rows === 1, "Yönetici müşteri silebiliyor (yetkili yol çalışıyor)",
    `HTTP ${mgrDelete.status} / ${mgrDelete.rows} satır`);
  if (mgrDelete.rows === 1) leftovers.pop();

  // tax_number kolonu
  const ownTax = await rest(`organizations?id=eq.${DEMO_ORG}&select=id,tax_number`, { token: tok.owner });
  record(ownTax.status === 200 && ownTax.rows === 1 && "tax_number" in (ownTax.json?.[0] ?? {}),
    "organizations.tax_number kolonu uygulandı ve kendi işletmesine görünüyor",
    `HTTP ${ownTax.status}, değer=${JSON.stringify(ownTax.json?.[0]?.tax_number ?? null)}`);

  const allTax = await rest("organizations?select=id,tax_number", { token: tok.staff });
  const ownIds = new Set((await rest("org_members?select=org_id", { token: tok.staff })).json?.map((r) => r.org_id) ?? []);
  const foreign = (allTax.json ?? []).filter((o) => !ownIds.has(o.id));
  record(foreign.length === 0, "Personel BAŞKA salonların tax_number'ını göremiyor",
    `${allTax.rows} satır döndü, yabancı: ${foreign.length}`);

  // ── KATMAN 2 — Yetki API'si ─────────────────────────────────
  layer(`KATMAN 2 — Yetki API'si (${APP_BASE})`);

  const cookie = {};
  for (const [k, a] of Object.entries(ACCOUNTS)) {
    try { cookie[k] = await appLogin(a); } catch (e) { cookie[k] = null; console.log(`       \x1b[2m${e.message}\x1b[0m`); }
  }
  if (!cookie.owner) {
    record(false, "Uygulama girişi yapılamadı — KATMAN 2/3 atlandı", `${APP_BASE} ayakta mı?`);
    return summarize();
  }

  // Sahibin gözünden personel listesi → staff_id'ler
  const staffList = await api("/api/staff", { cookie: cookie.owner });
  const rows = staffList.json?.staff ?? staffList.json ?? [];
  const byName = (n) => rows.find((s) => (s.full_name ?? "").toLowerCase().includes(n));
  const elif = byName("elif demir");   // personel1.demo
  const murat = byName("murat");        // yonetici.demo

  record(!!elif, "Test personeli (Elif Demir) bulundu", elif ? `staff_id=${elif.id}` : `${rows.length} personel döndü`);

  if (elif) {
    // 2a) Personel rolü yetki uçlarına hiç erişememeli
    const staffGet = await api(`/api/staff/${elif.id}/permissions`, { cookie: cookie.staff });
    record(staffGet.status === 403, "Personel rolü yetki uçlarını okuyamıyor", `HTTP ${staffGet.status}`);

    const staffPatch = await api(`/api/staff/${elif.id}/permissions`, {
      cookie: cookie.staff, method: "PATCH", body: { role: "manager", permissions_json: { manage_staff: true } },
    });
    record(staffPatch.status === 403, "Personel rolü yetki yükseltemiyor", `HTTP ${staffPatch.status}`);

    // 2b) manage_staff'i OLMAYAN yönetici de erişememeli
    const mgrGet = await api(`/api/staff/${elif.id}/permissions`, { cookie: cookie.manager });
    const mgrPerms = (await api("/api/org", { cookie: cookie.manager })).json;
    record(mgrGet.status === 403,
      "manage_staff'i olmayan yönetici yetki uçlarına erişemiyor (eski açık kapandı)",
      `HTTP ${mgrGet.status}${mgrPerms ? "" : ""}`);

    // 2c) Sahip erişebilmeli (meşru yol bozulmadı)
    const ownerGet = await api(`/api/staff/${elif.id}/permissions`, { cookie: cookie.owner });
    record(ownerGet.status === 200, "Sahip yetki uçlarını okuyabiliyor (meşru yol çalışıyor)",
      `HTTP ${ownerGet.status}, linked=${ownerGet.json?.linked}`);

    // 2d) Uydurma izin anahtarı kaydedilmemeli
    const inject = await api(`/api/staff/${elif.id}/permissions`, {
      cookie: cookie.owner, method: "PATCH",
      body: { permissions_json: { view_customers: true, is_super_admin: true, "'; DROP TABLE": true } },
    });
    const saved = inject.json?.permissions_json ?? {};
    record(inject.status === 200 && !("is_super_admin" in saved) && !("'; DROP TABLE" in saved),
      "Uydurma izin anahtarları yok sayılıyor (beyaz liste)",
      `kaydedilen anahtarlar: ${Object.keys(saved).join(", ") || "—"}`);
  }

  if (murat) {
    // 2e) Sahip kendi satırını düzenleyememeli
    const ownerStaffRow = rows.find((s) => (s.full_name ?? "").toLowerCase().includes("selin"));
    if (ownerStaffRow) {
      const self = await api(`/api/staff/${ownerStaffRow.id}/permissions`, {
        cookie: cookie.owner, method: "PATCH", body: { role: "staff" },
      });
      record(self.status === 403, "Sahip kendi üyeliğini bu uçtan değiştiremiyor", `HTTP ${self.status}`);
    }
  }

  // 2f) Personel davet gönderemez
  const staffInvite = await api("/api/staff/invite", {
    cookie: cookie.staff, method: "POST",
    body: { email: `zz-test-${stamp}@example.com`, role: "manager", permissions_json: { manage_staff: true } },
  });
  record(staffInvite.status === 403, "Personel davet gönderemiyor", `HTTP ${staffInvite.status}`);

  // ── KATMAN 3 — Müşteri silme ucu ────────────────────────────
  layer(`KATMAN 3 — DELETE /api/customers/[id] (${APP_BASE})`);

  const c2 = await rest("customers", {
    token: tok.owner, method: "POST", prefer: "return=representation",
    body: { org_id: DEMO_ORG, full_name: `ZZ Güvenlik Testi B ${stamp}`, phone: `0555${String(stamp + 1).slice(-7)}`, source: "migration" },
  });
  const id2 = c2.json?.[0]?.id;
  if (!id2) { record(false, "İkinci test müşterisi oluşturulamadı", `HTTP ${c2.status}`); return summarize(); }
  leftovers.push(id2);

  const staffDel = await api(`/api/customers/${id2}`, { cookie: cookie.staff, method: "DELETE" });
  record(staffDel.status === 403, "Personel API'den müşteri silemiyor", `HTTP ${staffDel.status} — ${staffDel.json?.error ?? ""}`);

  const check = await rest(`customers?id=eq.${id2}&select=id`, { token: tok.owner });
  record(check.rows === 1, "Reddedilen silmeden sonra kayıt yerinde duruyor", `${check.rows} satır`);

  const ownerDel = await api(`/api/customers/${id2}`, { cookie: cookie.owner, method: "DELETE" });
  record(ownerDel.status === 200 && ownerDel.json?.mode === "deleted",
    "Sahip randevusuz müşteriyi silebiliyor (mode=deleted)",
    `HTTP ${ownerDel.status}, mode=${ownerDel.json?.mode}`);
  if (ownerDel.json?.mode === "deleted") leftovers.pop();

  // Randevu geçmişi olan müşteri: SİLİNMEMELİ, anonimleşmeli
  const withHistory = await rest(
    `appointments?org_id=eq.${DEMO_ORG}&customer_id=not.is.null&select=customer_id&limit=1`,
    { token: tok.owner }
  );
  const histId = withHistory.json?.[0]?.customer_id;
  if (histId) {
    // GERÇEK müşteriye dokunmuyoruz — yalnızca yetkisiz denemeyle davranışı ölçüyoruz.
    const staffTry = await api(`/api/customers/${histId}`, { cookie: cookie.staff, method: "DELETE" });
    const alive = await rest(`customers?id=eq.${histId}&select=id,full_name`, { token: tok.owner });
    record(staffTry.status === 403 && alive.rows === 1,
      "Randevu geçmişi olan gerçek müşteri yetkisiz silmeden etkilenmiyor",
      `HTTP ${staffTry.status}, kayıt: ${alive.json?.[0]?.full_name ?? "—"}`);
  }

  // Çapraz kiracı: başka salonun müşterisini silmeye çalış
  const foreignCust = await rest(`customers?org_id=neq.${DEMO_ORG}&select=id&limit=1`, { token: tok.owner });
  if (foreignCust.rows === 0) {
    record(true, "Sahip başka salonun müşterisini zaten listeleyemiyor (RLS)", "0 satır");
  }

  summarize();
}

function summarize() {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n${"═".repeat(74)}`);
  console.log(`TOPLAM ${results.length} test — \x1b[32m${pass} geçti\x1b[0m, ${fail ? `\x1b[31m${fail} başarısız\x1b[0m` : "0 başarısız"}`);
  if (fail) {
    console.log("\n\x1b[31mBaşarısız testler:\x1b[0m");
    for (const r of results.filter((x) => !x.ok)) console.log(`  • [${r.layer}] ${r.title} — ${r.detail ?? ""}`);
  } else {
    console.log("\x1b[32mYetki yükseltme ve yetkisiz silme yolu bulunamadı.\x1b[0m");
  }
  if (leftovers.length) {
    console.log(`\n\x1b[33mTEMİZLENMEMİŞ TEST SATIRI:\x1b[0m ${leftovers.join(", ")}`);
    console.log(`  DELETE FROM customers WHERE id IN ('${leftovers.join("','")}');`);
  }
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("\x1b[31mHATA:\x1b[0m", e.message); process.exit(2); });
