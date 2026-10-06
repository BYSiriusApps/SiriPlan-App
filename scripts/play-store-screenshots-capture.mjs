// Play Store ekran görüntüleri: canlı siteden, cihaz çerçevesiz, Android
// telefon/tablet viewport'u ile doğrudan hedef piksel boyutunda çekilir.
// Play kuralları: JPEG/24-bit PNG (alfa yok), kenarlar 320-3840 px, uzun kenar
// kısa kenarın en çok 2 katı, türü başına en çok 8 görsel. Telefon 1080x1920
// (9:16), 10" tablet 1600x2560.
// (App Store betiğinden türetildi; Apple'a özgü yasaklı-terim taraması ve
// "SiriPlanApp" UA işaretçisi yok — Play'deki TWA düz Chrome UA'sı kullanır.)
//
// Kullanım: node scripts/play-store-screenshots-capture.mjs
//   SCREENSHOT_ONLY=takvim,stok  → yalnızca bu sayfalar
//   SCREENSHOT_DEVICE=phone|tablet → yalnızca bu cihaz

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://www.siriplan.com"; // yerel production build için: SCREENSHOT_BASE_URL=http://localhost:3100
const DEMO_EMAIL = "sahip.demo@siriplan.com";
// Şifre depoya yazılmaz: SCREENSHOT_DEMO_PASSWORD ortam değişkeniyle verilir.
const DEMO_PASSWORD = process.env.SCREENSHOT_DEMO_PASSWORD;
if (!DEMO_PASSWORD) throw new Error("SCREENSHOT_DEMO_PASSWORD ortam değişkeni gerekli");

// Apple 2.3.10 (3. parti platform adları) + 5.2.5 (Apple marka adları) taraması:
// çekilen sayfanın görünür metninde bu terimlerden biri varsa sayfa ATLANIR
// (dosya yazılmaz) ve uyarı basılır. "Sirius/SiriusPlan/SiriPlan" bilinçli
// olarak dışarıda: bunlar bizim marka adımız.
const BANNED = /bysiri/gi; // Play için tek sorun: demo veri kalıntısı

const PHONE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const TABLET_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const DEVICES = [
  {
    key: "phone",
    outDir: path.resolve("docs/play-store/screenshots/telefon"),
    prefix: "play-telefon",
    width: 1080,
    height: 1920,
    viewport: { width: 360, height: 640 }, // x3 = 1080x1920
    deviceScaleFactor: 3,
    userAgent: PHONE_UA,
    isMobile: true,
    hasTouch: true,
  },
  {
    // Promo mockup'ı için ham ekran (telefon çerçevesinin iç oranı ~0.472).
    key: "promo",
    outDir: path.resolve(process.env.PROMO_RAW_DIR || "docs/play-store/_promo-ham"),
    prefix: "ham",
    width: 720,
    height: 1524,
    viewport: { width: 360, height: 762 }, // x2 = 720x1524
    deviceScaleFactor: 2,
    userAgent: PHONE_UA,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "tablet",
    outDir: path.resolve("docs/play-store/screenshots/tablet-10inc"),
    prefix: "play-tablet10",
    width: 1600,
    height: 2560,
    viewport: { width: 800, height: 1280 }, // x2 = 1600x2560
    deviceScaleFactor: 2,
    userAgent: TABLET_UA,
  },
];

