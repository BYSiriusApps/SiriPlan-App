#!/usr/bin/env node
/**
 * CSP FAZ 2 — GERÇEK TARAYICIDA İHLAL TARAMASI
 * =============================================
 *
 * NEDEN VAR: tenant-isolation.mjs yalnızca Content-Security-Policy BAŞLIĞINI
 * okur — "nonce var mı, unsafe-inline yok mu" der. Ama politikanın sayfayı
 * gerçekten BOZUP BOZMADIĞINI söyleyemez. Bir script nonce'suz kaldıysa,
 * curl bunu 200 olarak görür; kullanıcı ise çalışmayan bir buton görür.
 *
 * Bu betik sayfaları gerçek bir tarayıcıda açar ve şunları toplar:
 *   • securitypolicyviolation olayları (hangi direktif, hangi kaynak engellendi)
 *   • konsol hataları
 *   • yakalanmamış JS istisnaları
 *   • başarısız ağ istekleri
 *
 * YAN ETKİ YOK: formlar DOLDURULMAZ ve GÖNDERİLMEZ. Randevu oluşturma,
 * Stripe ödeme başlatma gibi para/bildirim tetikleyen hiçbir eylem yapılmaz —
 * yalnızca sayfalar açılır ve script'lerin çalışıp çalışmadığına bakılır.
 *
 * KULLANIM
 *   node scripts/security/csp-scan.mjs
 *   node scripts/security/csp-scan.mjs --base=http://localhost:3000
 *   node scripts/security/csp-scan.mjs --browser=webkit     (Safari motoru)
 *   node scripts/security/csp-scan.mjs --headed             (tarayıcıyı göster)
 *
 * WEBKIT NEDEN ÖNEMLİ: Safari 15.4'ten önceki sürümler 'strict-dynamic'
 * desteklemez ve script-src'deki alan adı listesine düşer (bkz. lib/csp.ts).
 * Chromium'da geçen bir politika WebKit'te kırılabilir.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* .env.local yoksa devam */ }
}
loadEnv();

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const BROWSER = arg("browser", "chromium");
const HEADED = process.argv.includes("--headed");

const LOGIN = {
  identifier: "sahip.demo@siriplan.com",
  password: "Sahip!2026Demo",
};
const DEMO_SLUG = "sirius-demo-salon";

// Gezilecek sayfalar. "auth" = oturum gerektirir.
const ROUTES = [
  { path: "/", auth: false, note: "pazarlama ana sayfa" },
  { path: "/fiyatlar", auth: false, note: "pazarlama" },
  { path: "/auth/giris", auth: false, note: "giriş formu" },
  { path: `/r/${DEMO_SLUG}`, auth: false, note: "MÜŞTERİ randevu sayfası" },
  { path: "/dashboard", auth: true, note: "panel ana" },
  { path: "/dashboard/takvim", auth: true, note: "takvim (ağır JS)" },
  { path: "/dashboard/randevular", auth: true, note: "randevu listesi" },
  { path: "/dashboard/randevular/yeni", auth: true, note: "randevu FORMU (gönderilmez)" },
  { path: "/dashboard/musteriler", auth: true, note: "müşteriler" },
  { path: "/dashboard/personel", auth: true, note: "personel" },
  { path: "/dashboard/hizmetler", auth: true, note: "hizmetler" },
  { path: "/dashboard/raporlar", auth: true, note: "raporlar (grafikler/recharts)" },
  { path: "/dashboard/gelir-gider", auth: true, note: "gelir-gider (grafikler)" },
  { path: "/dashboard/kampanyalar", auth: true, note: "kampanyalar" },
  { path: "/dashboard/bekleme-listesi", auth: true, note: "bekleme listesi" },
  { path: "/dashboard/ayarlar", auth: true, note: "ayarlar" },
  { path: "/dashboard/website-ayarlari", auth: true, note: "website ayarları (yükleme)" },
  { path: "/dashboard/abonelik", auth: true, note: "abonelik (Stripe — tıklanmaz)" },
  { path: "/dashboard/veri-gocu", auth: true, note: "veri göçü (içe/dışa aktarma)" },
];

// Tarayıcıya, sayfa script'lerinden ÖNCE enjekte edilir: ihlal olayları
// belgenin ilk anından itibaren yakalanmalı, aksi halde en kritik olan
// bootstrap script'i engellemesi kaçar.
const VIOLATION_HOOK = `
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__cspViolations.push({
      directive: e.effectiveDirective || e.violatedDirective,
      blockedURI: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      sample: (e.sample || '').slice(0, 120),
      disposition: e.disposition,
    });
  });
`;

