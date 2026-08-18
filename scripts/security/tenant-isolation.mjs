#!/usr/bin/env node
/**
 * ÇOK KİRACILI (MULTI-TENANT) İZOLASYON TESTİ
 * ============================================
 *
 * "RLS zafiyetinde tüm salonların müşteri telefonları ve finansal raporları
 * sızabilir" riskini somut olarak ölçer. Üç katmanda saldırganı taklit eder:
 *
 *   KATMAN A — Anonim saldırgan (oturumsuz)
 *     Tarayıcı paketinde YAZAN anon anahtarıyla doğrudan PostgREST'e gider.
 *     Beklenen: her hassas tabloda yetki reddi.
 *
 *   KATMAN B — Kötü niyetli KİRACI (geçerli oturumu olan başka bir salon)
 *     Gerçek bir salon sahibi olarak giriş yapar, BAŞKA bir salonun org_id'siyle
 *     okuma/yazma/güncelleme/silme dener. Asıl RLS testi budur.
 *
 *   KATMAN C — Uygulama katmanı (service_role ile çalışan uçlar)
 *     Bu uçlarda RLS DEVRE DIŞIDIR; izolasyonu kodun kendisi sağlamak zorunda.
 *     Yetkisiz admin erişimi, active_org çerezi sahteciliği (IDOR), herkese
 *     açık uçlarda sır sızıntısı ve CSP başlıkları denenir.
 *
 * KULLANIM
 *   node scripts/security/tenant-isolation.mjs
 *   node scripts/security/tenant-isolation.mjs --base=http://localhost:3000
 *   node scripts/security/tenant-isolation.mjs --base=https://siriplan.com
 *
 * GÜVENLİ Mİ? Okuma denemeleri hiçbir şeyi değiştirmez. Yazma denemeleri
 * KASITLI olarak BAŞKA bir kiracının org_id'siyle yapılır — izolasyon doğru
 * çalışıyorsa hiçbiri yazmaz. Bozuksa test FAIL verir ve oluşan satırın silme
 * SQL'ini ekrana basar. service_role anahtarı bu betikte KULLANILMAZ; testin
 * amacı zaten "service_role olmayan biri ne yapabiliyor?" sorusudur.
 *
 * Veritabanı tarafındaki tamamlayıcı denetim: scripts/security/rls-audit.sql
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// ─── .env.local ──────────────────────────────────────────────
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
const APP_BASE = baseArg ? baseArg.slice(7).replace(/\/$/, "") : null;

// ─── Test kiracıları — İKİ FARKLI salon ──────────────────────
const TENANT_A = {
  label: "Demo Salon",
  email: "sahip.demo@siriplan.com",
  password: "Sahip!2026Demo",
  orgId: "8e73d29c-e312-49d1-8259-2ce510028320",
  slug: "sirius-demo-salon",
};
const TENANT_B = {
  label: "Bella Kadıköy",
  email: "zincir.test@siriplan.com",
  password: "Zincir!2026Test",
  orgId: "5cdbdfba-8683-42e9-b324-24297d979e96",
  slug: "bella-guzellik-kadikoy-test",
};

// ─── Sonuç toplama ───────────────────────────────────────────
const results = [];
let currentLayer = "";
const orphanRows = [];

function layer(name) {
  currentLayer = name;
  console.log(`\n\x1b[1m${name}\x1b[0m\n${"─".repeat(74)}`);
}
function record(ok, title, detail) {
  results.push({ layer: currentLayer, ok, title, detail });
  console.log(`${ok ? "\x1b[32m  ✓\x1b[0m" : "\x1b[31mSIZDI\x1b[0m"}  ${title}`);
  if (detail) console.log(`       \x1b[2m${detail}\x1b[0m`);
}

// ─── PostgREST yardımcıları ──────────────────────────────────
async function rest(path, { token, method = "GET", body, prefer } = {}) {
  const headers = { apikey: ANON_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* metin yanıt */ }
  return { status: res.status, json, rows: Array.isArray(json) ? json.length : 0 };
}

async function signIn(t) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: t.email, password: t.password }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`${t.label} girişi başarısız (${res.status}): ${json.error_description || json.msg || ""}`);
  }
  return json.access_token;
}

