import {
  translateCatalogCategory,
  translateCatalogService,
  type CatalogLocale,
} from "@/lib/services/catalog-i18n";

export interface CatalogService {
  name: string;
  duration: number;
  price: number;
  category: string;
}

export interface CatalogCategory {
  label: string;
  icon: string;
  services: CatalogService[];
}

const KUAFOR: CatalogCategory[] = [
  {
    label: "Kesim", icon: "✂️",
    services: [
      { name: "Kadın Kesim", duration: 45, price: 400, category: "sac" },
      { name: "Erkek Kesim", duration: 30, price: 200, category: "sac" },
      { name: "Çocuk Kesim", duration: 20, price: 150, category: "sac" },
      { name: "Saç Yıkama + Kesim", duration: 60, price: 500, category: "sac" },
      { name: "Saç Yıkama + Fön", duration: 45, price: 350, category: "sac" },
      { name: "Patlama (Frenk Saç) Kesimi", duration: 20, price: 150, category: "sac" },
      { name: "Uç Alma", duration: 20, price: 200, category: "sac" },
      { name: "Katlı Kesim", duration: 50, price: 450, category: "sac" },
      { name: "Bob Kesim", duration: 45, price: 450, category: "sac" },
      { name: "Pixie Kesim", duration: 40, price: 400, category: "sac" },
    ],
  },
  {
    label: "Renk & Boyama", icon: "🎨",
    services: [
      { name: "Saç Boyama (Tek Renk)", duration: 90, price: 800, category: "sac" },
      { name: "Röfle", duration: 120, price: 1200, category: "sac" },
      { name: "Balayaj", duration: 150, price: 1800, category: "sac" },
      { name: "Folyo Meşe", duration: 90, price: 1000, category: "sac" },
      { name: "Ombrè / Sombré", duration: 120, price: 1500, category: "sac" },
      { name: "Kapatma (Saç Dibi)", duration: 60, price: 500, category: "sac" },
      { name: "Dekolorasyon (Saç Açma)", duration: 90, price: 1200, category: "sac" },
      { name: "Toner / Tonlama", duration: 30, price: 400, category: "sac" },
      { name: "Renk Düzeltme", duration: 120, price: 1500, category: "sac" },
      { name: "Gece Mavisi / Pastel Renk", duration: 150, price: 2000, category: "sac" },
      { name: "Highlights (Vurgular)", duration: 120, price: 1400, category: "sac" },
      { name: "Saç Boyama + Fön", duration: 120, price: 1100, category: "sac" },
    ],
  },
  {
    label: "Bakım & Şekil", icon: "💆",
    services: [
      { name: "Keratin Bakım", duration: 120, price: 2000, category: "sac" },
      { name: "Saç Botoksu", duration: 90, price: 1500, category: "sac" },
      { name: "Olaplex Tedavisi", duration: 60, price: 1200, category: "sac" },
      { name: "Protein Bakım", duration: 45, price: 700, category: "sac" },
      { name: "Derin Nem Maskesi", duration: 30, price: 400, category: "sac" },
      { name: "Saç Derisi (Scalp) Bakımı", duration: 45, price: 600, category: "sac" },
      { name: "Fön", duration: 30, price: 200, category: "sac" },
      { name: "Maşa / Bigudi", duration: 45, price: 350, category: "sac" },
      { name: "Düzleştirme (Ütü)", duration: 40, price: 300, category: "sac" },
      { name: "Kalıcı Ondüle / Perma", duration: 120, price: 1000, category: "sac" },
      { name: "Işıltı & Parlaklık Bakımı", duration: 30, price: 350, category: "sac" },
    ],
  },
  {
    label: "Şekillendirme & Tasarım", icon: "👰",
    services: [
      { name: "Gelin Saç Tasarımı", duration: 120, price: 3000, category: "sac" },
      { name: "Topuz / Saç Toplama", duration: 45, price: 500, category: "sac" },
      { name: "Örgü Saç Tasarımı", duration: 60, price: 600, category: "sac" },
      { name: "Dalgalı Saç (Beach Wave)", duration: 40, price: 400, category: "sac" },
      { name: "Nişan / Kına Saç Tasarımı", duration: 90, price: 1500, category: "sac" },
      { name: "Fotoğraf / Çekim Saç", duration: 60, price: 800, category: "sac" },
    ],
  },
  {
    label: "Saç Uzatma", icon: "👑",
    services: [
      { name: "Kaynak Saç Takma", duration: 180, price: 3000, category: "sac" },
      { name: "Bant Saç Uzatma", duration: 120, price: 2500, category: "sac" },
      { name: "Nano Ring Saç", duration: 150, price: 3500, category: "sac" },
      { name: "Kıl Kaynak Saç", duration: 180, price: 4000, category: "sac" },
      { name: "Megahair Bant Saç", duration: 120, price: 2800, category: "sac" },
    ],
  },
];

