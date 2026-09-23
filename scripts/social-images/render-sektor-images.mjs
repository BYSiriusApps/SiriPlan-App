/**
 * pet_kuafor / spa / nail sektörleri için "sektorler-mavi" pazarlama görsel
 * setini (anasayfa + müşteri-post + müşteri-hikaye) üretir. Var olan
 * berber, diyetisyen, klinik setleriyle aynı görsel dile (Playfair
 * Display başlık + Plus Jakarta Sans gövde, "Klasik Mavi" tema rengi,
 * telefon mockup'ı) sadık kalır. Fotoğraf yerine markaya uygun ikon paneli
 * kullanır (gerçek fotoğraf üretimi bu ortamda yok).
 *
 * Çalıştırma: node scripts/social-images/render-sektor-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_ROOT = path.join(process.cwd(), "docs/sosyal-medya/2026-09-app-tanitim-gorselleri");

// Panelin gerçek tema renkleri (bkz. src/app/globals.css .blue / .sunset)
const THEMES = [
  {
    key: "mavi",
    primary: "oklch(0.55 0.22 263)",
    accent2: "oklch(0.50 0.15 280)",
    navy: "oklch(0.16 0.035 265)",
    muted: "oklch(0.40 0.05 265)",
    pillBg: "oklch(0.90 0.045 262)",
    lightBgAnasayfa: "linear-gradient(160deg, oklch(0.94 0.02 260) 0%, oklch(0.88 0.04 262) 45%, oklch(0.85 0.05 263) 100%)",
    lightBgPost: "linear-gradient(160deg, oklch(0.93 0.025 260) 0%, oklch(0.87 0.045 262) 100%)",
    darkBg: "linear-gradient(200deg, oklch(0.10 0.03 265) 0%, oklch(0.16 0.06 265) 40%, oklch(0.30 0.13 265) 78%, oklch(0.45 0.19 265) 100%)",
    storyMuted: "oklch(0.72 0.09 265)",
  },
  {
    key: "turuncu",
    primary: "oklch(0.58 0.18 40)",
    accent2: "oklch(0.62 0.16 70)",
    navy: "oklch(0.13 0.045 40)",
    muted: "oklch(0.40 0.05 45)",
    pillBg: "oklch(0.90 0.05 50)",
    lightBgAnasayfa: "linear-gradient(160deg, oklch(0.95 0.02 55) 0%, oklch(0.90 0.05 50) 45%, oklch(0.87 0.06 45) 100%)",
    lightBgPost: "linear-gradient(160deg, oklch(0.94 0.025 55) 0%, oklch(0.89 0.05 48) 100%)",
    darkBg: "linear-gradient(200deg, oklch(0.10 0.02 40) 0%, oklch(0.18 0.05 40) 40%, oklch(0.32 0.12 40) 78%, oklch(0.48 0.17 40) 100%)",
    storyMuted: "oklch(0.75 0.09 55)",
  },
];

// Aktif tema — ana render döngüsü her tema için bunu günceller.
let PRIMARY, ACCENT2, NAVY, MUTED, PILL_BG, LIGHT_BG_ANASAYFA, LIGHT_BG_POST, DARK_BG, STORY_MUTED, OUT_DIR;

const BADGE_COLORS = {
  green: { bg: "#d1fae5", fg: "#047857" },
  amber: { bg: "#fef3c7", fg: "#b45309" },
  blue: { bg: "#dbeafe", fg: "#1d4ed8" },
  slate: { bg: "#f1f5f9", fg: "#475569" },
};

const SECTORS = [
  {
    slug: "pet-kuafor",
    salonName: "Sirius Demo\nPati Kuaför",
    ownerFirst: "Aslı",
    icon: "🐾",
    iconCaption: "Pati Bakım Salonu",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Randevunuz Hep", "Dolu Kalsın"],
      subtitle: "Randevular, bakım geçmişi ve dost profilleri anlık takipte.",
      dayNumber: 5,
      appointments: [
        { name: "Boncuk (Ela K.)", service: "Yıkama + Tıraş", time: "Yarın 10:00" },
        { name: "Mırmır (Deniz A.)", service: "Kedi Bakımı", time: "Yarın 15:30" },
        { name: "Zeytin (Barış Y.)", service: "Tırnak Kesimi", time: "19 Eyl" },
      ],
      calendarToday: [
        { time: "09:30", name: "Boncuk", staffTag: "Aslı Yıldız", color: "blue" },
        { time: "11:00", name: "Mırmır", staffTag: "Aslı Yıldız", color: "blue" },
        { time: "14:00", name: "Zeytin", staffTag: "Kemal Su", color: "green" },
      ],
      bekliyor: 0,
      tamamlanan: 1,
    },
    crm: {
      eyebrow: "PATİ CRM",
      headline: ["Dostunu Tanı,", "Güvenini Kazan."],
      subtitle: "Kilo takibi, aşı tarihi ve notlarla her patiye özel ilgi göster.",
      crmTitle: "Dostlarımız",
      crmSubtitle: "22 dost · 4 aktif bakım",
      customers: [
        {
          initial: "E", name: "Ela Korkmaz", phone: "0533 400 10 01",
          cols: [{ label: "Kilo", value: "28 kg" }, { label: "Değişim", value: "-2,2 kg" }, { label: "Son Bakım", value: "9 Eyl" }],
          footer: "Boncuk • Golden Retriever",
          badge: { label: "Sadık Müşteri", color: "green" },
        },
        {
          initial: "D", name: "Deniz Aksoy", phone: "0533 400 10 02",
          cols: [{ label: "Kilo", value: "4,8 kg" }, { label: "Değişim", value: "-0,3 kg" }, { label: "Son Bakım", value: "9 Eyl" }],
          footer: "Mırmır • British Shorthair",
          badge: { label: "Hassas Tüy/Cilt", color: "amber" },
        },
      ],
    },
  },
  {
    slug: "spa",
    salonName: "Sirius Demo\nSpa & Masaj",
    ownerFirst: "Selin",
    icon: "💆",
    iconCaption: "Spa & Masaj Odası",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Odalarınız Hep", "Dolu Kalsın"],
      subtitle: "Randevular, terapist yoğunluğu ve misafir geçmişi anlık takipte.",
      dayNumber: 5,
      appointments: [
        { name: "Merve Şahin", service: "Aromaterapi Masajı", time: "Yarın 11:00" },
        { name: "Onur Demirtaş", service: "Sıcak Taş Masajı", time: "Yarın 16:00" },
        { name: "Ayşe Polat", service: "Cilt Bakımı", time: "20 Eyl" },
      ],
      calendarToday: [
        { time: "10:00", name: "Merve Şahin", staffTag: "Selin Kara", color: "blue" },
        { time: "12:30", name: "Cem Aydın", staffTag: "Selin Kara", color: "blue" },
        { time: "15:00", name: "Onur Demirtaş", staffTag: "Zara Ay", color: "green" },
      ],
      bekliyor: 1,
      tamamlanan: 2,
    },
    crm: {
      eyebrow: "SPA CRM",
      headline: ["Misafirini Tanı,", "Sadakatini Kazan."],
      subtitle: "Üyelik, cilt tipi ve seans geçmişiyle kişiye özel deneyim sun.",
      crmTitle: "Misafirler",
      crmSubtitle: "26 misafir · 9 premium üye",
      customers: [
        {
          initial: "M", name: "Merve Şahin", phone: "0533 400 20 01",
          cols: [{ label: "Ziyaret", value: "7" }, { label: "Harcama", value: "₺6.300" }, { label: "Puan", value: "★5" }],
          footer: "Cilt Tipi: Karma cilt",
          badge: { label: "Premium", color: "blue" },
        },
        {
          initial: "O", name: "Onur Demirtaş", phone: "0533 400 20 02",
          cols: [{ label: "Ziyaret", value: "2" }, { label: "Harcama", value: "₺1.800" }, { label: "Puan", value: "★1" }],
          footer: "Cilt Tipi: Hassas cilt",
          badge: { label: "Kontrol Gerekiyor", color: "amber" },
        },
      ],
    },
  },
  {
    slug: "nail",
    salonName: "Sirius Demo\nNail Art Studio",
    ownerFirst: "Buse",
    icon: "💅",
    iconCaption: "Nail Art Stüdyosu",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Koltuğunuz Hep", "Dolu Kalsın"],
      subtitle: "Randevular, sanatçı yoğunluğu ve müşteri geçmişi anlık takipte.",
      dayNumber: 5,
      appointments: [
        { name: "İrem Aksu", service: "Fransız Manikür", time: "Yarın 13:00" },
        { name: "Gizem Yurt", service: "Jel Tırnak", time: "Yarın 17:00" },
        { name: "Sude Kaplan", service: "Nail Art Tasarım", time: "21 Eyl" },
      ],
      calendarToday: [
        { time: "10:30", name: "İrem Aksu", staffTag: "Buse Öztürk", color: "blue" },
        { time: "13:00", name: "Elif Tan", staffTag: "Buse Öztürk", color: "blue" },
        { time: "16:00", name: "Sude Kaplan", staffTag: "Zeynep A.", color: "green" },
      ],
      bekliyor: 2,
      tamamlanan: 1,
    },
    crm: {
      eyebrow: "NAIL CRM",
      headline: ["Müşterini Tanı,", "Tarzını Yakala."],
      subtitle: "Tercih ve alerji notlarıyla her tırnak tasarımını kişiselleştir.",
      crmTitle: "Müşteriler",
      crmSubtitle: "31 müşteri · 5 alerji notlu",
      customers: [
        {
          initial: "İ", name: "İrem Aksu", phone: "0533 400 30 01",
          cols: [{ label: "Ziyaret", value: "9" }, { label: "Harcama", value: "₺4.200" }, { label: "Puan", value: "★6" }],
          footer: "Tercih: Fransız manikür",
          badge: { label: "Takipte", color: "green" },
        },
        {
          initial: "G", name: "Gizem Yurt", phone: "0533 400 30 02",
          cols: [{ label: "Ziyaret", value: "3" }, { label: "Harcama", value: "₺1.500" }, { label: "Puan", value: "★2" }],
          footer: "⚠ Aseton alerjisi",
          badge: { label: "Kontrol Gerekiyor", color: "amber" },
        },
      ],
    },
  },
];

// Fonksiyon: her sayfa üretiminde ÇAĞRILDIĞI ANDAKİ PRIMARY/PILL_BG değerini
// okur (aktif tema). Modül yüklenirken bir kere hesaplanan bir const olsaydı
// tema döngüsü başlamadan önceki (undefined) değerleri donuk kopyalardı.
function baseCss() {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Plus Jakarta Sans', sans-serif; }
  .serif { font-family:'Playfair Display', serif; }
  .logo { display:flex; align-items:center; gap:10px; }
  .logo .mark { width:40px; height:40px; border-radius:10px; background:${PRIMARY}; color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-weight:700; font-size:22px; }
  .logo .word { font-weight:700; font-size:20px; }
  .pill { display:inline-flex; align-items:center; padding:8px 18px; border-radius:999px; font-size:13px; font-weight:700; letter-spacing:.08em; }
  .phone { background:#111; border-radius:46px; padding:14px; box-shadow:0 30px 60px rgba(0,0,0,.35); position:relative; }
  .phone .notch { position:absolute; top:24px; left:50%; transform:translateX(-50%); width:10px; height:10px; border-radius:50%; background:#000; }
  .screen { background:#fff; border-radius:34px; overflow:hidden; height:100%; padding:34px 30px; }
  .card { border:1px solid #e5e9f5; border-radius:16px; overflow:hidden; background:#fff; }
  .card .accent { height:4px; background:${PRIMARY}; }
  .avatar { width:44px; height:44px; border-radius:50%; background:${PILL_BG}; color:${PRIMARY}; display:flex; align-items:center; justify-content:center; font-weight:700; font-family:'Playfair Display',serif; font-size:18px; flex-shrink:0; }
  .badge { display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:700; }
`;
}

function badgeStyle(color) {
  const c = BADGE_COLORS[color] ?? BADGE_COLORS.slate;
  return `background:${c.bg};color:${c.fg};`;
}

function customerCardHTML(c) {
  return `
  <div class="card" style="margin-bottom:16px;">
    <div class="accent"></div>
    <div style="padding:18px 20px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="avatar">${c.initial}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:17px; color:${NAVY};">${c.name}</div>
          <div style="font-size:13px; color:${MUTED};">${c.phone}</div>
        </div>
        ${c.badge ? `<div class="badge" style="${badgeStyle(c.badge.color)}">${c.badge.label}</div>` : ""}
      </div>
      <div style="display:flex; gap:22px; margin-top:14px;">
        ${c.cols.map((col) => `
          <div>
            <div style="font-weight:700; font-size:18px; color:${NAVY};">${col.value}</div>
            <div style="font-size:11px; color:${MUTED};">${col.label}</div>
          </div>
        `).join("")}
      </div>
      <div style="margin-top:12px; padding-top:10px; border-top:1px dashed #e5e9f5; font-size:12px; color:${MUTED};">${c.footer}</div>
    </div>
  </div>`;
}

function crmScreenHTML(sector) {
  return `
    <div style="font-size:13px; font-weight:700; letter-spacing:.06em; color:${PRIMARY};">CRM</div>
    <div class="serif" style="font-size:32px; font-weight:700; color:${NAVY}; margin-top:4px;">${sector.crm.crmTitle}</div>
    <div style="font-size:14px; color:${MUTED}; margin-top:4px; margin-bottom:22px;">${sector.crm.crmSubtitle}</div>
    ${sector.crm.customers.map(customerCardHTML).join("")}
  `;
}

function anasayfaScreenHTML(sector) {
  const a = sector.anasayfa;
  return `
    <div style="display:flex; align-items:flex-start; justify-content:space-between;">
      <div class="serif" style="font-size:26px; font-weight:700; color:${NAVY}; line-height:1.15; white-space:pre-line;">${sector.salonName}</div>
      <div class="serif" style="font-size:20px; font-weight:700; color:${NAVY};">13:37</div>
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
      <div style="font-size:14px; color:${MUTED};">Merhaba ${sector.ownerFirst}.</div>
      <div style="font-size:13px; color:${PRIMARY}; font-weight:600;">⚙ Kişiselleştir</div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="accent"></div>
      <div style="padding:16px 18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:.05em; color:${NAVY};">AKTİF RANDEVULAR</div>
          <div style="font-size:12px; color:${PRIMARY}; font-weight:700;">Tümü ›</div>
        </div>
        <div style="display:flex; gap:14px;">
          <div style="text-align:center; flex-shrink:0;">
            <div class="serif" style="font-size:26px; font-weight:700; color:${PRIMARY};">${a.dayNumber}</div>
            <div style="font-size:10px; color:${MUTED};">Bugün</div>
          </div>
          <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            ${a.appointments.map((ap) => `
              <div style="display:flex; align-items:baseline; justify-content:space-between; font-size:13px;">
                <div><span style="font-weight:700; color:${NAVY};">${ap.name}</span> <span style="color:${MUTED};">(${ap.service})</span></div>
                <div style="font-weight:700; color:${NAVY}; white-space:nowrap;">${ap.time}</div>
              </div>
            `).join("")}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:14px; padding-top:12px; border-top:1px dashed #e5e9f5;">
          <div class="pill" style="background:${PILL_BG}; color:${PRIMARY}; padding:6px 14px; font-size:12px;">Tümünü Gör ›</div>
          <div style="font-size:12px; color:#d97706; display:flex; align-items:center; gap:4px;">● Bekliyor: ${a.bekliyor}</div>
          <div style="font-size:12px; color:${PRIMARY}; display:flex; align-items:center; gap:4px;">● Tamamlanan: ${a.tamamlanan}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="accent"></div>
      <div style="padding:16px 18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="font-size:12px; font-weight:700; letter-spacing:.05em; color:${NAVY};">TAKVİM (BUGÜN)</div>
          <div style="font-size:12px; color:${PRIMARY}; font-weight:700;">Tümü ›</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${a.calendarToday.map((row) => `
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:8px; font-size:13px;">
                <span style="color:${PRIMARY};">🕐</span>
                <span style="font-weight:700; color:${PRIMARY};">${row.time}</span>
                <span style="color:${NAVY};">${row.name}</span>
              </div>
              <div class="badge" style="${badgeStyle(row.color === "green" ? "green" : "blue")}">${row.staffTag}</div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <div style="margin-top:28px; display:flex; justify-content:space-between; padding:0 4px;">
      ${["🏠 Ana Sayfa", "📅 Takvim", "🗂 Randevular", "👥 Müşteriler", "⚙️ Ayarlar", "☰ Menü"].map((label, i) => {
        const [icon, text] = label.split(" ");
        const active = i === 0;
        return `<div style="text-align:center; font-size:10px; color:${active ? PRIMARY : "#9aa3bd"};">
          <div style="font-size:18px;">${icon}</div>${text}
        </div>`;
      }).join("")}
    </div>
  `;
}

function iconPanelHTML(sector) {
  return `
    <div style="width:478px; height:430px; border-radius:24px; background:linear-gradient(135deg, ${PRIMARY}, ${ACCENT2}); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
      <div style="font-size:120px; line-height:1;">${sector.icon}</div>
      <div style="margin-top:18px; font-size:20px; font-weight:700;" class="serif">${sector.iconCaption}</div>
    </div>
  `;
}

function pageHTML(variant, sector) {
  if (variant === "anasayfa") {
    const a = sector.anasayfa;
    return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss()}
      body { width:1080px; height:1920px; background:${LIGHT_BG_ANASAYFA}; display:flex; flex-direction:column; align-items:center; padding-top:70px; }
    </style></head><body>
      <div class="pill" style="background:${PILL_BG}; color:${PRIMARY};">${a.eyebrow}</div>
      <div class="serif" style="font-size:56px; font-weight:700; color:${NAVY}; text-align:center; line-height:1.15; margin-top:22px;">
        ${a.headline.join("<br>")}
      </div>
      <div style="font-size:19px; color:${MUTED}; text-align:center; max-width:640px; margin-top:20px; line-height:1.5;">${a.subtitle}</div>

      <div class="phone" style="width:580px; height:1160px; margin-top:56px;">
        <div class="notch"></div>
        <div class="screen">${anasayfaScreenHTML(sector)}</div>
      </div>
    </body></html>`;
  }

  if (variant === "post") {
    const c = sector.crm;
    return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss()}
      body { width:1080px; height:1080px; background:${LIGHT_BG_POST}; padding:56px; display:flex; flex-direction:column; }
    </style></head><body>
      <div class="logo"><div class="mark">S</div><div class="word" style="color:${NAVY};">siriplan</div></div>
      <div style="display:flex; margin-top:34px; gap:40px; flex:1;">
        <div style="flex:1; display:flex; flex-direction:column;">
          <div class="pill" style="background:${PILL_BG}; color:${PRIMARY}; align-self:flex-start;">${c.eyebrow}</div>
          <div class="serif" style="font-size:46px; font-weight:700; color:${NAVY}; line-height:1.15; margin-top:18px;">${c.headline.join("<br>")}</div>
          <div style="font-size:16px; color:${MUTED}; margin-top:16px; max-width:420px; line-height:1.5;">${c.subtitle}</div>
          <div class="pill" style="background:${PRIMARY}; color:#fff; margin-top:24px; align-self:flex-start; padding:14px 28px; font-size:15px;">siriplan.com ↗</div>
          <div style="flex:1;"></div>
          ${iconPanelHTML(sector)}
        </div>
        <div class="phone" style="width:450px; height:906px; flex-shrink:0;">
          <div class="notch"></div>
          <div class="screen" style="padding:30px 26px;">${crmScreenHTML(sector)}</div>
        </div>
      </div>
    </body></html>`;
  }

  // hikaye (story)
  const c = sector.crm;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss()}
    body { width:1080px; height:1920px; background:${DARK_BG}; display:flex; flex-direction:column; align-items:center; padding-top:70px; }
  </style></head><body>
    <div class="logo"><div class="mark">S</div><div class="word" style="color:#fff;">siriplan</div></div>
    <div class="serif" style="font-size:56px; font-weight:700; color:#fff; text-align:center; line-height:1.15; margin-top:46px;">${c.headline.join("<br>")}</div>

    <div class="phone" style="width:480px; height:960px; margin-top:56px;">
      <div class="notch"></div>
      <div class="screen" style="padding:30px 26px;">${crmScreenHTML(sector)}</div>
    </div>

    <div style="flex:1;"></div>
    <div class="pill" style="background:#fff; color:${PRIMARY}; padding:16px 34px; font-size:17px; margin-bottom:18px;">Hemen Keşfet ↗</div>
    <div style="font-size:13px; letter-spacing:.08em; color:${STORY_MUTED}; margin-bottom:64px;">↑ SIRIPLAN.COM</div>
  </body></html>`;
}

const TARGETS = [
  { variant: "anasayfa", w: 1080, h: 1920, suffix: "01-anasayfa-1080x1920" },
  { variant: "post", w: 1080, h: 1080, suffix: "02-musteri-post-1080x1080" },
  { variant: "hikaye", w: 1080, h: 1920, suffix: "03-musteri-hikaye-1080x1920" },
];

const browser = await chromium.launch();
for (const theme of THEMES) {
  PRIMARY = theme.primary;
  ACCENT2 = theme.accent2;
  NAVY = theme.navy;
  MUTED = theme.muted;
  PILL_BG = theme.pillBg;
  LIGHT_BG_ANASAYFA = theme.lightBgAnasayfa;
  LIGHT_BG_POST = theme.lightBgPost;
  DARK_BG = theme.darkBg;
  STORY_MUTED = theme.storyMuted;
  OUT_DIR = path.join(DOCS_ROOT, `sektorler-${theme.key}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const sector of SECTORS) {
    for (const t of TARGETS) {
      const page = await browser.newPage({ viewport: { width: t.w, height: t.h } });
      await page.setContent(pageHTML(t.variant, sector), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(150);
      const outPath = path.join(OUT_DIR, `${sector.slug}-${t.suffix}.png`);
      await page.screenshot({ path: outPath });
      console.log("✓", outPath);
      await page.close();
    }
  }
}
await browser.close();