/**
 * Saldırganın GERÇEKTEN üye olduğu org_id kümesi.
 *
 * NEDEN ÇALIŞMA ZAMANINDA ÇÖZÜLÜYOR: zincir test hesabı 3 ayrı Bella şubesinin
 * sahibi. "kendi org'u dışında satır görmemeli" kuralını tek bir org_id'ye göre
 * yazmak, meşru çoklu-işletme üyeliğini sızıntı sanıp yanlış alarm verir.
 */
async function ownOrgIds(token) {
  const { json } = await rest("org_members?select=org_id", { token });
  return new Set(Array.isArray(json) ? json.map((r) => r.org_id) : []);
}

async function userId(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  return (await r.json()).id;
}

// ═════════════════════════════════════════════════════════════
// KATMAN A — Anonim saldırgan
// ═════════════════════════════════════════════════════════════
const SENSITIVE_TABLES = [
  "organizations", "staff", "services", "staff_services", "appointments",
  "customers", "customer_consents", "waitlist", "expenses", "recurring_expenses",
  "campaigns", "campaign_logs", "audit_logs", "org_members", "staff_invitations",
  "consent_requests", "appointment_requests", "service_categories",
  "service_category_photos", "staff_time_off", "platform_admins",
  "data_imports", "loyalty_redeems", "staff_performance_weekly", "staff_badges",
];

async function layerA() {
  layer("KATMAN A — Anonim saldırgan (anon anahtarıyla doğrudan PostgREST)");

  for (const table of SENSITIVE_TABLES) {
    const { status, json, rows } = await rest(`${table}?select=*&limit=3`);
    // 200 + satır  = açık sızıntı
    // 200 + 0 satır = policy yok ama GRANT durabiliyor (yine de kabul edilmez,
    //                 ileride eklenecek tek bir policy veriyi anında açar)
    const leaked = status === 200;
    record(
      !leaked,
      `anon SELECT ${table}`,
      leaked
        ? rows > 0
          ? `HTTP 200, ${rows} SATIR DÖNDÜ. Kolonlar: ${Object.keys(json[0]).slice(0, 10).join(", ")}`
          : `HTTP 200 / 0 satır — policy yok ama anon'un tablo ayrıcalığı hâlâ duruyor`
        : `HTTP ${status}`
    );
  }

  // Yazma: uygulamadaki hız sınırı, honeypot ve bot kontrollerini atlayan yol
  const soon = new Date(Date.now() + 864e5).toISOString();
  const probes = [
    ["appointments", { org_id: TENANT_A.orgId, customer_name: "izolasyon-probe", customer_phone: "5550000000", appointment_at: soon, duration_minutes: 30, status: "talep" }],
    ["waitlist", { org_id: TENANT_A.orgId, customer_name: "izolasyon-probe", customer_phone: "5550000000" }],
    ["customers", { org_id: TENANT_A.orgId, full_name: "izolasyon-probe", phone: "5550000000" }],
    ["organizations", { name: "izolasyon-probe", slug: `probe-${Date.now()}` }],
  ];
  for (const [table, row] of probes) {
    const { status, json } = await rest(table, { method: "POST", body: row, prefer: "return=representation" });
    const wrote = status === 200 || status === 201;
    if (wrote && json?.[0]?.id) orphanRows.push([table, json[0].id]);
    record(!wrote, `anon INSERT ${table}`, wrote ? `YAZDI (HTTP ${status})` : `HTTP ${status}`);
  }

  // SECURITY DEFINER fonksiyonlar anon'a açık mı? (RLS'i atlayan dolaylı yol)
  for (const fn of ["is_org_member", "my_org_role"]) {
    const { status } = await rest(`rpc/${fn}`, { method: "POST", body: { p_org: TENANT_A.orgId } });
    record(status !== 200, `anon RPC ${fn}()`, `HTTP ${status}`);
  }
}

// ═════════════════════════════════════════════════════════════
// KATMAN B — Kötü niyetli kiracı (asıl RLS testi)
// ═════════════════════════════════════════════════════════════
const ORG_SCOPED_TABLES = [
  "appointments", "customers", "staff", "services", "expenses",
  "recurring_expenses", "campaigns", "waitlist", "audit_logs",
  "appointment_requests", "consent_requests", "staff_invitations",
  "service_categories", "data_imports", "loyalty_redeems",
];