const BERBER: CatalogCategory[] = [
  {
    label: "Kesim", icon: "✂️",
    services: [
      { name: "Erkek Kesim", duration: 30, price: 200, category: "sac" },
      { name: "Çocuk Kesim", duration: 20, price: 150, category: "sac" },
      { name: "Sıfır Tıraş", duration: 20, price: 150, category: "sac" },
      { name: "Fade Kesim", duration: 35, price: 250, category: "sac" },
      { name: "Skin Fade", duration: 35, price: 270, category: "sac" },
      { name: "Undercut", duration: 30, price: 230, category: "sac" },
      { name: "Pompadour Kesim", duration: 40, price: 300, category: "sac" },
      { name: "Box Fade", duration: 35, price: 260, category: "sac" },
      { name: "Kesim + Fön", duration: 45, price: 300, category: "sac" },
    ],
  },
  {
    label: "Sakal", icon: "🪒",
    services: [
      { name: "Sakal Tıraşı", duration: 20, price: 150, category: "sac" },
      { name: "Sakal Düzenleme", duration: 15, price: 100, category: "sac" },
      { name: "Bıyık Düzenleme", duration: 10, price: 80, category: "sac" },
      { name: "Sakal + Kesim", duration: 45, price: 300, category: "sac" },
      { name: "Klasik Ustura Tıraşı", duration: 30, price: 250, category: "sac" },
      { name: "Alın Tıraşı", duration: 10, price: 60, category: "sac" },
      { name: "Boyun Tıraşı", duration: 10, price: 60, category: "sac" },
      { name: "Sakal Renklendirme", duration: 30, price: 200, category: "sac" },
      { name: "Sakal Yağı Bakımı", duration: 15, price: 100, category: "sac" },
    ],
  },
  {
    label: "Cilt & Bakım", icon: "💆",
    services: [
      { name: "Yüz Maskesi", duration: 20, price: 200, category: "cilt" },
      { name: "Kil Maskesi", duration: 20, price: 180, category: "cilt" },
      { name: "Yüz Buharlama", duration: 15, price: 120, category: "cilt" },
      { name: "Burun Bandı", duration: 15, price: 100, category: "cilt" },
      { name: "Göz Altı Maskesi", duration: 20, price: 150, category: "cilt" },
      { name: "Saç Boyama", duration: 60, price: 400, category: "sac" },
      { name: "Kaş Düzenleme", duration: 10, price: 80, category: "kas" },
    ],
  },
];

