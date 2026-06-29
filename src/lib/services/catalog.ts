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
    ],
  },
  {
    label: "Bakım & Şekil", icon: "💆",
    services: [
      { name: "Keratin Bakım", duration: 120, price: 2000, category: "sac" },
      { name: "Saç Botoksu", duration: 90, price: 1500, category: "sac" },
      { name: "Derin Nem Maskesi", duration: 30, price: 400, category: "sac" },
      { name: "Fön", duration: 30, price: 200, category: "sac" },
      { name: "Maşa / Bigudi", duration: 45, price: 350, category: "sac" },
      { name: "Düzleştirme (Ütü)", duration: 40, price: 300, category: "sac" },
      { name: "Kalıcı Ondüle / Perma", duration: 120, price: 1000, category: "sac" },
    ],
  },
  {
    label: "Saç Uzatma", icon: "👑",
    services: [
      { name: "Kaynak Saç Takma", duration: 180, price: 3000, category: "sac" },
      { name: "Bant Saç Uzatma", duration: 120, price: 2500, category: "sac" },
      { name: "Nano Ring Saç", duration: 150, price: 3500, category: "sac" },
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
    ],
  },
  {
    label: "Cilt & Bakım", icon: "💆",
    services: [
      { name: "Yüz Maskesi", duration: 20, price: 200, category: "cilt" },
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
    ],
  },
  {
    label: "Pedikür", icon: "🦶",
    services: [
      { name: "Klasik Pedikür", duration: 40, price: 350, category: "tirnak" },
      { name: "Kalıcı Oje Pedikür", duration: 55, price: 550, category: "tirnak" },
      { name: "SPA Pedikür", duration: 60, price: 700, category: "tirnak" },
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
    ],
  },
  {
    label: "Nail Art", icon: "🎨",
    services: [
      { name: "Nail Art (Basit)", duration: 30, price: 300, category: "tirnak" },
      { name: "Nail Art (Detaylı)", duration: 60, price: 600, category: "tirnak" },
      { name: "Chrome Toz", duration: 20, price: 200, category: "tirnak" },
      { name: "Glitter Süsleme", duration: 20, price: 200, category: "tirnak" },
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
    ],
  },
  {
    label: "Epilasyon", icon: "🌸",
    services: [
      { name: "Ağda — Bacak Tamamı", duration: 45, price: 600, category: "lazer" },
      { name: "Ağda — Koltuk Altı", duration: 15, price: 200, category: "lazer" },
      { name: "Ağda — Bikini", duration: 20, price: 300, category: "lazer" },
      { name: "Ağda — Dudak Üstü", duration: 10, price: 100, category: "lazer" },
      { name: "İplik — Yüz Tamamı", duration: 20, price: 250, category: "lazer" },
      { name: "İplik — Kaş", duration: 10, price: 100, category: "kas" },
    ],
  },
  {
    label: "Kaş & Kirpik", icon: "👁️",
    services: [
      { name: "Kaş Alımı", duration: 15, price: 150, category: "kas" },
      { name: "Kaş Laminasyon", duration: 60, price: 800, category: "kas" },
      { name: "Kaş Boyama", duration: 20, price: 200, category: "kas" },
      { name: "Kirpik Lifting", duration: 60, price: 700, category: "kas" },
      { name: "Kirpik Laminasyon", duration: 45, price: 600, category: "kas" },
      { name: "Kirpik Boyama", duration: 20, price: 200, category: "kas" },
      { name: "Kirpik Uzatma (Tek Tek)", duration: 120, price: 1500, category: "kas" },
    ],
  },
  {
    label: "Makyaj", icon: "💄",
    services: [
      { name: "Günlük Makyaj", duration: 45, price: 600, category: "genel" },
      { name: "Gelin Makyajı", duration: 90, price: 2500, category: "genel" },
      { name: "Gece Makyajı", duration: 60, price: 800, category: "genel" },
      { name: "Fotoğraf Makyajı", duration: 60, price: 1000, category: "genel" },
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
      { name: "Sıcak Taş Masajı", duration: 75, price: 1800, category: "spa" },
      { name: "Thai Masajı", duration: 90, price: 1500, category: "spa" },
      { name: "Refleksoloji", duration: 45, price: 800, category: "spa" },
      { name: "Kafa & Boyun Masajı", duration: 30, price: 600, category: "spa" },
    ],
  },
  {
    label: "Vücut Bakımı", icon: "🛁",
    services: [
      { name: "Kese & Köpük", duration: 45, price: 700, category: "spa" },
      { name: "Vücut Peeling", duration: 45, price: 800, category: "cilt" },
      { name: "Detoks Çamur Maskesi", duration: 60, price: 1200, category: "cilt" },
      { name: "Hammam Deneyimi", duration: 90, price: 1500, category: "spa" },
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
    ],
  },
  {
    label: "Lazer", icon: "⚡",
    services: [
      { name: "Lazer Epilasyon — Bacak", duration: 30, price: 2000, category: "lazer" },
      { name: "Lazer Epilasyon — Koltukaltı", duration: 15, price: 800, category: "lazer" },
      { name: "Lazer Epilasyon — Bikini", duration: 20, price: 1200, category: "lazer" },
      { name: "Lazer Epilasyon — Yüz", duration: 20, price: 1000, category: "lazer" },
      { name: "Lazer Cilt Yenileme", duration: 45, price: 2500, category: "lazer" },
      { name: "Leke Tedavisi (Lazer)", duration: 30, price: 2000, category: "lazer" },
    ],
  },
  {
    label: "Cilt Bakımı", icon: "✨",
    services: [
      { name: "Kimyasal Peeling", duration: 30, price: 1200, category: "cilt" },
      { name: "Mikroneedling", duration: 45, price: 2000, category: "cilt" },
      { name: "Karbondioksit Yüzü", duration: 30, price: 800, category: "cilt" },
      { name: "Hydrafacial", duration: 60, price: 2000, category: "cilt" },
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
      { name: "Kaş Tasarımı (Kalıcı Makyaj)", duration: 120, price: 3000, category: "kas" },
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
    ],
  },
];

