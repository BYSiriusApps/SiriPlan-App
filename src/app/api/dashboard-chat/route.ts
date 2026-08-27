import { NextRequest, NextResponse } from "next/server";
import { limitByIp } from "@/lib/rate-limit";
import { isMobileApp } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTACT_LINE = "📧 info@bysirius.com veya 💬 WhatsApp: +90 535 503 26 34 üzerinden bize ulaşabilirsiniz.";

/**
 * Panel içi yardım asistanının bilgi tabanı — tamamen statik (LLM/API anahtarı gerekmez).
 * docs/kullanim-kilavuzu.md ile senkron tutulmalı. Yeni bir soru kalıbı eklerken en
 * spesifik (dar kapsamlı) girdileri listenin başına, genel girdileri sonuna koyun —
 * ilk eşleşen kural kazanır (bkz. örn. "izin günü" girdisi "personel" girdisinden önce
 * durmalı, yoksa bare "personel" alt-string eşleşmesi onu ele geçirir).
 */
/**
 * `nativeAnswer`: native mobil uygulama (App Store / Play Store) içinden
 * sorulduğunda `answer` yerine dönen metin. App Store İnceleme Kılavuzu
 * 3.1.1 uygulama içinde fiyat listesi ve uygulama dışı ödeme yönlendirmesi
 * yasaklar — yardım asistanı panelin her sayfasında açık olduğu için
 * inceleme sırasında ulaşılabilecek en kolay fiyat/ödeme metnidir.
 */
