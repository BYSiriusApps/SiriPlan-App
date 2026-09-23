/**
 * berber / güzellik / makyaj / dövme / diyetisyen / estetik / spa sektörleri için
 * pazarlama görsel setini (anasayfa + post + hikaye) üretir.
 *
 * Tema: uydurma "mavi/turuncu" ikilisi DEĞİL — panelin GERÇEK renk temaları
 * (src/components/layout/ThemePicker.tsx THEMES) ve o temanın önerildiği
 * gerçek sektörler kullanılır:
 *   sage    (Doğa Yeşili)      → Kuaför · Berber · Spa
 *   light   (Pembe Rose)       → Güzellik · Estetik · Manikür
 *   sunset  (Turuncu Gün Batımı) → Tattoo · Makyaj · Nail
 *   ocean   (Okyanus Mavisi)   → Klinik · Diş · Diyetisyen
 * Her sektör kendi gerçek temasında ÜRETİLİR (aynı iki temayı her sektöre
 * tekrar tekrar uygulamak yerine).
 *
 * Ekran çeşitliliği: her post/hikaye çifti hep aynı "Müşteri CRM" ekranını
 * göstermez — sektöre göre panelin GERÇEKTEN sahip olduğu farklı bir sayfa
 * seçilir (Takvim / Hizmetler / Randevular / Paketler-Seans / Müşteri CRM).
 * Hangi sektörde hangi ekran kullanıldığı SECTORS[].post.screenType alanında.
 *
 * Fotoğraf paneli: ikon/gradyan DEĞİL, gerçek insan fotoğrafı (bkz.
 * gemini-fotograflar/kirpilmis/*.jpg). Logo: gerçek marka ikonu
 * (public/icons/icon-mark.png). CRM alanları src/lib/customer-fields/catalog.ts
 * içindeki GERÇEK sektöre özel müşteri alanlarına dayanır.
 *
 * Çalıştırma: node scripts/social-images/render-sektor-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_ROOT = path.join(process.cwd(), "docs/sosyal-medya/2026-09-app-tanitim-gorselleri");
const PHOTO_DIR = path.join(DOCS_ROOT, "gemini-fotograflar/kirpilmis");

// Playwright'ın setContent() ile yüklediği sayfalar "about:blank" origin'inde
// çalışır ve Chromium bu origin'den file:// kaynaklarını güvenlik gereği
// engeller. Çözüm: görselleri base64 data URI olarak HTML/CSS içine gömmek.
function dataUri(filePath, mime) {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

const LOGO_URI = dataUri(path.join(process.cwd(), "public/icons/icon-mark.png"), "image/png");
const PHOTO_CACHE = new Map();
function photoUri(slug) {
  if (!PHOTO_CACHE.has(slug)) {
    PHOTO_CACHE.set(slug, dataUri(path.join(PHOTO_DIR, `${slug}.jpg`), "image/jpeg"));
  }
  return PHOTO_CACHE.get(slug);
}

// Panelin GERÇEK tema renkleri (bkz. src/app/globals.css .sage/.blue/.ocean/.sunset
// ve :root — ThemePicker.tsx'teki "Pembe Rose" karşılığı). Değerler o CSS
// sınıflarındaki --primary/--foreground/--muted-foreground'dan alınmıştır.
const THEMES = {
  sage: {
    primary: "oklch(0.43 0.115 150)",
    navy: "oklch(0.16 0.035 150)",
    muted: "oklch(0.40 0.05 148)",
    pillBg: "oklch(0.90 0.04 148)",
    lightBgAnasayfa: "linear-gradient(160deg, oklch(0.94 0.015 145) 0%, oklch(0.88 0.03 148) 45%, oklch(0.85 0.04 150) 100%)",
    lightBgPost: "linear-gradient(160deg, oklch(0.93 0.02 145) 0%, oklch(0.87 0.035 148) 100%)",
    darkBg: "linear-gradient(200deg, oklch(0.10 0.02 150) 0%, oklch(0.16 0.045 150) 40%, oklch(0.28 0.09 150) 78%, oklch(0.40 0.13 150) 100%)",
    storyMuted: "oklch(0.72 0.07 150)",
  },
  rose: {
    primary: "oklch(0.52 0.16 345)",
    navy: "oklch(0.16 0.035 290)",
    muted: "oklch(0.40 0.045 290)",
    pillBg: "oklch(0.90 0.045 345)",
    lightBgAnasayfa: "linear-gradient(160deg, oklch(0.95 0.015 340) 0%, oklch(0.90 0.035 345) 45%, oklch(0.87 0.05 348) 100%)",
    lightBgPost: "linear-gradient(160deg, oklch(0.94 0.02 340) 0%, oklch(0.89 0.04 345) 100%)",
    darkBg: "linear-gradient(200deg, oklch(0.10 0.025 290) 0%, oklch(0.16 0.05 300) 40%, oklch(0.30 0.11 330) 78%, oklch(0.46 0.16 345) 100%)",
    storyMuted: "oklch(0.74 0.08 345)",
  },
  sunset: {
    primary: "oklch(0.58 0.18 40)",
    navy: "oklch(0.13 0.045 40)",
    muted: "oklch(0.40 0.05 45)",
    pillBg: "oklch(0.90 0.05 50)",
    lightBgAnasayfa: "linear-gradient(160deg, oklch(0.95 0.02 55) 0%, oklch(0.90 0.05 50) 45%, oklch(0.87 0.06 45) 100%)",
    lightBgPost: "linear-gradient(160deg, oklch(0.94 0.025 55) 0%, oklch(0.89 0.05 48) 100%)",
    darkBg: "linear-gradient(200deg, oklch(0.10 0.02 40) 0%, oklch(0.18 0.05 40) 40%, oklch(0.32 0.12 40) 78%, oklch(0.48 0.17 40) 100%)",
    storyMuted: "oklch(0.75 0.09 55)",
  },
  ocean: {
    primary: "oklch(0.44 0.13 195)",
    navy: "oklch(0.13 0.045 215)",
    muted: "oklch(0.38 0.05 210)",
    pillBg: "oklch(0.90 0.035 205)",
    lightBgAnasayfa: "linear-gradient(160deg, oklch(0.95 0.012 200) 0%, oklch(0.89 0.03 202) 45%, oklch(0.86 0.045 198) 100%)",
    lightBgPost: "linear-gradient(160deg, oklch(0.94 0.018 200) 0%, oklch(0.88 0.035 202) 100%)",
    darkBg: "linear-gradient(200deg, oklch(0.10 0.025 215) 0%, oklch(0.16 0.05 210) 40%, oklch(0.28 0.1 200) 78%, oklch(0.40 0.14 195) 100%)",
    storyMuted: "oklch(0.72 0.07 200)",
  },
};

let PRIMARY, NAVY, MUTED, PILL_BG, LIGHT_BG_ANASAYFA, LIGHT_BG_POST, DARK_BG, STORY_MUTED, OUT_DIR;

const BADGE_COLORS = {
  green: { bg: "#d1fae5", fg: "#047857" },
  amber: { bg: "#fef3c7", fg: "#b45309" },
  blue: { bg: "#dbeafe", fg: "#1d4ed8" },
  slate: { bg: "#f1f5f9", fg: "#475569" },
};

// Sektöre özel müşteri alanları src/lib/customer-fields/catalog.ts
// (CUSTOMER_FIELD_CATALOG) içindeki GERÇEK tanımlara dayanır. Alan seti
// olmayan sektörler (berber, güzellik, makyaj, tattoo) için panelin başka
// gerçek sayfaları (takvim/hizmetler/randevular/paketler) kullanılır.
const SECTORS = [
  {
    slug: "berber",
    theme: "sage",
    salonName: "Sirius Demo\nBarber Shop",
    ownerFirst: "Kemal",
    photo: "berber",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Koltuğunuz Hep", "Dolu Kalsın"],
      subtitle: "Randevular, berber yoğunluğu ve müşteri geçmişi anlık takipte.",
      dayNumber: 6,
      appointments: [
        { name: "Barış Kurt", service: "Saç + Sakal", time: "Yarın 10:00" },
        { name: "Kaan Ay", service: "Fade Kesim", time: "Yarın 14:00" },
        { name: "Emre Soylu", service: "Sakal Tıraşı", time: "19 Eyl" },
      ],
      calendarToday: [
        { time: "10:00", name: "Barış Kurt", staffTag: "Kemal Usta", color: "blue" },
        { time: "13:00", name: "Kaan Ay", staffTag: "Kemal Usta", color: "blue" },
        { time: "16:00", name: "Emre Soylu", staffTag: "Onur B.", color: "green" },
      ],
      bekliyor: 1,
      tamamlanan: 2,
    },
    post: {
      eyebrow: "TAKVİM",
      headline: ["Günün Planı,", "Hep Elinin Altında."],
      subtitle: "Bugünkü randevular ve personel yoğunluğu tek ekranda.",
      screenType: "takvim",
      screenTitle: "Takvim",
      screenSubtitle: "23 Eylül Çarşamba · 6 randevu",
      rows: [
        { time: "09:00", name: "Barış Kurt", service: "Saç + Sakal", staffTag: "Kemal Usta", color: "blue" },
        { time: "10:30", name: "Kaan Ay", service: "Fade Kesim", staffTag: "Kemal Usta", color: "blue" },
        { time: "13:30", name: "Emre Soylu", service: "Sakal Tıraşı", staffTag: "Onur B.", color: "green" },
        { time: "15:00", name: "Deniz Yıldız", service: "Saç Kesimi", staffTag: "Kemal Usta", color: "blue" },
        { time: "16:30", name: "Metin Acar", service: "Çocuk Kesimi", staffTag: "Onur B.", color: "green" },
      ],
    },
  },
  {
    slug: "guzellik",
    theme: "rose",
    salonName: "Sirius Demo\nGüzellik Salonu",
    ownerFirst: "Derya",
    photo: "guzellik",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Koltuğunuz Hep", "Dolu Kalsın"],
      subtitle: "Randevular, uzman yoğunluğu ve müşteri geçmişi anlık takipte.",
      dayNumber: 7,
      appointments: [
        { name: "Sena Yılmaz", service: "Saç Boyama", time: "Yarın 10:00" },
        { name: "Elif Tan", service: "Fön + Bakım", time: "Yarın 15:00" },
        { name: "Buse Kaya", service: "Röfle", time: "20 Eyl" },
      ],
      calendarToday: [
        { time: "10:30", name: "Sena Yılmaz", staffTag: "Derya K.", color: "blue" },
        { time: "13:00", name: "Elif Tan", staffTag: "Derya K.", color: "blue" },
        { time: "15:30", name: "Buse Kaya", staffTag: "Naz A.", color: "green" },
      ],
      bekliyor: 2,
      tamamlanan: 1,
    },
    post: {
      eyebrow: "HİZMETLER",
      headline: ["Hizmetini Seç,", "Fiyatı Netleşsin."],
      subtitle: "Kategorilere ayrılmış hizmet listesi ve güncel fiyatlarla çalış.",
      screenType: "hizmetler",
      screenTitle: "Hizmetler",
      screenSubtitle: "18 hizmet · 4 kategori",
      categories: [
        {
          name: "Saç",
          items: [
            { name: "Saç Kesimi", duration: "45 dk", price: "₺450" },
            { name: "Saç Boyama", duration: "120 dk", price: "₺1.200" },
            { name: "Röfle / Balyaj", duration: "150 dk", price: "₺1.650" },
          ],
        },
        {
          name: "Bakım",
          items: [
            { name: "Fön", duration: "30 dk", price: "₺250" },
            { name: "Keratin Bakımı", duration: "90 dk", price: "₺900" },
          ],
        },
      ],
    },
  },
  {
    slug: "makyaj",
    theme: "sunset",
    salonName: "Sirius Demo\nMakyaj Stüdyosu",
    ownerFirst: "Ece",
    photo: "makyaj",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Randevunuz Hep", "Dolu Kalsın"],
      subtitle: "Gelin ve özel gün randevuları, sanatçı yoğunluğu anlık takipte.",
      dayNumber: 4,
      appointments: [
        { name: "Zeynep Arık", service: "Gelin Makyajı", time: "Yarın 09:00" },
        { name: "Melis Doğan", service: "Davetli Makyajı", time: "Yarın 13:00" },
        { name: "İrem Say", service: "Prova Makyajı", time: "21 Eyl" },
      ],
      calendarToday: [
        { time: "09:00", name: "Zeynep Arık", staffTag: "Ece Yıldız", color: "blue" },
        { time: "13:00", name: "Melis Doğan", staffTag: "Ece Yıldız", color: "blue" },
        { time: "16:30", name: "İrem Say", staffTag: "Naz T.", color: "green" },
      ],
      bekliyor: 1,
      tamamlanan: 1,
    },
    post: {
      eyebrow: "RANDEVULAR",
      headline: ["Randevuların Hep", "Tek Ekranda."],
      subtitle: "Onaylanan, bekleyen ve tamamlanan randevuları anlık takip et.",
      screenType: "randevular",
      screenTitle: "Randevular",
      screenSubtitle: "Bugün 4 randevu · 1 onay bekliyor",
      rows: [
        { time: "09:00", name: "Zeynep Arık", service: "Gelin Makyajı", status: "Onaylandı", color: "green" },
        { time: "13:00", name: "Melis Doğan", service: "Davetli Makyajı", status: "Bekliyor", color: "amber" },
        { time: "16:30", name: "İrem Say", service: "Prova Makyajı", status: "Onaylandı", color: "green" },
        { time: "18:00", name: "Sude Kaan", service: "Kaş Makyajı", status: "Tamamlandı", color: "blue" },
      ],
    },
  },
  {
    slug: "tattoo",
    theme: "sunset",
    salonName: "Sirius Demo\nDövme Stüdyosu",
    ownerFirst: "Kaya",
    photo: "tattoo",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Randevunuz Hep", "Dolu Kalsın"],
      subtitle: "Seans randevuları, sanatçı takvimi ve müşteri geçmişi anlık takipte.",
      dayNumber: 3,
      appointments: [
        { name: "Onur Kılıç", service: "Kol Dövmesi (2. Seans)", time: "Yarın 11:00" },
        { name: "Ayla Demir", service: "Minimal Tattoo", time: "Yarın 16:00" },
        { name: "Deniz Ak", service: "Kapatma Tasarım", time: "22 Eyl" },
      ],
      calendarToday: [
        { time: "11:00", name: "Onur Kılıç", staffTag: "Kaya S.", color: "blue" },
        { time: "14:30", name: "Ayla Demir", staffTag: "Kaya S.", color: "blue" },
        { time: "17:00", name: "Deniz Ak", staffTag: "Mert Y.", color: "green" },
      ],
      bekliyor: 2,
      tamamlanan: 0,
    },
    post: {
      eyebrow: "PAKET & SEANS",
      headline: ["Seansını Takip Et,", "Projeni Tamamla."],
      subtitle: "Çok seanslı projelerde kalan seans ve ödeme takibini kolay yap.",
      screenType: "paketler",
      screenTitle: "Paketler",
      screenSubtitle: "5 aktif proje · seans bazlı takip",
      packages: [
        { name: "Onur Kılıç", project: "Kol Dövmesi (Tam Kol)", used: 2, total: 5, status: "Devam Ediyor", color: "blue" },
        { name: "Ayla Demir", project: "Minimal Set", used: 1, total: 2, status: "Devam Ediyor", color: "blue" },
        { name: "Deniz Ak", project: "Kapatma Tasarım", used: 3, total: 3, status: "Tamamlandı", color: "green" },
      ],
    },
  },
  {
    slug: "diyetisyen",
    theme: "ocean",
    salonName: "Sirius Demo\nDiyet & Beslenme",
    ownerFirst: "Ezgi",
    photo: "diyetisyen",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Danışanlarınız Hep", "Takipte Kalsın"],
      subtitle: "Aktif randevular, seans geçmişi ve kilo takibi anlık takipte.",
      dayNumber: 5,
      appointments: [
        { name: "Sena Yılmaz", service: "İlk Görüşme", time: "Yarın 10:00" },
        { name: "Burak Er", service: "Kontrol Seansı", time: "Yarın 14:00" },
        { name: "Aylin Koç", service: "Beslenme Planı", time: "19 Eyl" },
      ],
      calendarToday: [
        { time: "10:00", name: "Sena Yılmaz", staffTag: "Dyt. Ezgi", color: "blue" },
        { time: "13:00", name: "Burak Er", staffTag: "Dyt. Ezgi", color: "blue" },
        { time: "15:30", name: "Aylin Koç", staffTag: "Dyt. Ezgi", color: "green" },
      ],
      bekliyor: 0,
      tamamlanan: 3,
    },
    post: {
      eyebrow: "DANIŞAN CRM",
      headline: ["Danışanını Tanı,", "Sonuç Aldır."],
      subtitle: "Kilo takibi, seans geçmişi ve notlarla her danışana özel program sun.",
      screenType: "crm",
      screenTitle: "Danışanlar",
      screenSubtitle: "22 danışan · 4 aktif program",
      customers: [
        {
          initial: "S", name: "Sena Yılmaz", phone: "0533 402 18 77",
          cols: [{ label: "Seans", value: "6" }, { label: "Değişim", value: "-4,2 kg" }, { label: "Son Görüşme", value: "15 Eyl" }],
          footer: "Program: Kilo Kontrolü",
        },
        {
          initial: "B", name: "Burak Er", phone: "0544 219 90 03",
          cols: [{ label: "Seans", value: "3" }, { label: "Değişim", value: "-1,8 kg" }, { label: "Son Görüşme", value: "10 Eyl" }],
          footer: "Program: Sporcu Beslenmesi",
        },
      ],
    },
  },
  {
    slug: "estetik",
    theme: "rose",
    salonName: "Sirius Demo\nEstetik Kliniği",
    ownerFirst: "Dr. Melis",
    photo: "estetik",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Danışanlarınız Hep", "Takipte Kalsın"],
      subtitle: "Muayene randevuları ve tedavi takibi anlık takipte.",
      dayNumber: 4,
      appointments: [
        { name: "Aslı Kurt", service: "Kontrol Muayenesi", time: "Yarın 11:00" },
        { name: "Deniz Aydın", service: "İlk Muayene", time: "Yarın 15:00" },
        { name: "Pelin Su", service: "Tedavi Seansı", time: "21 Eyl" },
      ],
      calendarToday: [
        { time: "11:00", name: "Aslı Kurt", staffTag: "Dr. Melis", color: "blue" },
        { time: "14:00", name: "Deniz Aydın", staffTag: "Dr. Melis", color: "blue" },
        { time: "16:30", name: "Pelin Su", staffTag: "Dr. Melis", color: "green" },
      ],
      bekliyor: 1,
      tamamlanan: 2,
    },
    post: {
      eyebrow: "DANIŞAN CRM",
      headline: ["Danışanını Tanı,", "Sonuç Aldır."],
      subtitle: "Muayene notu ve tedavi durumuyla her danışana özel takip sun.",
      screenType: "crm",
      screenTitle: "Danışanlar",
      screenSubtitle: "19 danışan · 5 aktif tedavi",
      customers: [
        {
          initial: "A", name: "Aslı Kurt", phone: "0533 704 22 18",
          cols: [{ label: "Son Muayene", value: "16 Eyl" }, { label: "Seans", value: "4" }],
          footer: "Muayene Notu: Cilt bakım tedavisi devam ediyor",
          badge: { label: "Takipte", color: "green" },
        },
        {
          initial: "D", name: "Deniz Aydın", phone: "0541 390 47 62",
          cols: [{ label: "Son Muayene", value: "9 Eyl" }, { label: "Seans", value: "1" }],
          footer: "Muayene Notu: Ön değerlendirme yapıldı",
          badge: { label: "Kontrol Gerekiyor", color: "amber" },
        },
      ],
    },
  },
  {
    slug: "petkuafor",
    theme: "sage",
    salonName: "Sirius Demo\nPet Kuaför",
    ownerFirst: "Aslı",
    photo: "petkuafor",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Dostlarınız Hep", "Bakımda Kalsın"],
      subtitle: "Randevular, bakım yoğunluğu ve evcil dost geçmişi anlık takipte.",
      dayNumber: 6,
      appointments: [
        { name: "Zeynep Kaya (Luna)", service: "Irk Standardı Tıraş", time: "Yarın 10:00" },
        { name: "Mert Doğan (Zorro)", service: "Köpek Yıkama", time: "Yarın 14:00" },
        { name: "Aslı Yıldız (Mia)", service: "Tırnak Kesimi", time: "19 Eyl" },
      ],
      calendarToday: [
        { time: "10:00", name: "Zeynep Kaya (Luna)", staffTag: "Pet Groomer Aslı", color: "blue" },
        { time: "13:00", name: "Mert Doğan (Zorro)", staffTag: "Pet Groomer Aslı", color: "blue" },
        { time: "16:00", name: "Aslı Yıldız (Mia)", staffTag: "Onur B.", color: "green" },
      ],
      bekliyor: 1,
      tamamlanan: 2,
    },
    post: {
      eyebrow: "EVCİL DOST CRM",
      headline: ["Dostunu Tanı,", "Bakımını Kolaylaştır."],
      subtitle: "Tür, cins, aşı ve tüy hassasiyetiyle her dostuna özel bakım sun.",
      screenType: "crm",
      screenTitle: "Evcil Dostlar",
      screenSubtitle: "34 kayıt · 12 aktif bakım",
      customers: [
        {
          initial: "L", name: "Luna", phone: "0533 210 44 87",
          cols: [{ label: "Tür", value: "Köpek" }, { label: "Cins", value: "Golden Retriever" }, { label: "Kilo", value: "28 kg" }],
          footer: "Son Aşı: 12 Ağu 2026 · Sahibi: Zeynep Kaya",
          badge: { label: "Sadık Müşteri", color: "green" },
        },
        {
          initial: "Z", name: "Zorro", phone: "0544 902 17 35",
          cols: [{ label: "Tür", value: "Köpek" }, { label: "Cins", value: "Poodle" }, { label: "Kilo", value: "6 kg" }],
          footer: "Not: Hassas cilt, nazik şampuan · Sahibi: Mert Doğan",
          badge: { label: "Hassas Tüy/Cilt", color: "amber" },
        },
      ],
    },
  },
  {
    slug: "disklinigi",
    theme: "ocean",
    salonName: "Sirius Demo\nDiş Kliniği",
    ownerFirst: "Dt. Mehmet",
    photo: "disklinigi",
    anasayfa: {
      eyebrow: "GENEL YÖNETİM",
      headline: ["Hastalarınız Hep", "Gülümsesin"],
      subtitle: "Randevular, hekim yoğunluğu ve tedavi geçmişi anlık takipte.",
      dayNumber: 8,
      appointments: [
        { name: "Ahmet Yılmaz", service: "Kanal Tedavisi", time: "Yarın 09:30" },
        { name: "Elif Demir", service: "Diş Beyazlatma", time: "Yarın 13:00" },
        { name: "Caner Aksoy", service: "Kontrol Muayenesi", time: "20 Eyl" },
      ],
      calendarToday: [
        { time: "09:30", name: "Ahmet Yılmaz", staffTag: "Dt. Mehmet Kaya", color: "blue" },
        { time: "12:00", name: "Elif Demir", staffTag: "Dt. Mehmet Kaya", color: "blue" },
        { time: "15:00", name: "Caner Aksoy", staffTag: "Dt. Selin Ar.", color: "green" },
      ],
      bekliyor: 2,
      tamamlanan: 3,
    },
    post: {
      eyebrow: "TAKVİM",
      headline: ["Hasta Akışın,", "Kontrol Altında."],
      subtitle: "Bugünkü hasta randevuları ve hekim yoğunluğu tek ekranda.",
      screenType: "takvim",
      screenTitle: "Takvim",
      screenSubtitle: "23 Eylül Çarşamba · 7 randevu",
      rows: [
        { time: "09:00", name: "Ahmet Yılmaz", service: "Kanal Tedavisi", staffTag: "Dt. Mehmet Kaya", color: "blue" },
        { time: "10:30", name: "Elif Demir", service: "Diş Beyazlatma", staffTag: "Dt. Mehmet Kaya", color: "blue" },
        { time: "12:00", name: "Caner Aksoy", service: "Kontrol Muayenesi", staffTag: "Dt. Selin Ar.", color: "green" },
        { time: "14:00", name: "Buse Kılıç", service: "Diş Taşı Temizliği", staffTag: "Dt. Mehmet Kaya", color: "blue" },
        { time: "16:00", name: "Emir Su", service: "Dolgu", staffTag: "Dt. Selin Ar.", color: "green" },
      ],
    },
  },
  {
    slug: "spa",
    theme: "sage",
    salonName: "Sirius Demo\nSpa & Masaj",
    ownerFirst: "Selin",
    photo: "spa",
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
    post: {
      eyebrow: "MİSAFİR CRM",
      headline: ["Misafirini Tanı,", "Sadakatini Kazan."],
      subtitle: "Üyelik ve cilt/vücut tipiyle her misafire kişiye özel deneyim sun.",
      screenType: "crm",
      screenTitle: "Misafirler",
      screenSubtitle: "26 misafir · 9 premium üye",
      customers: [
        {
          initial: "M", name: "Merve Şahin", phone: "0533 400 20 01",
          cols: [{ label: "Üyelik Tipi", value: "Premium" }, { label: "Cilt/Vücut Tipi", value: "Karma" }],
          footer: "Son: 15 Eyl 2026",
          badge: { label: "Premium", color: "blue" },
        },
        {
          initial: "O", name: "Onur Demirtaş", phone: "0533 400 20 02",
          cols: [{ label: "Üyelik Tipi", value: "Standart" }, { label: "Cilt/Vücut Tipi", value: "Hassas" }],
          footer: "Son: 8 Eyl 2026",
          badge: { label: "Kontrol Gerekiyor", color: "amber" },
        },
      ],
    },
  },
];

function baseCss() {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Plus Jakarta Sans', sans-serif; }
  .serif { font-family:'Playfair Display', serif; }
  .logo { display:flex; align-items:center; gap:10px; }
  .logo .mark { width:40px; height:40px; border-radius:10px; object-fit:cover; display:block; }
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

function logoHTML(color) {
  return `<div class="logo"><img class="mark" src="${LOGO_URI}"><div class="word" style="color:${color};">siriplan</div></div>`;
}

function badgeStyle(color) {
  const c = BADGE_COLORS[color] ?? BADGE_COLORS.slate;
  return `background:${c.bg};color:${c.fg};`;
}

function screenHeaderHTML(eyebrow, title, subtitle) {
  return `
    <div style="font-size:13px; font-weight:700; letter-spacing:.06em; color:${PRIMARY};">${eyebrow}</div>
    <div class="serif" style="font-size:32px; font-weight:700; color:${NAVY}; margin-top:4px;">${title}</div>
    <div style="font-size:14px; color:${MUTED}; margin-top:4px; margin-bottom:22px;">${subtitle}</div>
  `;
}

// ---- Ekran 1: Müşteri/Danışan/Misafir CRM ----
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

function crmScreenHTML(p) {
  return `
    ${screenHeaderHTML("CRM", p.screenTitle, p.screenSubtitle)}
    ${p.customers.map(customerCardHTML).join("")}
  `;
}

// ---- Ekran 2: Takvim (günlük randevu akışı) ----
function takvimScreenHTML(p) {
  return `
    ${screenHeaderHTML("TAKVİM", p.screenTitle, p.screenSubtitle)}
    ${p.rows.map((r) => `
      <div class="card" style="margin-bottom:14px;">
        <div class="accent"></div>
        <div style="padding:14px 18px; display:flex; align-items:center; gap:14px;">
          <div class="serif" style="font-size:17px; font-weight:700; color:${PRIMARY}; width:56px; flex-shrink:0;">${r.time}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:15px; color:${NAVY};">${r.name}</div>
            <div style="font-size:12px; color:${MUTED};">${r.service}</div>
          </div>
          <div class="badge" style="${badgeStyle(r.color)}">${r.staffTag}</div>
        </div>
      </div>
    `).join("")}
  `;
}

// ---- Ekran 3: Hizmetler (kategori + fiyat listesi) ----
function hizmetlerScreenHTML(p) {
  return `
    ${screenHeaderHTML("HİZMETLER", p.screenTitle, p.screenSubtitle)}
    ${p.categories.map((cat) => `
      <div style="font-size:12px; font-weight:700; letter-spacing:.05em; color:${MUTED}; margin:6px 0 8px;">${cat.name.toUpperCase()}</div>
      ${cat.items.map((it) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px dashed #e5e9f5;">
          <div>
            <div style="font-weight:700; font-size:14px; color:${NAVY};">${it.name}</div>
            <div style="font-size:11px; color:${MUTED};">${it.duration}</div>
          </div>
          <div class="serif" style="font-weight:700; font-size:16px; color:${PRIMARY};">${it.price}</div>
        </div>
      `).join("")}
    `).join("<div style=\"height:10px;\"></div>")}
  `;
}

// ---- Ekran 4: Randevular (durum rozetli liste) ----
function randevularScreenHTML(p) {
  return `
    ${screenHeaderHTML("RANDEVULAR", p.screenTitle, p.screenSubtitle)}
    ${p.rows.map((r) => `
      <div class="card" style="margin-bottom:14px;">
        <div class="accent"></div>
        <div style="padding:14px 18px; display:flex; align-items:center; gap:14px;">
          <div class="serif" style="font-size:17px; font-weight:700; color:${PRIMARY}; width:56px; flex-shrink:0;">${r.time}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:15px; color:${NAVY};">${r.name}</div>
            <div style="font-size:12px; color:${MUTED};">${r.service}</div>
          </div>
          <div class="badge" style="${badgeStyle(r.color)}">${r.status}</div>
        </div>
      </div>
    `).join("")}
  `;
}

// ---- Ekran 5: Paketler / Seans takibi ----
function paketlerScreenHTML(p) {
  return `
    ${screenHeaderHTML("PAKET & SEANS", p.screenTitle, p.screenSubtitle)}
    ${p.packages.map((pkg) => {
      const pct = Math.round((pkg.used / pkg.total) * 100);
      return `
      <div class="card" style="margin-bottom:16px;">
        <div class="accent"></div>
        <div style="padding:16px 18px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div style="font-weight:700; font-size:16px; color:${NAVY};">${pkg.name}</div>
            <div class="badge" style="${badgeStyle(pkg.color)}">${pkg.status}</div>
          </div>
          <div style="font-size:12px; color:${MUTED}; margin-top:2px;">${pkg.project}</div>
          <div style="display:flex; align-items:center; gap:10px; margin-top:12px;">
            <div style="flex:1; height:8px; border-radius:999px; background:#eef0f6; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:${PRIMARY};"></div>
            </div>
            <div style="font-size:12px; font-weight:700; color:${NAVY}; white-space:nowrap;">${pkg.used}/${pkg.total} seans</div>
          </div>
        </div>
      </div>`;
    }).join("")}
  `;
}

function postScreenHTML(sector) {
  const p = sector.post;
  switch (p.screenType) {
    case "takvim": return takvimScreenHTML(p);
    case "hizmetler": return hizmetlerScreenHTML(p);
    case "randevular": return randevularScreenHTML(p);
    case "paketler": return paketlerScreenHTML(p);
    default: return crmScreenHTML(p);
  }
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

function photoPanelHTML(sector) {
  return `
    <div style="width:478px; height:430px; border-radius:24px; background-image:url('${photoUri(sector.photo)}'); background-size:cover; background-position:center;"></div>
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
    const p = sector.post;
    return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss()}
      body { width:1080px; height:1080px; background:${LIGHT_BG_POST}; padding:56px; display:flex; flex-direction:column; }
    </style></head><body>
      ${logoHTML(NAVY)}
      <div style="display:flex; margin-top:34px; gap:40px; flex:1;">
        <div style="flex:1; display:flex; flex-direction:column;">
          <div class="pill" style="background:${PILL_BG}; color:${PRIMARY}; align-self:flex-start;">${p.eyebrow}</div>
          <div class="serif" style="font-size:46px; font-weight:700; color:${NAVY}; line-height:1.15; margin-top:18px;">${p.headline.join("<br>")}</div>
          <div style="font-size:16px; color:${MUTED}; margin-top:16px; max-width:420px; line-height:1.5;">${p.subtitle}</div>
          <div class="pill" style="background:${PRIMARY}; color:#fff; margin-top:24px; align-self:flex-start; padding:14px 28px; font-size:15px;">siriplan.com ↗</div>
          <div style="flex:1;"></div>
          ${photoPanelHTML(sector)}
        </div>
        <div class="phone" style="width:450px; height:906px; flex-shrink:0;">
          <div class="notch"></div>
          <div class="screen" style="padding:30px 26px;">${postScreenHTML(sector)}</div>
        </div>
      </div>
    </body></html>`;
  }

  // hikaye (story)
  const p = sector.post;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss()}
    body { width:1080px; height:1920px; background:${DARK_BG}; display:flex; flex-direction:column; align-items:center; padding-top:70px; }
  </style></head><body>
    ${logoHTML("#fff")}
    <div class="serif" style="font-size:56px; font-weight:700; color:#fff; text-align:center; line-height:1.15; margin-top:46px;">${p.headline.join("<br>")}</div>

    <div class="phone" style="width:480px; height:960px; margin-top:56px;">
      <div class="notch"></div>
      <div class="screen" style="padding:30px 26px;">${postScreenHTML(sector)}</div>
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
for (const sector of SECTORS) {
  const theme = THEMES[sector.theme];
  PRIMARY = theme.primary;
  NAVY = theme.navy;
  MUTED = theme.muted;
  PILL_BG = theme.pillBg;
  LIGHT_BG_ANASAYFA = theme.lightBgAnasayfa;
  LIGHT_BG_POST = theme.lightBgPost;
  DARK_BG = theme.darkBg;
  STORY_MUTED = theme.storyMuted;
  OUT_DIR = path.join(DOCS_ROOT, `sektorler-${sector.theme}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

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
await browser.close();
