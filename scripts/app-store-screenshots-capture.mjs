// Apple'ın 2.3.10 reddi ("non-iOS device images") sonrası: eski App Store
// ekran görüntüleri Play Store promosyon görsellerinden (Android tipi telefon
// mockup'ı içeren) türetilmişti. Bu script bunun yerine canlı siteden,
// HİÇBİR cihaz çerçevesi olmadan, doğrudan hedef piksel boyutunda (gerçek
// cihaz viewport'u + deviceScaleFactor) çerçevesiz ekran görüntüsü alır.
//
// MOBILE_APP_UA_MARKER ("SiriPlanApp") user-agent'a eklenir ki site native
// uygulama modunda render etsin (çerez bandı gizli, mobil-özel davranışlar
// aktif) — gerçek App Store ekran görüntüsü ne gösterecekse onu yakalar.
//
// Kullanım: node scripts/app-store-screenshots-capture.mjs

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://www.siriplan.com";
const DEMO_EMAIL = "sahip.demo@siriplan.com";
const DEMO_PASSWORD = process.env.SCREENSHOT_DEMO_PASSWORD || "Sahip!2026Demo";

// Apple 2.3.10 (3. parti platform adları) + 5.2.5 (Apple marka adları) taraması:
// çekilen sayfanın görünür metninde bu terimlerden biri varsa sayfa ATLANIR
// (dosya yazılmaz) ve uyarı basılır. "Sirius/SiriusPlan/SiriPlan" bilinçli
// olarak dışarıda: bunlar bizim marka adımız.
const BANNED = /whatsapp|instagram|telegram|facebook|tiktok|android|google|\bwa\b|siri(?!us|plan)/gi;

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 SiriPlanApp";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 SiriPlanApp";

const DEVICES = [
  {
    key: "iphone",
    // App Store Connect bu hesapta 6.9" (1320x2868) değil, 6.5" Display
    // boyutunu istiyor (Media Manager ekranında görülen kabul listesi):
    // 1242x2688, 2688x1242, 1284x2778 veya 2778x1284. En yüksek çözünürlüklü
    // seçeneği (1284x2778) kullanıyoruz.
    outDir: path.resolve("docs/app-store/screenshots-iphone-1284x2778"),
    prefix: "app-store",
    width: 1284,
    height: 2778,
    // iPhone 13/14/15 Pro Max mantıksal nokta boyutu (428x926) x 3 = 1284x2778
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    userAgent: IPHONE_UA,
  },
  {
    key: "ipad",
    outDir: path.resolve("docs/app-store/screenshots-ipad-2064x2752"),
    prefix: "app-store-ipad",
    width: 2064,
    height: 2752,
    // iPad 13" mantıksal nokta boyutu (1032x1376) x 2 = 2064x2752 — bu boyut
    // Media Manager'ın kabul listesinde birebir var, değişiklik gerekmiyor.
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
    userAgent: IPAD_UA,
  },
];

const PAGES = [
  { num: "01", slug: "anasayfa", path: "/dashboard" },
  { num: "02", slug: "takvim", path: "/dashboard/takvim" },
  {
    num: "03",
    slug: "takvimay",
    path: "/dashboard/takvim",
    afterLoad: async (page) => {
      // Sayfa hydrate olmadan tıklama kaçabiliyor (bir çalıştırmada Ay seçilmeden
      // Personel görünümü çekilmişti). Tıkla → ay ızgarasının geldiğini DOĞRULA,
      // olmazsa tekrar dene; hiç olmazsa hata fırlat (yanlış görsel yazılmasın).
      const isMonthView = () =>
        page.evaluate(() => {
          const t = document.body.innerText;
          return /\bPzt\b/.test(t) && /\bPaz\b/.test(t) && !/\bSAAT\b/.test(t);
        });
      for (let attempt = 1; attempt <= 4; attempt++) {
        await page.waitForTimeout(1500);
        await page.getByText(/^(Ay|Month)$/).first().click();
        await page.waitForTimeout(1000);
        if (await isMonthView()) {
          await page.mouse.move(0, 0); // hover vurgusu görüntüye girmesin
          await page.waitForTimeout(300);
          return;
        }
      }
      throw new Error("Ay görünümüne geçilemedi");
    },
  },
  { num: "04", slug: "musteriler", path: "/dashboard/musteriler" },
  { num: "05", slug: "hizmetler", path: "/dashboard/hizmetler" },
  { num: "06", slug: "personel", path: "/dashboard/personel" },
  { num: "07", slug: "stok", path: "/dashboard/stok" },
  { num: "08", slug: "kampanyalar", path: "/dashboard/kampanyalar" },
  { num: "09", slug: "paketler", path: "/dashboard/paketler" },
  // Aşağıdakiler (Gelir-Gider bu ayki verisi boş/sıfır olduğu için hiç listelenmedi) demo veride yasaklı terim (ör. "Bysiri" hizmet adı) içerdiği
  // sürece taramada otomatik atlanır; veri düzelince kendiliğinden çıkar.
  { num: "10", slug: "randevular", path: "/dashboard/randevular" },
  { num: "12", slug: "raporlar", path: "/dashboard/raporlar" },
];