const NAIL: CatalogCategory[] = [
  {
    label: "Manikür", icon: "💅",
    services: [
      { name: "Klasik Manikür", duration: 30, price: 300, category: "tirnak" },
      { name: "Kalıcı Oje (Gel)", duration: 45, price: 500, category: "tirnak" },
      { name: "Fransız Manikür", duration: 45, price: 450, category: "tirnak" },
      { name: "Kalıcı + Bakım", duration: 60, price: 650, category: "tirnak" },
      { name: "Medikal Manikür", duration: 45, price: 550, category: "tirnak" },
      { name: "Babyboomer Manikür", duration: 60, price: 600, category: "tirnak" },
      { name: "Dip Powder Manikür", duration: 50, price: 580, category: "tirnak" },
      { name: "Biyojel Manikür", duration: 50, price: 550, category: "tirnak" },
    ],
  },
  {
    label: "Pedikür", icon: "🦶",
    services: [
      { name: "Klasik Pedikür", duration: 40, price: 350, category: "tirnak" },
      { name: "Kalıcı Oje Pedikür", duration: 55, price: 550, category: "tirnak" },
      { name: "SPA Pedikür", duration: 60, price: 700, category: "tirnak" },
      { name: "Medikal Pedikür", duration: 50, price: 600, category: "tirnak" },
      { name: "Fransız Pedikür", duration: 50, price: 500, category: "tirnak" },
      { name: "Pedikür + Kalıcı Oje", duration: 70, price: 750, category: "tirnak" },
    ],
  },
  {
    label: "Protez Tırnak", icon: "✨",
    services: [
      { name: "Akrilik Tırnak (Takma)", duration: 90, price: 1200, category: "tirnak" },
      { name: "Jel Tırnak", duration: 75, price: 1000, category: "tirnak" },
      { name: "Tırnak Uzatma (Builder)", duration: 90, price: 1100, category: "tirnak" },
      { name: "Dolgu (Refill)", duration: 60, price: 600, category: "tirnak" },
      { name: "Söküm", duration: 30, price: 250, category: "tirnak" },
      { name: "Poligel Tırnak", duration: 80, price: 1050, category: "tirnak" },
      { name: "BIAB (Builder in a Bottle)", duration: 60, price: 800, category: "tirnak" },
    ],
  },
  {
    label: "Nail Art", icon: "🎨",
    services: [
      { name: "Nail Art (Basit)", duration: 30, price: 300, category: "tirnak" },
      { name: "Nail Art (Detaylı)", duration: 60, price: 600, category: "tirnak" },
      { name: "Chrome Toz", duration: 20, price: 200, category: "tirnak" },
      { name: "Glitter Süsleme", duration: 20, price: 200, category: "tirnak" },
      { name: "3D Nail Art", duration: 60, price: 700, category: "tirnak" },
      { name: "Ombre Tırnak", duration: 40, price: 450, category: "tirnak" },
      { name: "Marble Effect", duration: 45, price: 500, category: "tirnak" },
      { name: "Sticker & Folyo Süsleme", duration: 20, price: 180, category: "tirnak" },
      { name: "El Boyama Nail Art", duration: 75, price: 800, category: "tirnak" },
    ],
  },
  {
    label: "Tırnak Bakımı", icon: "🌿",
    services: [
      { name: "Tırnak Güçlendirme", duration: 30, price: 300, category: "tirnak" },
      { name: "Kütiküla Bakımı", duration: 20, price: 200, category: "tirnak" },
      { name: "Tırnak Onarım (Kırık)", duration: 20, price: 180, category: "tirnak" },
      { name: "Tırnak Nemlendirme Bakımı", duration: 25, price: 250, category: "tirnak" },
    ],
  },
];

