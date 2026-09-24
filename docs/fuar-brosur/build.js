const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR = __dirname;
const qrPng = fs.readFileSync(path.join(DIR, 'v2', 'siriplan-qr.png')).toString('base64');
const QR_SRC = `data:image/png;base64,${qrPng}`;
const LINK_VISIBLE = 'siriplan.com';
const LINK_QR_TARGET = 'siriplan.com/auth/kayit'; // encoded in QR (with ?sp_app=0, not shown on paper)

// ---------- tiny original line-icon set (used only in the "gorselli" variant) ----------
const icon = (paths, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
  lipstick: icon('<rect x="9" y="2" width="6" height="7" rx="1.2"/><path d="M9 9l1.5 11a1.5 1.5 0 0 0 3 0L15 9"/>'),
  razor: icon('<path d="M4 12h11l4-3-4-3H4z"/><path d="M4 12v5a2 2 0 0 0 2 2h2"/>'),
  stetho: icon('<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M18 9v3a6 6 0 0 1-12 0V9"/><circle cx="19" cy="9" r="2"/>'),
  scissors: icon('<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><path d="M8 7.5 19 18M8 16.5 19 6"/>'),
  nail: icon('<path d="M8 3c-2 3-3 6-3 9a5 5 0 0 0 10 0c0-3-1-6-3-9"/><path d="M7 11h6"/>'),
  leaf: icon('<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z"/><path d="M8 20c2-6 6-10 12-12"/>'),
  globe: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  target: icon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'),
  bolt: icon('<path d="M12 2 4 14h6l-1 8 9-13h-6z"/>'),
  mic: icon('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4M9 22h6"/>'),
  chat: icon('<path d="M4 5h16v11H8l-4 4z"/>'),
  coin: icon('<circle cx="12" cy="12" r="9"/><path d="M9 15.5c.6.7 1.6 1 2.8 1 1.9 0 3.2-.9 3.2-2.3 0-3-6-1.4-6-4.2 0-1.4 1.3-2.3 3-2.3 1.2 0 2.2.4 2.8 1"/><path d="M12 6.5v11"/>'),
  users: icon('<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M15.6 14.2c2.6.5 4.4 2.6 4.4 5.3"/>'),
  box: icon('<path d="M3 8 12 3l9 5-9 5-9-5Z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/>'),
  lock: icon('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
};

const iconWrap = (name, tone) =>
  `<span class="ic ic-${tone}">${ICONS[name]}</span>`;

// ---------- decorative extras for the "gorselli" alternate ----------
const heroDoodle = `
<svg viewBox="0 0 220 160" class="doodle">
  <circle cx="46" cy="80" r="44" fill="rgba(255,255,255,.10)"/>
  <circle cx="150" cy="34" r="22" fill="rgba(255,255,255,.08)"/>
  <g transform="translate(58,40)" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="0" width="74" height="100" rx="12"/>
    <path d="M0 22h74"/>
    <path d="M20 0v-8M54 0v-8"/>
    <path d="M16 44h10M34 44h10M52 44h6M16 60h10M34 60h10M52 60h6M16 76h10M34 76h10"/>
    <path d="M14 88l8 8 14-16" stroke="rgba(255,255,255,1)" stroke-width="3"/>
  </g>
</svg>`;

const headerPattern = `
<svg class="hpattern" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="11" fill="none" stroke="var(--maroon)" stroke-opacity=".18" stroke-width="1.4"/>
  <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--maroon)" stroke-opacity=".18" stroke-width="1.4"/>
</svg>`;

function page1(gorselli) {
  return `
<section class="page">
  <header class="topbar">
    <div class="brand">
      <div class="logo">S</div>
      <div class="brandtext">
        <div class="brandname">SiriPlan</div>
        <div class="brandsub">AKILLI RANDEVU VE İŞLETME YÖNETİM SİSTEMİ</div>
      </div>
    </div>
    <div class="pill pill-dark">14 GÜN ÜCRETSİZ DENE</div>
  </header>
  ${gorselli ? headerPattern : ''}

  <div class="boxline">
    <div class="boxline-title">HER SEKTÖRE ÖZEL YENİ NESİL DİJİTAL YÖNETİM</div>
    <div class="sector-grid">
      ${sector(gorselli, 'lipstick', 'red', 'Güzellik Merkezleri', 'Seans & Paket Takibi')}
      ${sector(gorselli, 'razor', 'ink', 'Berber & Erkek Bakım', 'Hızlı Sıra & Randevu')}
      ${sector(gorselli, 'stetho', 'blue', 'Klinik & Diyetisyen', 'Hasta Dosyası & Takip')}
      ${sector(gorselli, 'scissors', 'pink', 'Kuaför Salonları', 'Adisyon & Koltuk Yönetimi')}
      ${sector(gorselli, 'nail', 'orange', 'Nail Art & Tırnak', 'Uzman & Masa Planlama')}
      ${sector(gorselli, 'leaf', 'green', 'Spa & Masaj Merkezleri', 'Oda & Terapist Kontrolü')}
    </div>
  </div>

  <div class="quote">
    <p>&ldquo;SiriPlan ile işletmenizin kapısı 7/24 kesintisiz açık! WhatsApp ve webden gelen tüm randevuları
    otomatik toplayarak dijital görünürlüğünüzü zirveye taşıyın; müşteri portföyünüzü genişletirken satış
    hacminizi ve kârlılığınızı katlayın. Kasanızı, personelinizi ve iş süreçlerinizi sıfır hata ve kurumsal
    bir profesyonellikle tek ekrandan yönetin.&rdquo;</p>
    <div class="ticks">
      <div class="tick"><b>Müşteri kaçmaz:</b> Gece saatlerinde bile randevular anında panele işlenir.</div>
      <div class="tick"><b>Gelişmiş CRM:</b> Müşteri geçmişi, sadakat puanı ve otomatik teyit mesajları.</div>
      <div class="tick"><b>Kasa şaşmaz:</b> Gelir, gider, stok ve primler kuruşu kuruşuna elinizde.</div>
      <div class="tick"><b>Sıfır Donanım Bağımlılığı:</b> Telefondan, tabletten veya bilgisayardan 7/24 kontrol.</div>
    </div>
  </div>

  <div class="feat-grid">
    ${feature(gorselli, 'globe', 'Kurumsal Randevu Vitrini',
      'İşletmenize özel web sayfasıyla müşterileriniz telefon aramadan 7/24 randevu alsın, hizmet görsellerinizi ve portföyünüzü incelesin.',
      ['/r/isletme-adiniz', 'Google Harita', 'Hizmet Görselleri'])}
    ${feature(gorselli, 'target', 'Müşteriyi Koruyun & CRM',
      'Kimin kaç kez geldiğini, ne harcadığını ve sadakat puanını görün. Gelmeyeni otomatik geri kazanın!',
      ['Müşteri Geçmişi', 'Geri Kazanım'], true)}
    ${feature(gorselli, 'bolt', 'Esnek Randevu Onayı',
      'İster gelen randevular anında otomatik onaylansın, ister önce onay ekranınıza düşsün.',
      ['Otomatik Onay', 'Onaya Düşsün'])}
    ${feature(gorselli, 'mic', 'Sesli Randevu Asistanı',
      'Ekrana dokunmadan konuşarak saniyeler içinde randevu oluşturun ve stok komutu verin.',
      ['Sesli Komut', 'Hızlı Kayıt'])}
    ${feature(gorselli, 'chat', 'WhatsApp & SMS Bildirimi',
      'Randevu hatırlatma ve teyit mesajları otomatik gitsin; gelmeyen müşteri kaybı bitsin.',
      ['WhatsApp API', 'Telegram Bot'])}
    ${feature(gorselli, 'coin', 'Kasa, Prim & Ön Muhasebe',
      'Günün cirosu, personel komisyonları, kâr/zarar ve dönemsel değişim raporları görsel grafiklerle anında elinizde.',
      ['Net Kâr/Zarar', 'PDF Gün Sonu', 'Değişim Raporları & Grafik'])}
  </div>

  ${ctaBox('Barkodu Okutun, 14 Gün Ücretsiz Deneyin!',
    'Kredi kartı gerekmez. Temsilci beklemeden hemen başlayın, direkt kayıt ekranı açılır.',
    gorselli)}
</section>`;
}

function page2(gorselli) {
  return `
<section class="page">
  <header class="topbar">
    <div class="brand">
      <div class="logo">S</div>
      <div class="brandtext">
        <div class="brandname">SiriPlan</div>
        <div class="brandsub">NEDEN SİRİPLAN? FARKI KEŞFEDİN</div>
      </div>
    </div>
    <div class="pill pill-dark">0 VERİ KAYBI İLE GEÇİŞ</div>
  </header>
  ${gorselli ? headerPattern : ''}

  <div class="sectionbar">Eski Yöntemler ve Hantal Programlar vs. SiriPlan Akıllı Sistemi</div>

  <table class="compare">
    <thead>
      <tr><th class="bad">✕ KLASİK YÖNTEMLER &amp; ESKİ ALIŞKANLIKLAR</th><th class="good">✓ SİRİPLAN AKILLI SİSTEMİ</th></tr>
    </thead>
    <tbody>
      <tr><td>Akşam DM ve WhatsApp'a geç dönüldüğü için başka yere giden müşteriler.</td><td>7/24 kesintisiz otomatik cevap veren ve randevu linki ileten akıllı asistan.</td></tr>
      <tr><td>Son dakika gelmeyen randevular yüzünden boş kalan koltuklar ve günlük ciro kaybı.</td><td>Otomatik onay ve teyit mesajları ile %80 azalan randevu iptalleri.</td></tr>
      <tr><td>Amatör DM yazışmaları, dağınık listeler ve güven vermeyen merdiven altı algısı.</td><td>İşletmenize özel estetik, kurumsal ve profesyonel web randevu vitrini.</td></tr>
      <tr><td>Yoğun saatte donan, kilitlenen, çöken hantal masaüstü sistemleri ve veri kaybı stresi.</td><td>Asla takılmayan, çökmeyen, %99.9 kesintisiz bulut altyapısı ve akıcı kullanım.</td></tr>
      <tr><td>&ldquo;Sistem değiştirirsem müşteri kayıtlarım silinir&rdquo; korkusu ve zor geçiş süreçleri.</td><td>Tek tıkla Excel, CSV aktarımı; tüm müşteri geçmişi ve CRM anında taşınır.</td></tr>
    </tbody>
  </table>

  <div class="sectionbar">İşletmenizi Büyüten Uçtan Uca Çözümler</div>

  <div class="feat-grid feat-grid-2">
    ${feature(gorselli, 'users', 'Müşteri Sadakat & Skor (CRM)',
      'Ziyaret sıklığı, harcama geçmişi, puanlar ve otomatik doğum günü kutlama mesajları.',
      ['Puan Takibi', 'Doğum Günü Kutlaması'])}
    ${feature(gorselli, 'box', 'Akıllı Stok & Sarf Malzeme',
      'Giriş-çıkış takibi, alış-satış marjları ve kritik limit uyarıları ile tam depo kontrolü.',
      ['Kritik Stok Uyarısı', 'Birim Maliyet'])}
    ${feature(gorselli, 'scissors', 'Personel Prim & Maaş',
      "Her uzmanın prim oranı (%40-%50) otomatik hesaplanır; hak ediş hesaplama derdi biter.",
      ['Haftanın Elemanı', 'Şeffaf Komisyon'])}
    ${feature(gorselli, 'lock', '%100 Bulut & Güvenli Yedek',
      'Cihazınız bozulsa da verileriniz güvende. Dilediğiniz zaman Excel/PDF olarak indirin.',
      ['Tek Tık İndir', '7/24 Erişim'])}
  </div>

  ${ctaBox('Fuara Özel Fırsat: Hemen Başlayın!',
    'Kameranızı barkoda yaklaştırın, 14 gün boyunca tüm Pro özellikleri ücretsiz deneyin — direkt kayıt ekranı açılır.',
    gorselli)}
</section>`;
}

function sector(gorselli, iconName, tone, title, sub) {
  return `<div class="sector">
    ${gorselli ? iconWrap(iconName, tone) : `<span class="dot dot-${tone}"></span>`}
    <div><div class="sector-title">${title}</div><div class="sector-sub">${sub}</div></div>
  </div>`;
}

function feature(gorselli, iconName, title, desc, tags, highlight) {
  return `<div class="feat ${highlight ? 'feat-hl' : ''}">
    <div class="feat-head">${gorselli ? iconWrap(iconName, highlight ? 'gold' : 'maroon') : `<span class="feat-dot"></span>`}<span class="feat-title">${title}</span></div>
    <p class="feat-desc">${desc}</p>
    <div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
  </div>`;
}

function ctaBox(title, sub, gorselli) {
  return `<div class="cta">
    <div class="cta-text">
      <div class="cta-title">${title}</div>
      <div class="cta-sub">${sub}</div>
      <div class="cta-line"><b>siriplan.com</b></div>
      <div class="cta-line">Instagram: @siriplan &nbsp;|&nbsp; WhatsApp Destek: +90 535 503 26 34</div>
    </div>
    ${gorselli ? `<div class="cta-doodle">${heroDoodle}</div>` : ''}
    <div class="qrbox"><img src="${QR_SRC}" alt="QR"/></div>
  </div>`;
}

const CSS = `
@page { size: 148mm 210mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #2b1420; }

:root {
  --maroon: #5c1533;
  --maroon-dark: #3d0e22;
  --cream: #fdf4f3;
  --line: #f0d9dc;
  --gold: #b9862f;
  --gold-bg: #fbf3e2;
  --green: #1e7e42;
  --green-bg: #e9f7ee;
  --red: #c23b3b;
  --red-bg: #fbebea;
  --blue: #2e6fa8;
  --ink: #4a3a41;
  --orange: #c2701f;
  --pink: #c23a72;
}

.page {
  width: 148mm; height: 210mm;
  background: var(--cream);
  padding: 6mm 6mm 5mm;
  position: relative;
  page-break-after: always;
  display: flex;
  flex-direction: column;
  gap: 3mm;
}

.topbar { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.brand { display: flex; align-items: center; gap: 2.6mm; }
.logo {
  width: 10mm; height: 10mm; border-radius: 2.4mm;
  background: linear-gradient(135deg, var(--maroon), var(--maroon-dark));
  color: #fff; font-weight: 800; font-size: 5.4mm; font-family: Georgia, serif;
  display: flex; align-items: center; justify-content: center;
}
.brandname { font-size: 5.4mm; font-weight: 800; color: var(--maroon); line-height: 1; }
.brandsub { font-size: 1.9mm; font-weight: 700; letter-spacing: .3px; color: #8a6672; margin-top: .8mm; }
.pill { padding: 1.6mm 3.4mm; border-radius: 20px; font-size: 2mm; font-weight: 800; letter-spacing: .3px; white-space: nowrap; }
.pill-dark { background: var(--maroon-dark); color: #fff; }

.hpattern { position: absolute; top: -5mm; right: -5mm; width: 26mm; height: 26mm; z-index: 0; pointer-events: none; }

.boxline {
  border: 1px solid var(--line); border-radius: 3mm; padding: 3mm 3mm 3.4mm; background: #fffdfc;
}
.boxline-title { text-align: center; font-size: 2.5mm; font-weight: 800; color: var(--maroon); letter-spacing: .3px; margin-bottom: 2.4mm; }
.sector-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
.sector { display: flex; align-items: flex-start; gap: 1.6mm; border: 1px solid var(--line); border-radius: 2.2mm; padding: 1.8mm; background: #fff; }
.sector-title { font-size: 2.3mm; font-weight: 800; color: #2b1420; line-height: 1.2; }
.sector-sub { font-size: 1.9mm; color: #7a5b63; margin-top: .4mm; }
.dot { width: 3mm; height: 3mm; border-radius: 50%; margin-top: .6mm; flex-shrink: 0; }
.dot-red { background: #c23b3b; } .dot-ink { background: #3a3a3a; } .dot-blue { background: #2e6fa8; }
.dot-pink { background: #c23a72; } .dot-orange { background: #c2701f; } .dot-green { background: #2e8b57; }

.ic { display: inline-flex; align-items: center; justify-content: center; width: 5.4mm; height: 5.4mm; border-radius: 50%; flex-shrink: 0; }
.ic svg { width: 3.2mm; height: 3.2mm; }
.ic-red { background: var(--red-bg); color: var(--red); }
.ic-ink { background: #ece7e8; color: #3a3a3a; }
.ic-blue { background: #e6f0f8; color: var(--blue); }
.ic-pink { background: #fbe8f1; color: var(--pink); }
.ic-orange { background: #fbedde; color: var(--orange); }
.ic-green { background: var(--green-bg); color: var(--green); }
.ic-maroon { background: var(--line); color: var(--maroon); }
.ic-gold { background: var(--gold-bg); color: var(--gold); }

.quote {
  background: linear-gradient(160deg, var(--maroon), var(--maroon-dark));
  color: #fbeef2; border-radius: 3mm; padding: 3.4mm 3.6mm; position: relative;
}
.quote p { margin: 0 0 2.6mm; font-size: 2.15mm; line-height: 1.55; font-style: italic; }
.ticks { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm 3mm; border-top: 1px solid rgba(255,255,255,.25); padding-top: 2.2mm; }
.tick { font-size: 2mm; line-height: 1.4; }
.tick b { color: #ffd9e6; }

.feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
.feat { border: 1px solid var(--line); border-radius: 2.4mm; padding: 2.2mm 2.4mm; background: #fff; }
.feat-hl { border-color: var(--gold); box-shadow: 0 0 0 .5px var(--gold); background: #fffdf7; }
.feat-head { display: flex; align-items: center; gap: 1.4mm; margin-bottom: 1.2mm; }
.feat-dot { width: 2mm; height: 2mm; border-radius: 50%; background: var(--maroon); flex-shrink: 0; }
.feat-title { font-size: 2.25mm; font-weight: 800; color: #2b1420; }
.feat-desc { font-size: 1.95mm; line-height: 1.42; color: #63494f; margin: 0 0 1.6mm; }
.tags { display: flex; flex-wrap: wrap; gap: 1mm; }
.tag { font-size: 1.75mm; font-weight: 700; background: var(--line); color: var(--maroon); border-radius: 20px; padding: .8mm 2mm; }
.feat-hl .tag { background: var(--gold-bg); color: var(--gold); }

.sectionbar { font-size: 2.6mm; font-weight: 800; color: var(--maroon); border-left: 1.2mm solid var(--maroon); padding-left: 2mm; }

.compare { width: 100%; border-collapse: collapse; border: 1px solid var(--line); border-radius: 2mm; overflow: hidden; font-size: 1.95mm; }
.compare th { text-align: left; padding: 1.8mm 2.4mm; font-size: 1.9mm; font-weight: 800; }
.compare th.bad { background: var(--red-bg); color: var(--red); }
.compare th.good { background: var(--green-bg); color: var(--green); }
.compare td { padding: 1.8mm 2.4mm; border-top: 1px solid var(--line); vertical-align: top; line-height: 1.4; }
.compare td:first-child { color: #5a4750; width: 50%; }
.compare td:last-child { color: var(--green); font-weight: 700; width: 50%; }
.compare tr:nth-child(even) td { background: #fffaf9; }

.feat-grid-2 { grid-template-columns: 1fr 1fr; }

.cta {
  margin-top: auto;
  background: linear-gradient(160deg, var(--maroon-dark), var(--maroon));
  border-radius: 3mm; padding: 3.4mm; display: flex; align-items: center; gap: 3mm; color: #fff; position: relative; overflow: hidden;
}
.cta-text { flex: 1; }
.cta-title { font-size: 2.9mm; font-weight: 800; margin-bottom: 1mm; }
.cta-sub { font-size: 1.95mm; color: #f2d8e1; margin-bottom: 1.8mm; line-height: 1.4; }
.cta-line { font-size: 1.95mm; color: #fbeef2; margin-bottom: .6mm; }
.qrbox { width: 22mm; height: 22mm; background: #fff; border-radius: 2mm; padding: 1.2mm; flex-shrink: 0; z-index: 1; }
.qrbox img { width: 100%; height: 100%; object-fit: contain; }
.cta-doodle { position: absolute; right: 20mm; top: -6mm; width: 40mm; opacity: .9; }
.cta-doodle svg { width: 100%; }
`;

function html(gorselli) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
  <body>${page1(gorselli)}${page2(gorselli)}</body></html>`;
}

async function render(fileName, gorselli) {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.setContent(html(gorselli), { waitUntil: 'networkidle' });
  await p.pdf({
    path: path.join(DIR, 'v2', fileName),
    width: '148mm',
    height: '210mm',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await browser.close();
}

(async () => {
  fs.writeFileSync(path.join(DIR, 'v2', 'brosur-duz.html'), html(false));
  fs.writeFileSync(path.join(DIR, 'v2', 'brosur-gorselli.html'), html(true));
  await render('SiriPlan-Fuar-Brosuru-Duzeltilmis.pdf', false);
  await render('SiriPlan-Fuar-Brosuru-Gorselli-Alternatif.pdf', true);
  console.log('OK');
})();