const KNOWLEDGE_BASE: { keywords: string[]; answer: string; nativeAnswer?: string }[] = [
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
      "Kullanılabilir widget'lar: Aktif Randevular, Günlük Takvim, WhatsApp Asistanı, Kampanya & Performans, Yeni Müşteriler, Raporlar, Gelir & Gider, Hızlı İşlemler, Personel, Hizmetler. Tercihleriniz size özel kaydedilir (bir personelin gizlediği widget diğerini etkilemez).",
  },
  {
    keywords: ["konum ekle", "konum link", "harita", "google maps", "adres link", "konumumu kullan"],
    answer:
      "Ayarlar → Salon Bilgileri → \"Konum (Google Maps Linki)\" alanına ekleyebilirsiniz. İki yol var:\n" +
      "1. \"Konumumu Kullan\" butonuna basıp tarayıcı konum izni verin — link otomatik doldurulur.\n" +
      "2. Google Maps'te işletmenizi bulup \"Paylaş\" ile linki kopyalayıp buraya yapıştırın.",
  },
  {
    keywords: ["telegram", "bot", "@siriplan_bot"],
    answer:
      "Telegram bildirimlerini aktif etmek için:\n" +
      "1. Telegram uygulamasında arama kısmına @siriplan_bot yazarak botu bulun ve 'Başlat / Start' butonuna basın.\n" +
      "2. Botun size özel olarak gönderdiği sayısal Chat ID numarasını kopyalayın.\n" +
      "3. SiriPlan panelinde Ayarlar → Bildirimler alanındaki 'Telegram Chat ID' kutusuna yapıştırıp kaydedin.\n" +
      "Personelleriniz de kendi Chat ID'lerini Personel → Detay sayfasından tanımlayarak kendilerine ait bildirimleri kendi Telegram hesaplarına alabilirler.",
  },
  {
    keywords: ["online randevu linki", "randevu link", "qr kod", "linkimi paylaş", "müşteri link", "biyografiye ekle", "vitrin", "slug"],
    answer:
      "Ayarlar → 'Online Randevu Linkim' bölümünde size özel bir vitrin linki (siriplan.com/r/isletme-adiniz) bulunur. " +
      "Ayarlar → Genel sayfasından salonunuzun Logosunu, Kapak Görselini (Banner) ve Salon Galeri Fotoğraflarını yükleyebilirsiniz. Müşterileriniz bu linkten 7/24 randevu oluşturabilir.",
  },
  {
    keywords: ["otomatik onay", "online randevu otomatik", "elle onay", "onay bekliyor online"],
    answer:
      "Ayarlar → \"Online Randevu Ayarları\"ndan, online randevu sayfanızdan gelen taleplerin otomatik onaylanmasını açabilirsiniz (Pro veya Business planında). Kapalıyken online talepler önce \"Bekliyor\" durumunda kuyruğa düşer, siz onaylayana kadar takvime işlenmez.",
  },
  {
    keywords: ["müşteri dili", "müşterinin dili", "randevu sayfası dil", "online sayfa dil", "hangi dilde açılır"],
    answer:
      "Online randevu sayfanız, müşteri telefon numarasını girdiğinde daha önce kaydedilmiş bir dil tercihi varsa otomatik o dilde açılır; sağ üstteki bayrak ikonlarıyla müşteri elle de değiştirebilir. " +
      "Bir müşterinin dilini panelden elle ayarlamak isterseniz, Müşteriler → ilgili müşteri detayından \"Tercih Edilen Dil\" alanını düzenleyebilirsiniz.",
  },
  {
    keywords: ["sadakat", "puan kazan", "loyalty", "müşteri skoru", "sadakat kartı", "puan"],
    answer:
      "Her müşteri, tamamlanan randevulardan 0-100 arası bir sadakat/skor puanı biriktirir (randevuya gelmemek puanı düşürür). " +
      "Hizmetler → Hizmet Düzenle ekranından 'Sadakat puanı kazandırsın' seçeneğini işaretleyerek hangi işlemlerin puan kazandıracağını belirleyebilirsiniz. Puan durumu Müşteri detay sayfasında görünür.",
  },
  {
    keywords: ["online randevudan engelle", "müşteriyi engelle", "randevu alamasın", "engelli müşteri", "engelle"],
    answer:
      "Sık gelmeyen veya sürekli gelmeyen (no-show) bir müşteriyi, müşteri detay sayfasındaki \"Online Randevudan Engelle\" butonuyla yalnızca online randevu sayfasından yeni randevu almaktan men edebilirsiniz — siz panelden onun için elle randevu oluşturmaya devam edebilirsiniz. İstediğiniz an aynı butonla engeli kaldırabilirsiniz.",
  },
  {
    keywords: ["izin gün", "izinli", "tatil gün", "personel izni", "personel tatil"],
    answer:
      "Personel detay sayfasından ilgili çalışan için izin/tatil günleri tanımlayabilirsiniz; personel o tarihlerde randevuya atanamaz ve online randevu sayfasında müsait görünmez (mevcut randevular etkilenmez, elle iptal/taşıma gerekir).",
  },
  {
    keywords: ["çalışma saat", "açılış saat", "kapanış saat", "mesai saat", "kaçta açılıyor"],
    answer:
      "Ayarlar → Salon Bilgileri → \"Çalışma Saatleri\" bölümünden her gün için ayrı açılış/kapanış saati tanımlayabilir, kapalı olduğunuz günleri boş bırakabilirsiniz. Bu saatler, online randevu sayfasında ve takvimde gösterilen müsait aralıkları belirler.",
  },
  {
    keywords: ["kvkk", "gizlilik metn", "aydınlatma metn"],
    answer:
      "Müşterilerinize online randevu alırken gösterilecek KVKK aydınlatma metnini Ayarlar → \"KVKK / Yasal Bildirim\" bölümünden özelleştirebilirsiniz; boş bırakırsanız platformun varsayılan metni kullanılır. Müşteri bu metni onaylamadan online randevu tamamlanamaz.",
  },
  {
    keywords: ["tema", "karanlık mod", "koyu mod", "dark mode", "açık mod"],
    answer:
      "Panelin açık/koyu temasını, kenar menüdeki (Sidebar) tema anahtarından değiştirebilirsiniz; tercih tarayıcınızda saklanır.",
  },
  {
    keywords: ["birden fazla işletme", "şube değiştir", "işletme değiştir", "organizasyon değiştir", "birden fazla salon"],
    answer:
      "Aynı hesapla birden fazla işletmede (organizasyonda) üyeyseniz, kenar menüdeki işletme seçiciden aktif işletmenizi değiştirebilirsiniz — her işletmenin randevu, müşteri ve personel verisi ayrı tutulur. Business planında sınırsız şube desteklenir.",
  },
  {
    keywords: ["hızlı randevu", "quick book", "tek tıkla randevu"],
    answer:
      "Randevular sayfasının sağ üstündeki \"Randevu Ekle\" butonuyla açılan hızlı panelden; personel, müşteri (isim/telefonla arayarak) ve hizmet seçip birkaç saniyede randevu oluşturabilirsiniz. Daha fazla alan (not, kaynak, KVKK onayı vb.) gerekiyorsa \"Detaylı Form\"u kullanın.",
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
    keywords: ["şablon", "mesaj metn", "hazır mesaj", "sıcak", "kısa mesaj", "resmi mesaj", "hizmet detaylı"],
    answer:
      "Ayarlar → Otomatik Randevu Mesajı bölümünden 4 hazır şablondan (Sıcak, Kısa, Resmi, Hizmet Detaylı) birini seçebilir veya kendi metninizi yazabilirsiniz. " +
      "Değişkenler otomatik doldurulur: {musteri} {salon} {tarih} {saat} {hizmet} {personel} {konum}. " +
      "Hatırlatma ve iptal mesajlarına Ayarlar → WhatsApp Bildirim Ayarları'ndan ayrı birer özel not da ekleyebilirsiniz.",
  },
  {
    keywords: ["whatsapp", "bildirim", "sms", "e-posta bildirim", "mail bildirim"],
    answer:
      "Ayarlar → Bildirimler'den WhatsApp (randevu oluşturulunca/revize edilince/iptal edilince ayrı ayrı açılıp kapatılır), SMS (Netgsm/VatanSMS/İletimerkezi sağlayıcılarından biriyle), e-posta ve Telegram kanallarını yönetebilirsiniz. " +
      "Hatırlatma mesajının randevudan kaç saat önce gideceğini भी aynı sayfadan seçersiniz.",
  },
  {
    keywords: ["bahşiş", "ödeme yöntemi", "nakit mi kart mı", "ekstra gelir"],
    answer:
      "Randevuyu \"Tamamlandı\" olarak işaretlerken ödeme yöntemini (Nakit/Kart/Havale/Diğer), varsa bahşişi ve hizmet fiyatı dışında alınan ekstra ücreti girebilirsiniz — bunlar otomatik olarak Gelir-Gider tablosuna işlenir.",
  },
  {
    keywords: ["adisyon", "hesap fişi", "fiş yazdır", "fiş bas", "yazdır"],
    answer:
      "Randevu detay sayfasındaki 'Adisyon' butonuyla, randevuya ait detayları (hizmet, fiyat, bahşiş, toplam tutar ve ödeme yöntemi) gösteren yazdırılabilir fiş açılır. Sağ üstteki 'Yazdır' butonuyla doğrudan termal yazıcıya gönderebilir veya PDF kaydedebilirsiniz.",
  },
  {
    keywords: ["maaş hesap", "maaş öde", "personel maaş", "komisyon hesap", "taban maaş", "prim hesap", "maaş"],
    answer:
      "Personel → 'Maaş Hesapla' sayfasından seçtiğiniz ay için personelin toplam hak edişini (Taban Maaş + [Yapılan Ciro × Komisyon %] + Bahşişler) görebilirsiniz. 'Gider Olarak Kaydet' butonuyla tek tıkla Gelir-Gider kasasından düşürebilirsiniz.",
  },
  {
    keywords: ["kılavuz", "rehber", "kullanım kılavuzu", "nasıl kullanılır", "nasıl yapılır", "video", "sunum"],
    answer:
      "SiriPlan kullanım kılavuzuna, 19 slaytlık interaktif sunuma ve detaylı adım adım kurulum rehberlerine panelin sol menüsündeki 'Kullanım Kılavuzu' sayfasından (/dashboard/rehber) ulaşabilirsiniz. Bu sayfa içerikleri kopyalama korumalıdır.",
  },
  {
    keywords: ["ödeme yap", "abonelik", "plan seç", "starter", "pro plan", "business plan", "plan fiyat", "kredi kartı", "deneme süresi", "stripe", "mobil ödeme", "ios ödeme", "android ödeme"],
    nativeAnswer:
      "Hesabınızın planını ve kullanım limitlerini Ayarlar → Abonelik sayfasından görebilirsiniz. Mobil mağaza politikaları nedeniyle iOS/Android uygulamaları içinden doğrudan ödeme yapılamamaktadır; ödemelerinizi web tarayıcınızdan yapabilirsiniz. " +
      "Destek için: " + CONTACT_LINE,
    answer:
      "Planlarımız Starter, Pro ve Business olarak 14 gün ücretsiz deneme ile başlar. " +
      "Mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi Ayarlar → Abonelik sayfasından görebilirsiniz. " +
      "Aboneliğiniz SiriPlan hesabınıza bağlıdır; plan yükseltme, yenileme veya faturalandırma sorularınız için: " + CONTACT_LINE,
  },
  {
    keywords: ["randevu"],
    answer:
      "Randevular sayfasından yeni randevu oluşturabilir, Takvim sayfasından 15 dakikalık dilimlerle görsel olarak planlayabilirsiniz. Oluşturma/düzenleme/iptalde müşteriye otomatik bildirim gider (Ayarlar → Bildirimler'e bağlı).",
  },
  {
    keywords: ["takvim", "gün görünüm", "hafta görünüm"],
    answer:
      "Takvim sayfası tüm randevuları gün/hafta bazlı, her personele atanmış renk koduyla gösterir. Boş bir saate tıklayarak hızlıca randevu oluşturabilir, mevcut bir randevuyu sürükleyerek farklı bir saate/personele taşıyabilirsiniz.",
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
      "Hizmetler sayfasından kategori, süre ve fiyat tanımlayarak hizmet kataloğunuzu oluşturursunuz; mevcut bir hizmete tıklayıp \"Düzenle\"den adını, fiyatını veya süresini değiştirebilirsiniz. Süre, takvimdeki randevu slotunun uzunluğunu belirler.",
  },
  {
    keywords: ["kampanya"],
    answer:
      "Kampanyalar sayfasından toplu WhatsApp mesajı gönderebilirsiniz ({{musteri_adi}}, {{salon_adi}} gibi şablon değişkenleriyle). Kampanyalar Taslak → Planlandı → Gönderiliyor → Gönderildi sırasıyla ilerler; hata olursa Başarısız olarak işaretlenir.",
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
      "Veri Göçü sayfasından mevcut Excel/CSV verilerinizi içe aktarabilir; verilerinizi CSV, JSON, Excel veya PDF olarak dışa aktarabilirsiniz.",
  },
  {
    keywords: ["dil", "language"],
    answer:
      "Panel Türkçe, İngilizce, Rusça ve Arapça dillerini destekler. Bildirimlerin hangi dilde gideceğini her personel için Personel sayfasından ayrıca ayarlayabilirsiniz; online randevu sayfası da müşterinin daha önce seçtiği dili hatırlar.",
  },
  {
    keywords: ["kayıt ol", "hesap oluştur", "giriş yap", "şifremi unuttum", "şifre"],
    answer:
      "Yeni işletmeler /auth/kayit üzerinden kayıt olur, mevcut kullanıcılar /auth/giris ile panele erişir. Şifrenizi unuttuysanız giriş ekranındaki \"Şifremi Unuttum\" linkinden sıfırlayabilirsiniz. Yeni kayıt olan her işletme 14 günlük ücretsiz deneme ile başlar.",
  },
  {
    keywords: ["ana ekrana ekle", "telefona yükle", "uygulama olarak", "pwa"],
    answer:
      "Ayarlar sayfasındaki \"Uygulamayı telefona ekle\" kartından, tarayıcınızın \"Ana ekrana ekle\" özelliğiyle SiriPlan'ı telefonunuza bir uygulama gibi kurabilirsiniz — ayrı bir mağaza indirmesi gerekmez.",
  },
];