const GUZELLIK: CatalogCategory[] = [
  {
    label: "Cilt Bakımı", icon: "✨",
    services: [
      { name: "Cilt Bakımı (Temel)", duration: 60, price: 800, category: "cilt" },
      { name: "Derin Gözenek Temizliği", duration: 75, price: 1000, category: "cilt" },
      { name: "Hydrafacial", duration: 60, price: 1500, category: "cilt" },
      { name: "Anti-Aging Bakım", duration: 90, price: 1800, category: "cilt" },
      { name: "Aydınlatma Bakımı", duration: 60, price: 1200, category: "cilt" },
      { name: "Leke Tedavisi", duration: 60, price: 1200, category: "cilt" },
      { name: "Yüz Masajı", duration: 30, price: 500, category: "cilt" },
      { name: "Oksijen Terapi", duration: 60, price: 1400, category: "cilt" },
      { name: "LED Işık Terapi", duration: 30, price: 700, category: "cilt" },
      { name: "Mikrodermabrazyon", duration: 45, price: 1100, category: "cilt" },
      { name: "Dermaplaning", duration: 45, price: 1000, category: "cilt" },
      { name: "Selülit Masajı", duration: 45, price: 900, category: "cilt" },
      { name: "Yüz Gençleştirme Bakımı", duration: 75, price: 1600, category: "cilt" },
    ],
  },
  {
    label: "Epilasyon", icon: "🌸",
    services: [
      { name: "Ağda — Bacak Tamamı", duration: 45, price: 600, category: "lazer" },
      { name: "Ağda — Bacak Yarım (Alt)", duration: 25, price: 350, category: "lazer" },
      { name: "Ağda — Bacak Yarım (Üst)", duration: 25, price: 350, category: "lazer" },
      { name: "Ağda — Koltuk Altı", duration: 15, price: 200, category: "lazer" },
      { name: "Ağda — Bikini", duration: 20, price: 300, category: "lazer" },
      { name: "Ağda — Bel Altı Komple (Brezilyalı)", duration: 30, price: 500, category: "lazer" },
      { name: "Ağda — Kol Tamamı", duration: 30, price: 400, category: "lazer" },
      { name: "Ağda — Dudak Üstü", duration: 10, price: 100, category: "lazer" },
      { name: "Ağda — Yüz Komple", duration: 25, price: 300, category: "lazer" },
      { name: "İplik — Yüz Tamamı", duration: 20, price: 250, category: "lazer" },
      { name: "İplik — Kaş", duration: 10, price: 100, category: "kas" },
      { name: "İplik — Alın", duration: 10, price: 80, category: "kas" },
      { name: "Şeker Epilasyon (Sugaring)", duration: 40, price: 500, category: "lazer" },
      { name: "Ağda Paketi (Bacak + Koltuk)", duration: 55, price: 750, category: "lazer" },
    ],
  },
  {
    label: "Kaş & Kirpik", icon: "👁️",
    services: [
      { name: "Kaş Alımı", duration: 15, price: 150, category: "kas" },
      { name: "Kaş Laminasyon", duration: 60, price: 800, category: "kas" },
      { name: "Kaş Boyama", duration: 20, price: 200, category: "kas" },
      { name: "Kaş Tasarımı", duration: 20, price: 250, category: "kas" },
      { name: "Kirpik Lifting", duration: 60, price: 700, category: "kas" },
      { name: "Kirpik Laminasyon", duration: 45, price: 600, category: "kas" },
      { name: "Kirpik Boyama", duration: 20, price: 200, category: "kas" },
      { name: "Kirpik Uzatma (Tek Tek)", duration: 120, price: 1500, category: "kas" },
      { name: "Kirpik Permi", duration: 60, price: 650, category: "kas" },
      { name: "Göz Çevresi Bakım Paketi", duration: 75, price: 1100, category: "kas" },
    ],
  },
  {
    label: "Makyaj", icon: "💄",
    services: [
      { name: "Günlük Makyaj", duration: 45, price: 600, category: "genel" },
      { name: "Gelin Makyajı", duration: 90, price: 2500, category: "genel" },
      { name: "Gece Makyajı", duration: 60, price: 800, category: "genel" },
      { name: "Fotoğraf Makyajı", duration: 60, price: 1000, category: "genel" },
      { name: "Airbrush Makyaj", duration: 60, price: 1200, category: "genel" },
      { name: "Kontur & Highlight Makyaj", duration: 60, price: 900, category: "genel" },
    ],
  },
  {
    label: "Vücut Bakımı", icon: "🛁",
    services: [
      { name: "Vücut Peeling", duration: 40, price: 700, category: "cilt" },
      { name: "Çikolata Maske (Vücut)", duration: 60, price: 1000, category: "cilt" },
      { name: "G5 Masajı (Selülit)", duration: 40, price: 800, category: "cilt" },
      { name: "Vakum Masajı", duration: 45, price: 900, category: "cilt" },
    ],
  },
];

