import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTACT_LINE = "📧 destek@siriplan.com veya 💬 WhatsApp: +90 535 503 26 34 üzerinden bize ulaşabilirsiniz.";

/**
 * Panel içi yardım asistanının bilgi tabanı — tamamen statik (LLM/API anahtarı gerekmez).
 * docs/kullanim-kilavuzu.md ile senkron tutulmalı. Yeni bir soru kalıbı eklerken en
 * spesifik (dar kapsamlı) girdileri listenin başına, genel girdileri sonuna koyun —
 * ilk eşleşen kural kazanır.
 */
const KNOWLEDGE_BASE: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["bekliyor", "onaylandı", "onayla", "tamamlandı", "gelmedi", "no-show", "noshow", "randevu durum", "durum ne"],
    answer:
      "Randevu durumu butonları:\n" +
      "• Bekliyor — online'dan talep edildi veya yeni oluşturuldu, henüz onaylanmadı.\n" +
      "• Onayla / Onaylandı — randevu kesinleşti, takvime düştü.\n" +
      "• Tamamlandı — hizmet verildi; bu adımda ödeme yöntemi/bahşiş girilir ve Gelir-Gider'e otomatik işlenir.\n" +
      "• Gelmedi — müşteri randevusuna gelmedi (no-show), müşteri skorunu düşürür.\n" +
      "• İptal Et — randevu iptal edilir, ayarlarınıza göre müşteriye otomatik iptal bildirimi gider.\n" +
      "Durumu, randevu detay sayfasındaki veya liste görünümündeki hızlı işlem butonlarından değiştirebilirsiniz.",
  },
  {
    keywords: ["aktif", "inaktif", "pasif", "pasife al", "devre dışı"],
    answer:
      "Personel sayfasında bir çalışanı, detay sayfasındaki \"Tehlikeli Alan\" bölümünden \"Pasife Al\" ile devre dışı bırakabilirsiniz — pasif personel yeni randevulara atanamaz, geçmiş randevuları etkilenmez. " +
      "Hizmetlerde ise \"Online randevu sayfasında göster\" seçeneğini kapatarak o hizmeti müşterilerden (online randevu sayfasından) gizleyebilirsiniz; panelden elle randevu oluştururken yine seçilebilir kalır.",
  },
  {
    keywords: ["widget", "kişiselleştir", "ana sayfa düzen", "kutu ekle", "kutucuk"],
    answer:
      "Ana Sayfa'da sağ üstteki \"Kişiselleştir\" butonuna basın: kutucukları sürükleyerek sıralayın, göz ikonuyla gösterin/gizleyin, bitince \"Kaydet\"e basın. " +
      "Kullanılabilir widget'lar: Aktif Randevular, Günlük Takvim, WhatsApp Asistanı, Kampanya & Performans, Yeni Müşteriler, Raporlar, Gelir & Gider, Hızlı İşlemler, Personel, Hizmetler. Tercihleriniz size özel kaydedilir.",
  },
  {
    keywords: ["konum ekle", "konum linki", "harita", "google maps", "adres linki", "konumumu kullan"],
    answer:
      "Ayarlar → Salon Bilgileri → \"Konum (Google Maps Linki)\" alanına ekleyebilirsiniz. İki yol var:\n" +
      "1. \"Konumumu Kullan\" butonuna basıp tarayıcı konum izni verin — link otomatik doldurulur.\n" +
      "2. Google Maps'te işletmenizi bulup \"Paylaş\" ile linki kopyalayıp buraya yapıştırın.\n" +
      "Bu link, otomatik WhatsApp bildirim mesajlarındaki {konum} değişkeninde kullanılır; boş bırakırsanız adresinizden otomatik bir harita linki üretilir.",
  },
  {
    keywords: ["telegram"],
    answer:
      "Ayarlar → Sosyal Medya & Entegrasyonlar → \"Telegram Bildirimleri (Chat ID)\" alanına Chat ID'nizi girin. " +
      "Chat ID'yi bulmak için: Telegram'da salonunuzun bildirim botunu bulup \"Başlat / Start\"a basın, bot size bir Chat ID numarası gönderecek. " +
      "O numarayı Ayarlar'a yapıştırıp kaydedince, yeni bir randevu oluştuğunda (online veya elle) anında Telegram bildirimi alırsınız.",
  },
  {
    keywords: ["yetki", "yetkilendirme", "manager", "yönetici erişim", "personel rolü", "rol değiştir"],
    answer:
      "İki katmanlı yetki sistemi var:\n" +
      "1. Ayarlar → Personel Yetkileri: tüm personel için genel kurallar (örn. müşteri telefon numaralarını görebilme).\n" +
      "2. Her personelin kendi detay sayfasında Rol (Personel — temel erişim / Yönetici — genişletilmiş erişim) ve tekil izinler: müşterileri görme/düzenleme, raporları görme, hizmetleri düzenleme, personeli yönetme, gelir/gideri görme, kampanyaları yönetme, randevu oluşturma/düzenleme/iptal etme.\n" +
      "Rol değiştirmek varsayılan izinleri sıfırlar, altta ince ayar yapabilirsiniz.",
  },
  {
    keywords: ["şablon", "mesaj metni", "hazır mesaj", "sıcak", "kısa mesaj", "resmi mesaj", "hizmet detaylı"],
    answer:
      "Ayarlar → Otomatik Randevu Mesajı bölümünden 4 hazır şablondan (Sıcak, Kısa, Resmi, Hizmet Detaylı) birini seçebilir veya kendi metninizi yazabilirsiniz. " +
      "Değişkenler otomatik doldurulur: {musteri} {salon} {tarih} {saat} {hizmet} {personel} {konum}. " +
      "Hatırlatma ve iptal mesajlarına Ayarlar → WhatsApp Bildirim Ayarları'ndan ayrı birer özel not da ekleyebilirsiniz.",
  },
  {
    keywords: ["whatsapp", "bildirim", "sms", "e-posta bildirim", "mail bildirim"],
    answer:
      "Ayarlar → Bildirimler'den WhatsApp (randevu oluşturulunca/revize edilince/iptal edilince ayrı ayrı açılıp kapatılır), SMS (Netgsm/VatanSMS/İletimerkezi sağlayıcılarından biriyle), e-posta ve Telegram kanallarını yönetebilirsiniz. " +
      "Hatırlatma mesajının randevudan kaç saat önce gideceğini de aynı sayfadan seçersiniz.",
  },
  {
    keywords: ["ödeme", "abonelik", "plan seç", "starter", "pro plan", "business plan", "fiyat", "kredi kartı", "deneme süresi"],
    answer:
      "14 gün ücretsiz deneme ile başlarsınız, kredi kartı gerekmez. Planlar:\n" +
      "• Starter — 1 şube/3 personel, 300 randevu/ay, online randevu sayfası, WhatsApp hatırlatma, sadakat kartı, temel ciro raporu, CSV export.\n" +
      "• Pro — sınırsız personel & randevu, AI WhatsApp/Instagram asistanı, kampanya modülü, müşteri skoru, Haftanın Elemanı, Google Calendar senkronizasyonu, bekleme listesi, PDF export, KDV hesaplama.\n" +
      "• Business — sınırsız şube & personel, tüm Pro özellikleri, white-label, API erişimi, öncelikli destek, özel entegrasyonlar, özel hesap yöneticisi.\n" +
      "Deneme süresi dolmadan Ayarlar → Abonelik'ten plan seçip ödeme yapabilirsiniz.",
  },
  {
    keywords: ["randevu"],
    answer:
      "Randevular sayfasından yeni randevu oluşturabilir, Takvim sayfasından 15 dakikalık dilimlerle görsel olarak planlayabilirsiniz. Oluşturma/düzenleme/iptalde müşteriye otomatik bildirim gider (Ayarlar → Bildirimler'e bağlı).",
  },
  {
    keywords: ["personel", "davet", "çalışan ekle"],
    answer:
      "Personel sayfasından yeni personel davet edebilirsiniz (e-posta veya WhatsApp/telefon ile). Rol bazlı varsayılan yetkiler + kişiye özel istisnalarla erişimi sınırlandırabilirsiniz. Çalışma günleri, takvim rengi ve bildirim dili de personel detayından ayarlanır.",
  },
  {
    keywords: ["müşteri"],
    answer:
      "Müşteriler sayfasında tüm müşterileriniz ve geçmiş randevu sayıları listelenir. Yeni Müşteri ekranından manuel ekleyebilir, detay sayfasından geçmiş randevu ve notları görebilirsiniz.",
  },
  {
    keywords: ["hizmet"],
    answer:
      "Hizmetler sayfasından kategori, süre ve fiyat tanımlayarak hizmet kataloğunuzu oluşturursunuz. Süre, takvimdeki randevu slotunun uzunluğunu belirler.",
  },
  {
    keywords: ["kampanya"],
    answer:
      "Kampanyalar sayfasından toplu WhatsApp mesajı gönderebilirsiniz. Kampanyalar Taslak → Planlandı → Gönderiliyor → Gönderildi sırasıyla ilerler; hata olursa Başarısız olarak işaretlenir.",
  },
  {
    keywords: ["rapor", "ciro"],
    answer:
      "Raporlar sayfasında günlük randevu sayısı, ciro, gider ve yeni müşteri sayısını; ayrıca personel ve hizmet bazlı kırılımları görürsünüz.",
  },
  {
    keywords: ["gider", "gelir", "kasa"],
    answer:
      "Gelir-Gider sayfasından randevu gelirlerinin yanı sıra kira, malzeme, fatura gibi manuel kalemleri işleyerek kasa durumunuzu takip edebilirsiniz.",
  },
  {
    keywords: ["excel", "csv", "içe aktar", "dışa aktar", "veri göçü", "import", "export"],
    answer:
      "Veri Göçü sayfasından mevcut Excel/CSV verilerinizi içe aktarabilir; verilerinizi CSV, JSON veya PDF olarak dışa aktarabilirsiniz.",
  },
  {
    keywords: ["dil", "language"],
    answer:
      "Panel Türkçe, İngilizce, Rusça ve Arapça dillerini destekler. Bildirimlerin hangi dilde gideceğini her personel için Personel sayfasından ayrıca ayarlayabilirsiniz; online randevu sayfası da müşterinin daha önce seçtiği dili hatırlar.",
  },
];

function getStaticResponse(message: string): string {
  const msg = message.toLowerCase();

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((k) => msg.includes(k))) {
      return entry.answer;
    }
  }

  // Bilgi tabanında karşılığı olmayan (çok özel/hesaba özel) sorular için:
  // panel kullanımı hakkında genel bilgi veremediğimiz için destek ekibine yönlendir.
  return `Bu konuda elimde hazır bir bilgi yok. Daha detaylı yardım için ${CONTACT_LINE}`;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
    }

    return NextResponse.json({ response: getStaticResponse(message) });
  } catch {
    return NextResponse.json({
      response: `Şu an yanıt veremiyorum. Lütfen ${CONTACT_LINE}`,
    });
  }
}