function getStaticResponse(message: string, mobileApp: boolean): string {
  const msg = message.toLowerCase();

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((k) => msg.includes(k))) {
      return mobileApp && entry.nativeAnswer ? entry.nativeAnswer : entry.answer;
    }
  }

  // Bilgi tabanında karşılığı olmayan (çok özel/hesaba özel) sorular için:
  // panel kullanımı hakkında genel bilgi veremediğimiz için destek ekibine yönlendir.
  return `Bu konuda elimde hazır bir bilgi yok. Daha detaylı yardım için ${CONTACT_LINE}`;
}

export async function POST(req: NextRequest) {
  try {
    // Bu uç LLM çağırmaz (yanıtlar statik), dolayısıyla maliyet riski yok; yine
    // de kimlik doğrulaması istemeyen bir POST ucu olduğu için kaba kuvvetle
    // sunucu kaynağı tüketilmesine karşı üst sınır konuyor. Gerçek kullanımda
    // bir personel dakikada birkaç soru sorar; 60/dk fazlasıyla geniş.
    const limit = limitByIp(req, "dashboard-chat", 60, 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { response: `Çok fazla istek gönderildi. Lütfen biraz bekleyin. ${CONTACT_LINE}` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: "Mesaj çok uzun." }, { status: 400 });
    }

    return NextResponse.json({ response: getStaticResponse(message, await isMobileApp()) });
  } catch {
    return NextResponse.json({
      response: `Şu an yanıt veremiyorum. Lütfen ${CONTACT_LINE}`,
    });
  }
}