const SPA: CatalogCategory[] = [
  {
    label: "Masaj", icon: "💆",
    services: [
      { name: "İsveç Masajı (60 dk)", duration: 60, price: 1200, category: "spa" },
      { name: "İsveç Masajı (90 dk)", duration: 90, price: 1600, category: "spa" },
      { name: "Derin Doku Masajı", duration: 60, price: 1400, category: "spa" },
      { name: "Aromaterapi Masajı", duration: 60, price: 1300, category: "spa" },
      { name: "Sıcak Taş Masajı (60 dk)", duration: 60, price: 1600, category: "spa" },
      { name: "Sıcak Taş Masajı (90 dk)", duration: 90, price: 2000, category: "spa" },
      { name: "Thai Masajı", duration: 90, price: 1500, category: "spa" },
      { name: "Refleksoloji", duration: 45, price: 800, category: "spa" },
      { name: "Kafa & Boyun Masajı", duration: 30, price: 600, category: "spa" },
      { name: "Lenf Drenaj Masajı", duration: 60, price: 1400, category: "spa" },
      { name: "Shiatsu Masajı", duration: 60, price: 1300, category: "spa" },
      { name: "Prenatal (Hamile) Masajı", duration: 60, price: 1200, category: "spa" },
      { name: "Spor Masajı", duration: 60, price: 1300, category: "spa" },
      { name: "Ayak Masajı", duration: 30, price: 600, category: "spa" },
      { name: "Çift Masajı (2 kişi)", duration: 60, price: 2200, category: "spa" },
    ],
  },
  {
    label: "Vücut Bakımı", icon: "🛁",
    services: [
      { name: "Kese & Köpük", duration: 45, price: 700, category: "spa" },
      { name: "Vücut Peeling", duration: 45, price: 800, category: "cilt" },
      { name: "Detoks Çamur Maskesi", duration: 60, price: 1200, category: "cilt" },
      { name: "Hammam Deneyimi", duration: 90, price: 1500, category: "spa" },
      { name: "Aroma Banyo", duration: 40, price: 900, category: "spa" },
      { name: "Çikolata Mask", duration: 60, price: 1100, category: "cilt" },
      { name: "Rasul (Mineral Çamur)", duration: 45, price: 1000, category: "spa" },
    ],
  },
  {
    label: "SPA Paketleri", icon: "🎁",
    services: [
      { name: "Relax Paketi (Masaj + Bakım)", duration: 120, price: 2200, category: "spa" },
      { name: "Hammam + Masaj Paketi", duration: 120, price: 2000, category: "spa" },
      { name: "Tam Gün SPA (4 saat)", duration: 240, price: 4000, category: "spa" },
    ],
  },
];

const ESTETIK: CatalogCategory[] = [
  {
    label: "İnjeksiyon Tedavileri", icon: "💉",
    services: [
      { name: "Botoks (Alın)", duration: 30, price: 3000, category: "cilt" },
      { name: "Botoks (Tam Yüz)", duration: 45, price: 5000, category: "cilt" },
      { name: "Hyalüronik Dolgu", duration: 30, price: 4000, category: "cilt" },
      { name: "Dudak Dolgusu", duration: 20, price: 3000, category: "cilt" },
      { name: "PRP", duration: 45, price: 2500, category: "cilt" },
      { name: "Mezoterapi", duration: 30, price: 1500, category: "cilt" },
      { name: "Profhilo", duration: 30, price: 5000, category: "cilt" },
      { name: "Exosome Tedavisi", duration: 45, price: 4000, category: "cilt" },
      { name: "Salmon DNA (PDRN)", duration: 30, price: 3500, category: "cilt" },
      { name: "Plazmolift", duration: 30, price: 2800, category: "cilt" },
      { name: "Vitamin Mezoterapi", duration: 30, price: 1800, category: "cilt" },
    ],
  },
  {
    label: "Lazer", icon: "⚡",
    services: [
      { name: "Lazer Epilasyon — Bacak", duration: 30, price: 2000, category: "lazer" },
      { name: "Lazer Epilasyon — Koltukaltı", duration: 15, price: 800, category: "lazer" },
      { name: "Lazer Epilasyon — Bikini", duration: 20, price: 1200, category: "lazer" },
      { name: "Lazer Epilasyon — Yüz", duration: 20, price: 1000, category: "lazer" },
      { name: "Lazer Epilasyon — Kol", duration: 20, price: 1000, category: "lazer" },
      { name: "Lazer Epilasyon — Komple", duration: 60, price: 4500, category: "lazer" },
      { name: "Lazer Cilt Yenileme", duration: 45, price: 2500, category: "lazer" },
      { name: "CO2 Lazer", duration: 45, price: 3000, category: "lazer" },
      { name: "Fraksiyonel Lazer", duration: 45, price: 2800, category: "lazer" },
      { name: "IPL (Yoğun Işık)", duration: 30, price: 1500, category: "lazer" },
      { name: "Q-Switch Lazer (Leke)", duration: 30, price: 2000, category: "lazer" },
    ],
  },
  {
    label: "Cilt Tedavileri", icon: "✨",
    services: [
      { name: "Kimyasal Peeling", duration: 30, price: 1200, category: "cilt" },
      { name: "Mikroneedling", duration: 45, price: 2000, category: "cilt" },
      { name: "Dermapen", duration: 45, price: 2000, category: "cilt" },
      { name: "Karbondioksit Yüzü", duration: 30, price: 800, category: "cilt" },
      { name: "Hydrafacial", duration: 60, price: 2000, category: "cilt" },
      { name: "Plazma Jet", duration: 45, price: 2500, category: "cilt" },
      { name: "BB Glow", duration: 60, price: 1800, category: "cilt" },
      { name: "Collagen Booster Maske", duration: 30, price: 800, category: "cilt" },
    ],
  },
];