const findings = [];
// upgrade-insecure-requests yüzünden alt kaynakları hiç yüklenmemiş, dolayısıyla
// sonucu anlamsız olan rotalar (bkz. sslUpgradeFailures kontrolü).
const inconclusive = new Set();
function add(route, kind, detail) {
  findings.push({ route, kind, detail });
}

/**
 * Playwright'ı projeye bağımlılık olarak EKLEMEDEN çözer.
 *
 * NEDEN: bu betik güvenlik denetimi için ara sıra çalıştırılır; üretim
 * paketine veya package.json'a kalıcı bir dev bağımlılık eklemesi gerekmiyor.
 * Sırayla denenir: normal çözümleme → PLAYWRIGHT_DIR ortam değişkeni →
 * npx önbelleği (npx playwright ... ile bir kez indirilmişse orada durur).
 */
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch { /* projede kurulu değil — aşağıda aranır */ }

  const { pathToFileURL } = await import("node:url");
  const { existsSync, readdirSync } = await import("node:fs");
  const { join } = await import("node:path");

  const candidates = [];
  if (process.env.PLAYWRIGHT_DIR) candidates.push(process.env.PLAYWRIGHT_DIR);

  const npxCache = join(
    process.env.LOCALAPPDATA || process.env.HOME || "",
    process.env.LOCALAPPDATA ? "npm-cache/_npx" : ".npm/_npx"
  );
  if (existsSync(npxCache)) {
    for (const dir of readdirSync(npxCache)) {
      candidates.push(join(npxCache, dir, "node_modules/playwright"));
    }
  }

  for (const c of candidates) {
    const entry = join(c, "index.mjs");
    const cjs = join(c, "index.js");
    for (const file of [entry, cjs]) {
      if (existsSync(file)) {
        try {
          return await import(pathToFileURL(file).href);
        } catch { /* sonraki adaya geç */ }
      }
    }
  }

  throw new Error(
    "playwright bulunamadı. Kurmak için: npx playwright@1.62.1 install chromium | " +
    "veya kurulu bir dizini gösterin: PLAYWRIGHT_DIR=/yol/node_modules/playwright"
  );
}