const MAKYAJ: CatalogCategory[] = [
  {
    label: "Makyaj Hizmetleri", icon: "💄",
    services: [
      { name: "Günlük Makyaj", duration: 45, price: 600, category: "genel" },
      { name: "Gece Makyajı", duration: 60, price: 800, category: "genel" },
      { name: "Gelin Makyajı", duration: 90, price: 2500, category: "genel" },
      { name: "Nişan / Kına Makyajı", duration: 75, price: 1500, category: "genel" },
      { name: "Fotoğraf & Video Makyajı", duration: 60, price: 1000, category: "genel" },
      { name: "Sahne Makyajı", duration: 60, price: 1000, category: "genel" },
    ],
  },
  {
    label: "Kalıcı Makyaj", icon: "✍️",
    services: [
      { name: "Kalıcı Dudak Makyajı", duration: 120, price: 3000, category: "genel" },
      { name: "Kalıcı Eyeliner", duration: 90, price: 2500, category: "genel" },
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
    ],
  },
];

const TATTOO: CatalogCategory[] = [
  {
    label: "Dövme", icon: "🖋️",
    services: [
      { name: "Küçük Dövme (< 5 cm)", duration: 60, price: 1000, category: "genel" },
      { name: "Orta Dövme (5-15 cm)", duration: 120, price: 2500, category: "genel" },
      { name: "Büyük Dövme (> 15 cm)", duration: 240, price: 5000, category: "genel" },
      { name: "Renkli Dövme", duration: 150, price: 3500, category: "genel" },
    ],
  },
  {
    label: "Piercing", icon: "💍",
    services: [
      { name: "Kulak Piercing", duration: 15, price: 300, category: "genel" },
      { name: "Burun Piercing", duration: 15, price: 350, category: "genel" },
      { name: "Göbek Piercing", duration: 15, price: 400, category: "genel" },
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

export function searchCatalog(businessType: string, query: string): CatalogService[] {
  const catalog = SERVICE_CATALOG[businessType] || [];
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: CatalogService[] = [];
  for (const cat of catalog) {
    for (const svc of cat.services) {
      if (svc.name.toLowerCase().includes(q)) results.push(svc);
    }
  }
  return results;
}