const KAS_KIRPIK: CatalogCategory[] = [
  {
    label: "Kaş", icon: "🤨",
    services: [
      { name: "Kaş Alımı (İplik)", duration: 15, price: 100, category: "kas" },
      { name: "Kaş Alımı (Ağda)", duration: 10, price: 80, category: "kas" },
      { name: "Kaş Boyama", duration: 20, price: 150, category: "kas" },
      { name: "Kaş Laminasyon", duration: 60, price: 700, category: "kas" },
      { name: "Kaş Tasarımı", duration: 25, price: 300, category: "kas" },
      { name: "Microblading (Kalıcı)", duration: 120, price: 3500, category: "kas" },
      { name: "Powder Brow (Kalıcı)", duration: 120, price: 3500, category: "kas" },
      { name: "Ombre Brow (Kalıcı)", duration: 120, price: 3800, category: "kas" },
      { name: "Brow Wax (Ağda)", duration: 15, price: 120, category: "kas" },
      { name: "Kaş Dolgusu (İnjeksiyon)", duration: 20, price: 1500, category: "kas" },
      { name: "Kaş + Kirpik Paketi", duration: 80, price: 900, category: "kas" },
    ],
  },
  {
    label: "Kirpik", icon: "👁️",
    services: [
      { name: "Kirpik Boyama", duration: 20, price: 150, category: "kas" },
      { name: "Kirpik Lifting", duration: 60, price: 700, category: "kas" },
      { name: "Kirpik Laminasyon", duration: 45, price: 600, category: "kas" },
      { name: "Kirpik Uzatma (Tek Tek)", duration: 120, price: 1500, category: "kas" },
      { name: "Kirpik Uzatma (Dolgu)", duration: 60, price: 600, category: "kas" },
      { name: "Kirpik Söküm", duration: 20, price: 200, category: "kas" },
      { name: "Russian Volume Kirpik", duration: 150, price: 2000, category: "kas" },
      { name: "Mega Volume Kirpik", duration: 180, price: 2500, category: "kas" },
      { name: "Hybrid Kirpik", duration: 120, price: 1800, category: "kas" },
      { name: "Wispy Kirpik", duration: 120, price: 1800, category: "kas" },
      { name: "Kirpik Permi", duration: 60, price: 700, category: "kas" },
      { name: "Kirpik Tonu (Boyama)", duration: 20, price: 180, category: "kas" },
    ],
  },
];

