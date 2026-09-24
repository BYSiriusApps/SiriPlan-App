export type ReelShot = {
  /** public/videos/<reelId>/<media> altında beklenen dosya adı. Boşsa Outro sahnesi kullanılır. */
  media?: string;
  /** Kaç saniye sürsün (doc'taki zaman aralığından). */
  durationSec: number;
  /** Ne çekileceğinin Türkçe açıklaması (footage yoksa placeholder olarak gösterilir). */
  visual: string;
  /** Ekranda görünecek metin. */
  caption: string;
  /** İlk sahne (hook) daha büyük/üstte gösterilir. */
  isHook?: boolean;
  /** Outro: logo + CTA, footage gerekmez. */
  isOutro?: boolean;
};

export type ReelDef = {
  id: string;
  order: number;
  title: string;
  caption: string;
  shots: ReelShot[];
};

const CTA_STRONG = "14 gün ücretsiz → siriplan.com";
const CTA_SOFT = "14 gün ücretsiz dene";

export const reels: ReelDef[] = [
  {
    id: "reel-1-deftere-mi-calisiyorsun",
    order: 2,
    title: "Deftere mi çalışıyorsun?",
    caption:
      "Sen de deftere mi çalışıyorsun, yoksa geçtin mi? Yorumda söyle 👇 #kuaför #güzellikmerkezi #salonyönetimi #siriplan",
    shots: [
      {
        media: "1-defter.mp4",
        durationSec: 2,
        visual: "Kağıt ajanda/defter görüntüsü (gerçek çekim)",
        caption: "Hâlâ deftere mi çalışıyorsun?",
        isHook: true,
      },
      {
        media: "2-karalama.mp4",
        durationSec: 4,
        visual: "Defterde karalama, üstü çizili randevu",
        caption: "Çakışan randevu, silinen isim, unutulan müşteri...",
      },
      {
        media: "3-panel-takvim.mp4",
        durationSec: 13,
        visual: "Panel ekran kaydı: takvim görünümü, randevu ekleme (gerçek kayıt)",
        caption: "SiriPlan'da hepsi tek ekranda, otomatik",
      },
      {
        media: "4-panel-raporlar.mp4",
        durationSec: 6,
        visual: "Panelde raporlar/ciro ekranı",
        caption: "Randevu, müşteri, ciro — hepsi burada",
      },
      { durationSec: 2, visual: "Logo + CTA", caption: CTA_STRONG, isOutro: true },
    ],
  },
  {
    id: "reel-2-sen-uyurken-ajanda-dolar",
    order: 4,
    title: "Sen uyurken bile ajanda dolar",
    caption:
      "Telefon çalmadan randevu alınır mı? Alınır. #randevusistemi #kuaföryazılımı #salonsahipleri #siriplan",
    shots: [
      {
        media: "1-saat-0300.mp4",
        durationSec: 2,
        visual: "Saat 03:00 gösteren telefon ekranı, karanlık oda",
        caption: "Saat 03:00, sen uyuyorsun",
        isHook: true,
      },
      {
        media: "2-musteri-randevu-alma.mp4",
        durationSec: 6,
        visual: "Müşteri telefonundan randevu linkine girip saat seçmesi (ekran kaydı)",
        caption: "Müşterin randevusunu kendisi alıyor",
      },
      {
        media: "3-panel-bildirim.mp4",
        durationSec: 6,
        visual: "Panelde sabah bildirim/yeni randevu düşmesi",
        caption: "Sen uyanınca ajandan zaten dolu",
      },
      {
        media: "4-link-paylasma.mp4",
        durationSec: 5,
        visual: "Panelden link paylaşma (WhatsApp/Instagram bio)",
        caption: "Kendi randevu linkin: siriplan.com/r/salonun",
      },
      { durationSec: 2, visual: "Logo + CTA", caption: CTA_SOFT, isOutro: true },
    ],
  },
  {
    id: "reel-3-randevuyu-konusarak-olustur",
    order: 1,
    title: "Randevuyu konuşarak oluştur (sesli asistan)",
    caption:
      "Bunu görünce inanamayacaksın 🎙️ Randevuyu konuşarak oluşturuyoruz. #yapayzeka #kuaför #teknoloji #siriplan",
    shots: [
      {
        media: "1-mikrofon-basili.mp4",
        durationSec: 2,
        visual: "Elde telefon, mikrofon butonuna basılı tutma",
        caption: "Randevu almak için yazmana bile gerek yok",
        isHook: true,
      },
      {
        media: "2-konusma-altyazi.mp4",
        durationSec: 2,
        visual:
          "Konuşma: \"Ayşe hanım yarın saat üçe manikür\" (gerçek ses, altyazı ekle)",
        caption: "\"Ayşe hanım yarın saat üçe manikür\"",
      },
      {
        media: "3-panel-otomatik-doldurma.mp4",
        durationSec: 6,
        visual: "Panelin otomatik doldurduğu form ekranı",
        caption: "Panel duyduğunu otomatik dolduruyor",
      },
      {
        media: "4-onay-ekrani.mp4",
        durationSec: 4,
        visual: "Onay ekranı, randevu takvime düşüyor",
        caption: "Tek dokunuşla onaylanıyor",
      },
      {
        media: "5-sasirmis-yuz.mp4",
        durationSec: 4,
        visual: "Şaşırmış/etkilenmiş yüz ifadesi (opsiyonel)",
        caption: "Sesli randevu — SiriPlan'a özel",
      },
      { durationSec: 2, visual: "Logo + CTA", caption: CTA_STRONG, isOutro: true },
    ],
  },
  {
    id: "reel-4-kacan-randevuya-son",
    order: 3,
    title: "Kaçan randevuya son (hatırlatma otomasyonu)",
    caption: "Müşterin unutuyor, SiriPlan hatırlatıyor. #noshow #randevuhatırlatma #whatsappotomasyon #siriplan",
    shots: [
      {
        media: "1-bos-koltuk.mp4",
        durationSec: 2,
        visual: "Boş koltuk / kapalı salon görüntüsü",
        caption: "%18 randevu hiç gelmiyor",
        isHook: true,
      },
      {
        media: "2-whatsapp-hatirlatma.mp4",
        durationSec: 4,
        visual: "Müşteri telefonuna gelen WhatsApp hatırlatma mesajı ekran görüntüsü",
        caption: "Sebep basit: unutuyorlar",
      },
      {
        media: "3-panel-hatirlatma-ayarlari.mp4",
        durationSec: 7,
        visual: "Panelde hatırlatma ayarları ekranı (1 gün önce / 2 saat önce)",
        caption: "SiriPlan otomatik hatırlatıyor, sen hiçbir şey yapmadan",
      },
      {
        media: "4-dolu-takvim.mp4",
        durationSec: 4,
        visual: "Dolu takvim görüntüsü",
        caption: "Boş koltuk kalmıyor",
      },
      { durationSec: 2, visual: "Logo + CTA", caption: CTA_SOFT, isOutro: true },
    ],
  },
  {
    id: "reel-5-personel-primi",
    order: 6,
    title: "Personel primi ve maaş tek ekranda",
    caption: "Ay sonu prim hesabına elveda. #salonyönetimi #kuaförişletmesi #siriplan #işletmeyönetimi",
    shots: [
      {
        media: "1-hesap-makinesi.mp4",
        durationSec: 2,
        visual: "Hesap makinesi + kağıtlarla uğraşan eller",
        caption: "Ay sonu prim hesabı kabusu",
        isHook: true,
      },
      {
        media: "2-panel-personel-ciro.mp4",
        durationSec: 6,
        visual: "Panelde personel bazlı ciro/prim ekranı",
        caption: "SiriPlan her personelin cirosunu otomatik hesaplıyor",
      },
      {
        media: "3-rapor-export.mp4",
        durationSec: 6,
        visual: "Maaş/prim raporu ekranı, tek tuşla export",
        caption: "Tek tıkla rapor, tartışma yok",
      },
      {
        media: "4-el-sikisma.mp4",
        durationSec: 4,
        visual: "Mutlu personel/patron el sıkışma (opsiyonel sahne)",
        caption: "Şeffaf, adil, hızlı",
      },
      { durationSec: 2, visual: "Logo + CTA", caption: CTA_STRONG, isOutro: true },
    ],
  },
  {
    id: "reel-6-salonun-cepte",
    order: 5,
    title: "Salonun artık cepte (mobil uygulama)",
    caption: "Salonun cebinde. #mobiluygulama #salonyönetimi #kuaför #siriplan",
    shots: [
      {
        media: "1-telefon-disarida.mp4",
        durationSec: 2,
        visual: "Elinde telefon, salon dışında/arabada",
        caption: "Salonda değilsin ama salon elinde",
        isHook: true,
      },
      {
        media: "2-hizli-panel-gecisleri.mp4",
        durationSec: 8,
        visual:
          "Hızlı ekran kaydı: bildirim → randevu onaylama → müşteri detayına bakma (hızlı kesim)",
        caption: "Her şeyi telefonundan yönet",
      },
      {
        media: "3-stok-kasa.mp4",
        durationSec: 6,
        visual: "Stok/kasa ekranı hızlı geçiş",
        caption: "Stok, kasa, randevu — hepsi cepte",
      },
      { durationSec: 4, visual: "Logo + CTA", caption: CTA_SOFT, isOutro: true },
    ],
  },
];

export const getReelById = (id: string) => {
  const reel = reels.find((r) => r.id === id);
  if (!reel) {
    throw new Error(`Reel not found: ${id}`);
  }
  return reel;
};

export const reelDurationInFrames = (reel: ReelDef, fps: number) =>
  Math.round(reel.shots.reduce((sum, shot) => sum + shot.durationSec, 0) * fps);