async function crossTenantRead(token, attacker, victim) {
  const own = await ownOrgIds(token);
  // 1) Hedefli okuma: doğrudan kurbanın org_id'siyle
  for (const table of ORG_SCOPED_TABLES) {
    const { status, json, rows } = await rest(`${table}?select=*&org_id=eq.${victim.orgId}&limit=5`, { token });
    const leaked = status === 200 && rows > 0;
    record(
      !leaked,
      `${attacker.label} → ${victim.label}: SELECT ${table}`,
      leaked ? `${rows} SATIR SIZDI. Kolonlar: ${Object.keys(json[0]).join(", ")}` : `HTTP ${status} / ${rows} satır`
    );
  }

  // 2) organizations: entegrasyon sırlarının (wa_token, sms_password…) durduğu tablo
  const org = await rest(`organizations?select=*&id=eq.${victim.orgId}`, { token });
  const secretCols = org.rows > 0
    ? Object.keys(org.json[0]).filter((k) => /token|password|secret|stripe/i.test(k))
    : [];
  record(
    org.rows === 0,
    `${attacker.label} → ${victim.label}: SELECT organizations`,
    org.rows > 0 ? `SIZDI — sır kolonları: ${secretCols.join(", ") || "(yok ama satır döndü)"}` : "0 satır"
  );

  // 3) Filtresiz tarama: bir tabloda RLS unutulmuşsa burada yakalanır
  for (const table of ORG_SCOPED_TABLES) {
    const { status, json } = await rest(`${table}?select=org_id&limit=500`, { token });
    if (status !== 200 || !Array.isArray(json)) {
      record(true, `${attacker.label}: filtresiz ${table} taraması`, `HTTP ${status}`);
      continue;
    }
    const foreign = [...new Set(json.map((r) => r.org_id))].filter((id) => id && !own.has(id));
    record(
      foreign.length === 0,
      `${attacker.label}: filtresiz ${table} taraması`,
      foreign.length ? `YABANCI org_id: ${foreign.slice(0, 3).join(", ")}` : `${json.length} satır, hepsi üyesi olduğu ${own.size} org içinde`
    );
  }

  // 4) Platform admin listesi
  const admins = await rest("platform_admins?select=*", { token });
  record(admins.rows === 0, `${attacker.label}: SELECT platform_admins`, `${admins.rows} satır`);
}

async function crossTenantWrite(token, attacker, victim) {
  const uid = await userId(token);

  // INSERT — kurbanın org'una müşteri yaz
  const ins = await rest("customers", {
    token, method: "POST", prefer: "return=representation",
    body: { org_id: victim.orgId, full_name: "izolasyon-testi-SILINMELI", phone: "5559999999" },
  });
  if (ins.status < 300 && ins.json?.[0]?.id) orphanRows.push(["customers", ins.json[0].id]);
  record(ins.status >= 300, `${attacker.label} → ${victim.label}: INSERT customers`, `HTTP ${ins.status}${ins.json?.code ? ` (${ins.json.code})` : ""}`);

  // UPDATE — kurbanın işletme adı
  const upd = await rest(`organizations?id=eq.${victim.orgId}`, {
    token, method: "PATCH", prefer: "return=representation",
    body: { name: "izolasyon-testi-SILINMELI" },
  });
  record(upd.rows === 0, `${attacker.label} → ${victim.label}: UPDATE organizations.name`, upd.rows > 0 ? "DEĞİŞTİRDİ — adı hemen geri alın!" : `HTTP ${upd.status} / 0 satır`);

  // UPDATE — bedava plan yükseltme
  const plan = await rest(`organizations?id=eq.${victim.orgId}`, {
    token, method: "PATCH", prefer: "return=representation",
    body: { plan: "business" },
  });
  record(plan.rows === 0, `${attacker.label} → ${victim.label}: UPDATE organizations.plan`, plan.rows > 0 ? "PLAN DEĞİŞTİ — ücretsiz yükseltme mümkün!" : `HTTP ${plan.status} / 0 satır`);

  // DELETE — kurbanın randevuları
  const del = await rest(`appointments?org_id=eq.${victim.orgId}`, {
    token, method: "DELETE", prefer: "return=representation",
  });
  record(del.rows === 0, `${attacker.label} → ${victim.label}: DELETE appointments`, del.rows > 0 ? `${del.rows} RANDEVU SİLİNDİ — yedekten dönün!` : `HTTP ${del.status} / 0 satır`);

  // Yetki yükseltme — kendini kurbanın org'una owner ekle
  const mem = await rest("org_members", {
    token, method: "POST", prefer: "return=representation",
    body: { org_id: victim.orgId, user_id: uid, role: "owner" },
  });
  if (mem.status < 300 && mem.json?.[0]?.id) orphanRows.push(["org_members", mem.json[0].id]);
  record(mem.status >= 300, `${attacker.label} → ${victim.label}: kendini owner ekleme`, mem.status < 300 ? "EKLENDİ — salon tamamen devralınabilir!" : `HTTP ${mem.status}`);

  // Platform admin olma
  const pa = await rest("platform_admins", {
    token, method: "POST", prefer: "return=representation",
    body: { user_id: uid, email: attacker.email },
  });
  if (pa.status < 300 && pa.json?.[0]?.user_id) orphanRows.push(["platform_admins", pa.json[0].user_id]);
  record(pa.status >= 300, `${attacker.label}: platform_admins'e kendini ekleme`, pa.status < 300 ? "EKLENDİ — platform devralınabilir!" : `HTTP ${pa.status}`);
}