const MAKYAJ: CatalogCategory[] = [
  {
    label: "Makyaj Hizmetleri", icon: "💄",
    services: [
      { name: "Günlük Makyaj", duration: 45, price: 600, category: "genel" },
      { name: "Doğal Makyaj", duration: 40, price: 550, category: "genel" },
      { name: "Işıltılı / Glow Makyaj", duration: 50, price: 700, category: "genel" },
      { name: "Gece Makyajı", duration: 60, price: 800, category: "genel" },
      { name: "Dramatik / Smoky Makyaj", duration: 60, price: 900, category: "genel" },
      { name: "Gelin Makyajı", duration: 90, price: 2500, category: "genel" },
      { name: "Nişan / Kına Makyajı", duration: 75, price: 1500, category: "genel" },
      { name: "Fotoğraf & Video Makyajı", duration: 60, price: 1000, category: "genel" },
      { name: "Sahne Makyajı", duration: 60, price: 1000, category: "genel" },
      { name: "Airbrush Makyaj", duration: 60, price: 1200, category: "genel" },
      { name: "Kontur Makyaj", duration: 55, price: 850, category: "genel" },
      { name: "Retro / Vintage Makyaj", duration: 60, price: 900, category: "genel" },
      { name: "Damat / Erkek Makyajı", duration: 30, price: 500, category: "genel" },
    ],
  },
  {
    label: "Kalıcı Makyaj", icon: "✍️",
    services: [
      { name: "Microblading (Kaş)", duration: 120, price: 3500, category: "genel" },
      { name: "Kalıcı Kaş (Powder Brow)", duration: 120, price: 3500, category: "genel" },
      { name: "Kalıcı Dudak Makyajı", duration: 120, price: 3000, category: "genel" },
      { name: "Ombre Dudak (Kalıcı)", duration: 120, price: 3500, category: "genel" },
      { name: "Kalıcı Eyeliner (Üst)", duration: 90, price: 2500, category: "genel" },
      { name: "Kalıcı Eyeliner (Alt + Üst)", duration: 120, price: 3500, category: "genel" },
      { name: "Medikal Kamuflaj Makyajı", duration: 90, price: 2000, category: "genel" },
    ],
  },
  {
    label: "Makyaj Eğitimi", icon: "🎓",
    services: [
      { name: "Bireysel Makyaj Dersi (1 Saat)", duration: 60, price: 800, category: "genel" },
      { name: "Temel Makyaj Kursu (4 Saat)", duration: 240, price: 2500, category: "genel" },
    ],
  },
];

const DIYETISYEN: CatalogCategory[] = [
  {
    label: "Danışmanlık", icon: "🥗",
    services: [
      { name: "İlk Görüşme & Analiz", duration: 60, price: 800, category: "genel" },
      { name: "Takip Seansı", duration: 30, price: 400, category: "genel" },
      { name: "Online Danışmanlık", duration: 30, price: 300, category: "genel" },
      { name: "Diyet Programı Oluşturma", duration: 45, price: 600, category: "genel" },
      { name: "Spor + Diyet Programı", duration: 60, price: 900, category: "genel" },
      { name: "Beden Analizi (Biyoimpedans)", duration: 20, price: 250, category: "genel" },
      { name: "Beslenme Eğitimi", duration: 45, price: 550, category: "genel" },
      { name: "Çocuk Beslenmesi Danışmanlığı", duration: 45, price: 600, category: "genel" },
      { name: "Sporcu Beslenmesi", duration: 45, price: 700, category: "genel" },
      { name: "Vejetaryen / Vegan Beslenme", duration: 45, price: 600, category: "genel" },
      { name: "Gebelik Beslenmesi", duration: 45, price: 700, category: "genel" },
      { name: "Sağlıklı Yaşam Paketi (Aylık)", duration: 60, price: 1500, category: "genel" },
    ],
  },
];