async function main() {
  const pwMod = await loadPlaywright();
  const pw = pwMod.default ?? pwMod;
  const engine = pw[BROWSER];
  if (!engine) {
    console.error(`Bilinmeyen tarayıcı: ${BROWSER} (chromium | firefox | webkit)`);
    process.exit(2);
  }

  console.log(`\nHedef   : ${BASE}`);
  console.log(`Tarayıcı: ${BROWSER}\n`);

  const browser = await engine.launch({ headless: !HEADED });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.addInitScript(VIOLATION_HOOK);

  // ─── Oturum aç (API üzerinden — giriş formunu doldurmaya gerek yok) ───
  const api = await context.request.post(`${BASE}/api/auth/login`, {
    headers: { "Content-Type": "application/json", Origin: BASE },
    data: LOGIN,
  });
  const loggedIn = api.ok();
  console.log(loggedIn ? "Oturum açıldı.\n" : `UYARI: giriş başarısız (HTTP ${api.status()}) — panel sayfaları atlanacak.\n`);

  for (const route of ROUTES) {
    if (route.auth && !loggedIn) continue;

    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
    });
    page.on("pageerror", (err) => pageErrors.push(String(err.message).slice(0, 200)));
    page.on("requestfailed", (req) => {
      const f = req.failure();
      const url = req.url();
      // Next.js, next/link görünür olduğunda RSC ön-getirmesi başlatır ve sayfa
      // kapanınca bunları iptal eder. Ortaya çıkan ERR_ABORTED bir arıza değil,
      // normal yaşam döngüsü — süzülmezse gerçek bulgular yüzlerce satırın
      // altında kaybolur.
      if (url.includes("_rsc=") && f?.errorText === "net::ERR_ABORTED") return;
      failedRequests.push(`${req.method()} ${url.slice(0, 110)} — ${f?.errorText ?? "?"}`);
    });

    let status = "?";
    let cspHeader = "";
    try {
      const resp = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 45000 });
      status = resp?.status() ?? "?";
      cspHeader = resp?.headers()["content-security-policy"] ?? "";
    } catch (err) {
      add(route.path, "GEZINME", String(err.message).slice(0, 160));
    }

    // React'in hidrasyonu ve afterInteractive script'leri için kısa bekleme
    await page.waitForTimeout(1200);

    const violations = await page.evaluate(() => window.__cspViolations ?? []).catch(() => []);
    // Sayfa gerçekten canlandı mı? Hidrasyon olmadıysa CSP script'leri
    // engellemiş olabilir — 200 dönmesi tek başına bir şey ifade etmez.
    const hydrated = await page
      .evaluate(() => !!document.querySelector("body")?.innerHTML?.trim() && document.readyState === "complete")
      .catch(() => false);

    const nonceInHtml = /'nonce-/.test(cspHeader);
    // Report-only ihlaller HİÇBİR ŞEYİ KIRMAZ — aday politika için kanıt
    // toplarlar. Yalnızca enforce edilen ihlaller ve JS hataları kırmızıdır;
    // ikisini aynı sayaçta göstermek "panel bozuldu" izlenimi veriyordu.
    const enforced = violations.filter((v) => v.disposition !== "report");
    const reported = violations.length - enforced.length;
    const flag = enforced.length || pageErrors.length ? "[31m✗[0m" : "[32m✓[0m";
    console.log(
      `${flag} ${String(status).padEnd(4)} ${route.path.padEnd(34)} ${nonceInHtml ? "nonce" : "     "}  engel:${String(enforced.length).padStart(2)}  rapor:${String(reported).padStart(3)}  jsHata:${String(pageErrors.length).padStart(2)}  ${route.note}`
    );

    for (const v of violations) {
      add(route.path, `CSP-${v.disposition === "report" ? "RAPOR" : "ENGEL"}`, `${v.directive} → ${v.blockedURI || "(inline)"}${v.sample ? ` | örnek: ${v.sample}` : ""}${v.sourceFile ? ` | ${v.sourceFile}:${v.lineNumber}` : ""}`);
    }
    for (const e of pageErrors) add(route.path, "JS-HATA", e);
    for (const e of consoleErrors) add(route.path, "KONSOL", e);
    for (const r of failedRequests) add(route.path, "AG", r);

    // upgrade-insecure-requests, http://localhost'u https'e yükseltir. Chromium
    // localhost'u bu kuraldan muaf tutar, WebKit tutmaz — script'ler "SSL connect
    // error" ile hiç yüklenmez. Böyle bir turda "0 ihlal" GÜVENİLİR DEĞİLDİR:
    // ihlal yoktur çünkü çalışan kod yoktur.
    if (failedRequests.some((r) => /SSL connect error/.test(r))) inconclusive.add(route.path);
    if (!hydrated) add(route.path, "HIDRASYON", "sayfa gövdesi boş veya yüklenmedi");

    await page.close();
  }

  await browser.close();

  // ─── Rapor ───────────────────────────────────────────────────
  console.log(`\n${"═".repeat(78)}`);
  const byKind = {};
  for (const f of findings) (byKind[f.kind] ??= []).push(f);

  // Konsol gürültüsü (404 favicon, üçüncü taraf uyarıları) ihlal değildir;
  // ayrı gösterilir ki gerçek CSP kırılmaları kaybolmasın.
  const blocking = findings.filter((f) => f.kind.startsWith("CSP-ENGEL") || f.kind === "JS-HATA" || f.kind === "HIDRASYON");

  if (inconclusive.size) {
    console.log(
      `[33mUYARI: ${inconclusive.size} rotada alt kaynaklar "SSL connect error" ile düştü.[0m
` +
      `  Sebep: CSP'deki upgrade-insecure-requests http://localhost'u https'e yükseltiyor,
` +
      `  yerel sunucuda TLS yok. Bu turda script'ler hiç çalışmadı; "0 ihlal" ANLAMLI DEĞİL.
` +
      `  Bu motoru https bir adrese karşı çalıştırın:
` +
      `      node scripts/security/csp-scan.mjs --base=https://siriplan.com --browser=${BROWSER}
`
    );
  }

  if (blocking.length === 0) {
    console.log(inconclusive.size ? "[33mEngelleyici bulgu yok — ama yukarıdaki uyarı nedeniyle bu tur kesin sayılmaz.[0m" : "[32mCSP kaynaklı engelleme veya JS hatası yok.[0m");
  } else {
    console.log(`\x1b[31m${blocking.length} ENGELLEYİCİ BULGU\x1b[0m`);
    for (const f of blocking) console.log(`  [${f.kind}] ${f.route}\n      ${f.detail}`);
  }

  const informational = findings.filter((f) => !blocking.includes(f));
  if (informational.length) {
    console.log(`\n\x1b[2mBilgi amaçlı (${informational.length}) — engelleyici değil:\x1b[0m`);
    const seen = new Set();
    for (const f of informational) {
      const key = `${f.kind}|${f.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  \x1b[2m[${f.kind}] ${f.route} — ${f.detail}\x1b[0m`);
    }
  }

  process.exit(blocking.length ? 1 : 0);
}

main().catch((err) => {
  console.error("\nTarama çalıştırılamadı:", err.message);
  process.exit(2);
});