async function layerB() {
  layer("KATMAN B — Kötü niyetli kiracı (çapraz-kiracı RLS testi)");

  const tokenA = await signIn(TENANT_A);
  const tokenB = await signIn(TENANT_B);

  // Her iki yön de denenir — policy'ler bazen tek yönlü bozulur
  await crossTenantRead(tokenA, TENANT_A, TENANT_B);
  await crossTenantRead(tokenB, TENANT_B, TENANT_A);
  await crossTenantWrite(tokenA, TENANT_A, TENANT_B);
  await crossTenantWrite(tokenB, TENANT_B, TENANT_A);
}

// ═════════════════════════════════════════════════════════════
// KATMAN C — Uygulama katmanı (service_role uçları)
// ═════════════════════════════════════════════════════════════
const SECRET_KEY_RE = /(wa_token|sms_password|ig_page_access_token|google_calendar_token|stripe_customer_id|stripe_subscription_id|cancel_token|commission_rate|base_salary|signup_ip|service_role|secret)/i;

function findSecrets(node, path = "", hits = []) {
  if (node === null || typeof node !== "object") return hits;
  for (const [k, v] of Object.entries(node)) {
    const p = path ? `${path}.${k}` : k;
    if (SECRET_KEY_RE.test(k)) hits.push(p);
    if (v && typeof v === "object") findSecrets(v, p, hits);
  }
  return hits;
}