const TATTOO: CatalogCategory[] = [
  {
    label: "Dövme", icon: "🖋️",
    services: [
      { name: "Küçük Dövme (< 5 cm)", duration: 60, price: 1000, category: "genel" },
      { name: "Orta Dövme (5–15 cm)", duration: 120, price: 2500, category: "genel" },
      { name: "Büyük Dövme (> 15 cm)", duration: 240, price: 5000, category: "genel" },
      { name: "Renkli Dövme", duration: 150, price: 3500, category: "genel" },
      { name: "El Poke Dövme", duration: 90, price: 1500, category: "genel" },
      { name: "Tribal Dövme", duration: 120, price: 2000, category: "genel" },
      { name: "Akuarel (Suluboya) Dövme", duration: 150, price: 3000, category: "genel" },
      { name: "Geometrik Dövme", duration: 120, price: 2500, category: "genel" },
      { name: "Script / Yazı Dövme", duration: 60, price: 1200, category: "genel" },
      { name: "Fineline (İnce Çizgi) Dövme", duration: 90, price: 1800, category: "genel" },
      { name: "Cover-Up Dövme", duration: 180, price: 4000, category: "genel" },
      { name: "Touch-Up (Dokunuş)", duration: 45, price: 500, category: "genel" },
    ],
  },
  {
    label: "Lazer Dövme Silme", icon: "⚡",
    services: [
      { name: "Lazer Dövme Silme (1 Seans)", duration: 30, price: 1500, category: "lazer" },
      { name: "Lazer Dövme Soldurma", duration: 20, price: 800, category: "lazer" },
    ],
  },
  {
    label: "Piercing", icon: "💍",
    services: [
      { name: "Kulak Piercing", duration: 15, price: 300, category: "genel" },
      { name: "Helix Piercing", duration: 15, price: 350, category: "genel" },
      { name: "Tragus Piercing", duration: 15, price: 350, category: "genel" },
      { name: "Burun Piercing", duration: 15, price: 350, category: "genel" },
      { name: "Septum Piercing", duration: 15, price: 400, category: "genel" },
      { name: "Göbek Piercing", duration: 15, price: 400, category: "genel" },
      { name: "Dil Piercing", duration: 15, price: 450, category: "genel" },
      { name: "Kaş Piercing", duration: 15, price: 380, category: "genel" },
      { name: "Dudak / Labret Piercing", duration: 15, price: 380, category: "genel" },
    ],
  },
];

export const SERVICE_CATALOG: Record<string, CatalogCategory[]> = {
  kuafor: KUAFOR,
  berber: BERBER,
  nail: NAIL,
  guzellik: GUZELLIK,
  spa: SPA,
  estetik: ESTETIK,
  kas_kirpik: KAS_KIRPIK,
  makyaj: MAKYAJ,
  diyetisyen: DIYETISYEN,
  tattoo: TATTOO,
};

/**
 * Katalogun verilen dildeki hâli. Kategori etiketleri ve hizmet adları çevrilir;
 * `category` (sac/cilt/tirnak…) etiketi, süre ve fiyat değişmez — bunlar dilden
 * bağımsız veri alanlarıdır ve randevu akışının bağlı olduğu kısımdır.
 *
 * Türkçe için ekstra bir kopya üretilmez (referans aynen döner), böylece mevcut
 * davranış birebir korunur.
 */
export function getCatalog(businessType: string, locale: CatalogLocale = "tr"): CatalogCategory[] {
  const catalog = SERVICE_CATALOG[businessType] || SERVICE_CATALOG["kuafor"];
  if (locale === "tr") return catalog;
  return catalog.map((cat) => ({
    ...cat,
    label: translateCatalogCategory(cat.label, locale),
    services: cat.services.map((svc) => ({ ...svc, name: translateCatalogService(svc.name, locale) })),
  }));
}

/**
 * Katalogda arama. Kullanıcı hangi dilde görüyorsa o dildeki adlar üzerinden arar;
 * ayrıca Türkçe orijinal ad da taranır — böylece Türkçe hizmet adını bilen bir
 * kullanıcı İngilizce arayüzde de sonucu bulabilir.
 */
export function searchCatalog(
  businessType: string,
  query: string,
  locale: CatalogLocale = "tr"
): CatalogService[] {
  const catalog = SERVICE_CATALOG[businessType] || [];
  const q = query.toLocaleLowerCase("tr").trim();
  if (!q) return [];
  const results: CatalogService[] = [];
  for (const cat of catalog) {
    for (const svc of cat.services) {
      const localized = translateCatalogService(svc.name, locale);
      const matches =
        localized.toLocaleLowerCase("tr").includes(q) || svc.name.toLocaleLowerCase("tr").includes(q);
      if (matches) results.push(locale === "tr" ? svc : { ...svc, name: localized });
    }
  }
  return results;
}