async function dismissCookieBanner(page) {
  const acceptButton = page.getByRole("button", { name: /kabul|accept/i }).first();
  try {
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // banner yoksa sorun değil
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/auth/giris`, { waitUntil: "load" });
  await dismissCookieBanner(page);
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", DEMO_PASSWORD);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Demo hesabın kayıtlı paneldili İngilizce olabiliyor; dil hesap kaydına
  // (preferred_language) bağlı, sade çerez enjeksiyonu yeterli olmuyor.
  // Gerçek kullanıcı akışını taklit et: Hesabım sayfasında dili Türkçe'ye
  // çevirip kaydet — bu hem DB'yi hem NEXT_LOCALE çerezini günceller.
  await page.goto(`${BASE_URL}/dashboard/hesabim`, { waitUntil: "load" });
  await dismissCookieBanner(page);
  const combobox = page.getByRole("combobox").last();
  if (await combobox.count()) {
    await combobox.click();
    await page.waitForTimeout(300);
    const trOption = page.getByRole("option", { name: /Türkçe/i }).first();
    if (await trOption.count()) {
      await trOption.click();
      await page.waitForTimeout(300);
      const saveButton = page.getByRole("button", { name: /Kaydet|Save/i }).first();
      if (await saveButton.count()) {
        await saveButton.click();
        // Form dil değişince ~600ms sonra kendi kendine reload ediyor; o
        // navigasyonun bitmesini bekle, yoksa hemen ardından gelen goto()
        // ile yarışıp ERR_ABORTED veriyor.
        await page.waitForTimeout(1000);
        await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }
}

async function captureDevice(browser, device) {
  await mkdir(device.outDir, { recursive: true });
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    userAgent: device.userAgent,
    locale: "tr-TR",
  });
  const page = await context.newPage();
  await login(page);

  // SCREENSHOT_ONLY=takvimay,stok → yalnızca bu sayfaları (yeniden) çek.
  const only = (process.env.SCREENSHOT_ONLY || "").split(",").filter(Boolean);
  for (const item of PAGES) {
    if (only.length && !only.includes(item.slug)) continue;
    // networkidle realtime abonelikler (Supabase/websocket) yüzünden hiç
    // tetiklenmeyebiliyor (bkz. musteriler sayfası timeout) — "load" + sabit
    // bekleme daha güvenilir.
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "load", timeout: 45000 });
    await dismissCookieBanner(page);
    await page.waitForTimeout(1200);
    if (item.afterLoad) {
      try {
        await item.afterLoad(page);
      } catch (err) {
        console.warn(`  [ATLANDI] ${item.slug} afterLoad başarısız: ${err.message}`);
        continue;
      }
    }
    const pageText = await page.evaluate(() => document.body.innerText);
    const hits = [...pageText.matchAll(BANNED)].map((m) => m[0].toLowerCase());
    // SCREENSHOT_ALLOW_BANNED=randevular,raporlar → yalnızca bu sayfalar terime rağmen çekilir
    // (UYARI basılır). Demo veri temizlenmeden bu dosyaları App Store'a YÜKLEMEYİN.
    const allowed = (process.env.SCREENSHOT_ALLOW_BANNED || "").split(",").includes(item.slug);
    if (hits.length && allowed) {
      console.warn(`  [UYARI] ${item.slug}: yasaklı terim var (${[...new Set(hits)].join(", ")}) ama izinli — yüklemeden önce demo veriyi temizle`);
    } else if (hits.length) {
      console.warn(`  [ATLANDI] ${item.slug}: yasaklı terim ${[...new Set(hits)].join(", ")}`);
      continue;
    }
    const filename =
      device.key === "iphone"
        ? `${device.prefix}-${item.num}-${item.slug}-${device.width}x${device.height}.png`
        : `${device.prefix}-${item.num}-${item.slug}-${device.width}x${device.height}.png`;
    const outPath = path.join(device.outDir, filename);
    await page.screenshot({ path: outPath });
    console.log(`  ✓ ${filename}`);
  }

  await context.close();
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const device of DEVICES) {
      console.log(`\n== ${device.key} (${device.width}x${device.height}) ==`);
      await captureDevice(browser, device);
    }
  } finally {
    await browser.close();
  }
  console.log("\nTamamlandı.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
