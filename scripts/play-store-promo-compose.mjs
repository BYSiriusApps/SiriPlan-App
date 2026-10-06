// Play Store tanıtım görselleri: ham panel ekranını (play-store-screenshots-capture.mjs,
// "promo" cihazı → 720x1524) şeftali gradyan zemin + başlık + telefon çerçevesi içine
// yerleştirir. Çıktı 1080x1920 PNG (Play: 9:16, alfa yok).
//
// Kullanım: PROMO_RAW_DIR=<ham klasör> node scripts/play-store-promo-compose.mjs

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.resolve(process.env.PROMO_RAW_DIR || "docs/play-store/_promo-ham");
const OUT_DIR = path.resolve("docs/play-store/screenshots/telefon");

const SLIDES = [
  { num: "01", slug: "anasayfa", tag: "GENEL BAKIŞ", title: "Salonunuzun Tüm Yönetimi<br>Tek Ekranda", sub: "Aktif randevular, bugünün takvimi ve hızlı işlemler bir arada." },
  { num: "02", slug: "takvim", tag: "TAKVİM", title: "Personelin Günü<br>Tek Bakışta", sub: "Gün, hafta ve personel görünümüyle randevular anında netleşir." },
  { num: "10", slug: "randevular", tag: "RANDEVULAR", title: "Randevular<br>Kontrolünüzde", sub: "Bekleyen, onaylanan, tamamlanan — durumu tek dokunuşla yönetin." },
  { num: "04", slug: "musteriler", tag: "MÜŞTERİLER", title: "Müşterilerinizi Tanıyın,<br>Sadık Tutun", sub: "Skor, harcama ve ziyaret geçmişi hepsi bir arada." },
  { num: "06", slug: "personel", tag: "EKİP", title: "Ekibinizi ve Yetkilerini<br>Yönetin", sub: "Hizmetler, izinler ve maaş bilgileri tek yerde." },
  { num: "07", slug: "stok", tag: "STOK", title: "Stok Bitmeden<br>Haberiniz Olsun", sub: "Ürün takibi, kritik seviye uyarısı ve barkodla satış." },
  { num: "08", slug: "kampanyalar", tag: "KAMPANYA", title: "Müşterilere Otomatik<br>Mesajlar", sub: "Doğum günü ve kampanya mesajları kendiliğinden gider." },
  { num: "12", slug: "raporlar", tag: "RAPORLAR", title: "Cironuzu ve<br>Performansı Görün", sub: "Günlük, aylık ve yıllık ciro, gider ve randevu raporları." , extra: true },
  // Yedek (Play türü başına en çok 8 görsel kabul eder)
  { num: "05", slug: "hizmetler", tag: "HİZMETLER", title: "Hizmet Kataloğunuz<br>Hep Güncel", sub: "Fiyat, süre ve personel eşleşmeleri tek listede.", extra: true },
  { num: "09", slug: "paketler", tag: "PAKETLER", title: "Seans Paketleri<br>Otomatik Takipte", sub: "Randevu tamamlanınca seans kendiliğinden düşer.", extra: true },
  { num: "11", slug: "gelirgider", tag: "GELİR & GİDER", title: "Gelir ve Giderinizi<br>Net Görün", sub: "Aylık ve yıllık mali özet, sabit giderler ve PDF rapor." },
];

const html = (slide, dataUrl) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1080px;height:1920px;overflow:hidden;font-family:Inter,sans-serif;
    background:linear-gradient(180deg,#fdf9f5 0%,#fbeee1 45%,#f8d2a9 100%);position:relative}
  .tag{position:absolute;top:78px;left:50%;transform:translateX(-50%);background:#f6dcc0;color:#b4470f;
    font-weight:700;font-size:26px;letter-spacing:.08em;padding:14px 32px;border-radius:999px;white-space:nowrap}
  h1{position:absolute;top:150px;left:0;width:100%;text-align:center;font-family:'Playfair Display',serif;
    font-weight:700;font-size:78px;line-height:1.1;color:#241a12}
  .sub{position:absolute;top:335px;left:130px;right:130px;text-align:center;font-size:34px;line-height:1.3;color:#8a7a6a}
  .phone{position:absolute;left:230px;top:558px;width:620px;height:1272px;background:#1a1410;border-radius:76px;
    padding:18px;box-shadow:0 40px 80px rgba(120,60,10,.28)}
  .screen{position:relative;width:584px;height:1236px;border-radius:58px;overflow:hidden;background:#fff}
  .screen img{width:100%;height:100%;display:block}
  .cam{position:absolute;top:20px;left:50%;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;background:#000}
</style></head><body>
<div class="tag">${slide.tag}</div>
<h1>${slide.title}</h1>
<div class="sub">${slide.sub}</div>
<div class="phone"><div class="screen"><img src="${dataUrl}"><div class="cam"></div></div></div>
</body></html>`;

async function main() {
  await mkdir(path.join(OUT_DIR, "yedek"), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (const slide of SLIDES) {
    const raw = await readFile(path.join(RAW_DIR, `ham-${slide.num}-${slide.slug}-720x1524.png`));
    await page.setContent(html(slide, `data:image/png;base64,${raw.toString("base64")}`), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const dir = slide.extra ? path.join(OUT_DIR, "yedek") : OUT_DIR;
    const file = `play-promo-${slide.num}-${slide.slug}-1080x1920.png`;
    await page.screenshot({ path: path.join(dir, file) });
    console.log(`  ✓ ${slide.extra ? "yedek/" : ""}${file}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