const PAGES = [
  { num: "01", slug: "anasayfa", path: "/dashboard" },
  {
    num: "02",
    slug: "takvim",
    path: `/dashboard/takvim?date=${process.env.CAL_DATE || "2026-09-24"}&view=staff`, // dolu bir gün (9 randevu, 5 personel)
    // Personel bazlı takvim (sütunlar = personel). Görünüm tercihi hesaba göre
    // değişebildiği için her çalıştırmada AÇIKÇA seçilir ve doğrulanır; doğrulanamazsa
    // dosya yazılmaz (yanlış görünümde görsel çıkmasın).
    afterLoad: async (page) => {
      const isPersonelView = () =>
        page.evaluate(() => {
          const t = document.body.innerText;
          return /\bSAAT\b/.test(t) && (t.match(/\b\d+ randevu\b/g) || []).length >= 2;
        });
      for (let attempt = 1; attempt <= 4; attempt++) {
        await page.waitForTimeout(1500);
        if (!(await isPersonelView())) {
          await page.getByRole("button", { name: /Personel/ }).first().click();
          await page.waitForTimeout(1000);
        }
        if (await isPersonelView()) {
          await page.mouse.move(0, 0); // hover vurgusu görüntüye girmesin
          await page.waitForTimeout(300);
          return;
        }
      }
      throw new Error("Personel görünümüne geçilemedi");
    },
  },
  { num: "04", slug: "musteriler", path: "/dashboard/musteriler" },
  { num: "05", slug: "hizmetler", path: "/dashboard/hizmetler" },
  { num: "06", slug: "personel", path: "/dashboard/personel" },
  { num: "07", slug: "stok", path: "/dashboard/stok", settle: 3000 }, // liste istemci tarafında yüklenir
  { num: "08", slug: "kampanyalar", path: "/dashboard/kampanyalar" },
  { num: "09", slug: "paketler", path: "/dashboard/paketler", settle: 3000 },
  // Aşağıdakiler (Gelir-Gider bu ayki verisi boş/sıfır olduğu için hiç listelenmedi) demo veride yasaklı terim (ör. "Bysiri" hizmet adı) içerdiği
  // sürece taramada otomatik atlanır; veri düzelince kendiliğinden çıkar.
  { num: "11", slug: "gelirgider", path: "/dashboard/gelir-gider", settle: 3000 },
  { num: "10", slug: "randevular", path: "/dashboard/randevular" },
  { num: "12", slug: "raporlar", path: `/dashboard/raporlar?gun=${process.env.REPORT_DAY || "2026-09-26"}` }, // ciro > gider olan gün
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
    isMobile: !!device.isMobile,
    hasTouch: !!device.hasTouch,
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
    await page.waitForTimeout(item.settle ?? 1200);
    if (item.afterLoad) {
      try {
        await item.afterLoad(page);
      } catch (err) {
        console.warn(`  [ATLANDI] ${item.slug} afterLoad başarısız: ${err.message}`);
        continue;
      }
    }
    // Demo veride kalan "onay bekliyor" / "kritik stok" şeritleri mağaza
    // görselinde yer kaplıyor; yalnızca görüntü için DOM'dan kaldırılır (uygulama koduna dokunulmaz).
    await page.evaluate(() => {
      document.querySelectorAll("div").forEach((el) => {
        if (/bg-(rose-600|amber-500)/.test(el.className) && /onayınızı bekliyor|Kritik Stok Uyarısı/.test(el.textContent || "")) el.remove();
      });
    });
    await page.waitForTimeout(300);
    const pageText = await page.evaluate(() => document.body.innerText);
    const hits = [...pageText.matchAll(BANNED)].map((m) => m[0].toLowerCase());
    // SCREENSHOT_ALLOW_BANNED=randevular,raporlar → yalnızca bu sayfalar terime rağmen çekilir
    // (UYARI basılır). Demo veri temizlenmeden bu dosyaları App Store'a YÜKLEMEYİN.
    const allowed = (process.env.SCREENSHOT_ALLOW_BANNED || "").split(",").includes(item.slug);
    if (hits.length && allowed) {
      console.warn(`  [UYARI] ${item.slug}: yasaklı terim var (${[...new Set(hits)].join(", ")}) ama izinli — yüklemeden önce demo veriyi temizle`);
    } else if (hits.length) {
      console.warn(`  [ATLANDI] ${item.slug}: demo kalıntısı ${[...new Set(hits)].join(", ")}`);
      continue;
    }
    const filename = `${device.prefix}-${item.num}-${item.slug}-${device.width}x${device.height}.png`;
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
      if (process.env.SCREENSHOT_DEVICE && process.env.SCREENSHOT_DEVICE !== device.key) continue;
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