async function layerC() {
  layer(`KATMAN C — Uygulama katmanı (${APP_BASE})`);

  // C1 — herkese açık salon ucu sır sızdırıyor mu? (kolon beyaz listesi testi)
  for (const t of [TENANT_A, TENANT_B]) {
    const res = await fetch(`${APP_BASE}/api/public/salon?slug=${t.slug}`);
    const json = await res.json().catch(() => ({}));
    const hits = findSecrets(json);
    record(hits.length === 0, `/api/public/salon?slug=${t.slug}`, hits.length ? `SIZDI: ${hits.join(", ")}` : `HTTP ${res.status}, hassas alan yok`);
  }

  // C2 — A kiracısı olarak panele giriş
  const loginRes = await fetch(`${APP_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: APP_BASE },
    body: JSON.stringify({ identifier: TENANT_A.email, password: TENANT_A.password }),
  });
  const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!loginRes.ok || !cookie) {
    record(false, "KATMAN C girişi", `A kiracısı giriş yapamadı (HTTP ${loginRes.status}) — C testleri atlandı`);
    return;
  }

  // C3 — platform admin ucu, normal kiracıyla
  const adminRes = await fetch(`${APP_BASE}/api/admin/orgs/${TENANT_B.orgId}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json", Origin: APP_BASE },
    body: JSON.stringify({ plan: "business" }),
  });
  record([401, 403].includes(adminRes.status), `PATCH /api/admin/orgs/<başka salon> (yetkisiz kiracı)`, `HTTP ${adminRes.status}`);

  // C4 — active_org çerezi sahteciliği (IDOR): çerez kullanıcı kontrolündedir
  const spoofed = `${cookie.replace(/(^|; )active_org=[^;]*/g, "")}; active_org=${TENANT_B.orgId}`;
  for (const path of ["/api/customers", "/api/appointments", "/api/staff", "/api/expenses", "/api/campaigns"]) {
    const res = await fetch(`${APP_BASE}${path}`, { headers: { Cookie: spoofed, Origin: APP_BASE } });
    if (res.status === 404) { record(true, `active_org sahteciliği → GET ${path}`, "uç yok (404)"); continue; }
    const body = await res.text();
    const leaked = res.status === 200 && body.includes(TENANT_B.orgId);
    record(!leaked, `active_org sahteciliği → GET ${path}`, leaked ? `${TENANT_B.label} verisi döndü!` : `HTTP ${res.status}`);
  }

  // C5 — CSRF: yabancı Origin'den yazma
  const csrf = await fetch(`${APP_BASE}/api/customers`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json", Origin: "https://evil.example" },
    body: JSON.stringify({ full_name: "csrf-probe", phone: "5550000001" }),
  });
  record(csrf.status === 403, "CSRF: evil.example kaynağından POST /api/customers", `HTTP ${csrf.status}`);

  // C6 — CSP başlıkları (Faz 1 doğrulaması)
  for (const path of ["/", "/dashboard", "/auth/giris"]) {
    const res = await fetch(`${APP_BASE}${path}`, { redirect: "manual", headers: { Cookie: cookie } });
    const raw = res.headers.get("content-security-policy");
    if (!raw) { record(false, `CSP: ${path}`, `başlık YOK (HTTP ${res.status})`); continue; }
    const scriptSrc = raw.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src")) ?? "";
    const hasNonce = scriptSrc.includes("'nonce-");
    const unsafeInline = scriptSrc.includes("'unsafe-inline'");
    const unsafeEval = scriptSrc.includes("'unsafe-eval'");
    const isPanel = path.startsWith("/dashboard") || path.startsWith("/admin");
    // Panelde: nonce olmalı, unsafe-inline OLMAMALI. Diğer yerlerde en azından
    // unsafe-eval bulunmamalı.
    const ok = isPanel ? hasNonce && !unsafeInline && !unsafeEval : !unsafeEval;
    record(ok, `CSP: ${path}`, `nonce=${hasNonce}, unsafe-inline=${unsafeInline}, unsafe-eval=${unsafeEval}`);
  }

  // C7 — çift CSP başlığı kontrolü (next.config + proxy ikilemesi)
  const dup = await fetch(`${APP_BASE}/dashboard`, { redirect: "manual", headers: { Cookie: cookie } });
  const all = dup.headers.getSetCookie ? [...dup.headers].filter(([k]) => k.toLowerCase() === "content-security-policy") : [];
  record(all.length <= 1, "Tek Content-Security-Policy başlığı", `${all.length} başlık bulundu`);
}

// ═════════════════════════════════════════════════════════════
async function main() {
  console.log(`\nSupabase : ${SUPABASE_URL}`);
  console.log(`Uygulama : ${APP_BASE ?? "(atlandı — --base=... ile verin)"}`);

  await layerA();
  await layerB();
  if (APP_BASE) await layerC();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"═".repeat(74)}`);
  console.log(`TOPLAM ${results.length} test — \x1b[32m${results.length - failed.length} geçti\x1b[0m, ${failed.length ? `\x1b[31m${failed.length} başarısız\x1b[0m` : "0 başarısız"}`);

  if (failed.length) {
    console.log("\n\x1b[31mBAŞARISIZ TESTLER\x1b[0m");
    for (const f of failed) {
      console.log(`  [${f.layer.split("—")[0].trim()}] ${f.title}`);
      console.log(`      ${f.detail}`);
    }
  } else {
    console.log("\x1b[32mHiçbir katmanda çapraz-kiracı sızıntısı bulunamadı.\x1b[0m");
  }

  if (orphanRows.length) {
    console.log("\n\x1b[31mTest sırasında YAZILAN satırlar (izolasyon bozuk) — elle silin:\x1b[0m");
    for (const [table, id] of orphanRows) {
      console.log(`  delete from ${table} where ${table === "platform_admins" ? "user_id" : "id"} = '${id}';`);
    }
  }

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("\nTest çalıştırılamadı:", err.message);
  process.exit(2);
});
