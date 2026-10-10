# SiriPlan Panel Kullanım Kılavuzu

> Kaynak doküman — güncel panel özelliklerine göre yazılmıştır. Panelde yeni bir özellik eklendiğinde bu dosyayı da güncelleyin; docx/PDF ve sosyal medya içerikleri buradan türetilir.

## İçindekiler

1. [SiriPlan Nedir](#1-siriplan-nedir)
2. [Kayıt, Giriş ve Deneme Süresi (Yönetici & Personel Girişi)](#2-kayıt-giriş-ve-deneme-süresi)
3. [Ana Sayfa (Panel Özeti ve Kişiselleştirme)](#3-ana-sayfa-panel-özeti-ve-kişiselleştirme)
4. [Takvim ve Randevu Yönetimi (Tıklayarak Oluşturma & Görünüm Özelleştirme)](#4-takvim-ve-randevu-yönetimi)
5. [Adisyon Oluşturma & Fiş Dökümü](#5-adisyon-oluşturma--fiş-dökümü)
6. [İşletme Web Sitesi & Vitrin Görünümü (/r/[slug])](#6-işletme-web-sitesi--vitrin-görünümü-rslug)
7. [Telegram Bildirim Botu (@siriplan_bot)](#7-telegram-bildirim-botu-siriplan_bot)
8. [Müşteri Yönetimi](#8-müşteri-yönetimi)
9. [Hizmet Yönetimi](#9-hizmet-yönetimi)
10. [Personel Yönetimi](#10-personel-yönetimi)
11. [Kampanyalar](#11-kampanyalar)
12. [Raporlar](#12-raporlar)
13. [Gelir-Gider & Maaş Hesaplama](#13-gelir-gider--maaş-hesaplama)
14. [Ayarlar](#14-ayarlar)
15. [Veri Göçü (İçe/Dışa Aktarma)](#15-veri-göçü-içedışa-aktarma)
16. [Abonelik ve Plan Yönetimi](#16-abonelik-ve-plan-yönetimi)
17. [Sık Sorulan Sorular](#17-sık-sorulan-sorular)
18. [Panel İçi Yardım Asistanı](#18-panel-içi-yardım-asistanı)

---

## 1. SiriPlan Nedir

SiriPlan; kuaför, berber, güzellik merkezi, spa, nail salon, estetik klinik, makyaj stüdyosu, tattoo stüdyosu, diyetisyen, kaş & kirpik stüdyosu gibi randevu bazlı işletmeler için geliştirilmiş; randevu, müşteri, personel ve gelir-gider yönetimini tek panelde toplayan bir SaaS platformudur. Panel Türkçe, İngilizce, Rusça ve Arapça dillerini destekler; WhatsApp, e-posta ve Telegram üzerinden otomatik bildirim gönderir.

## 2. Kayıt, Giriş ve Deneme Süresi

- **İşletme Kaydı**: Yeni işletmeler `/auth/kayit` üzerinden kayıt olur. Kayıt olan her işletme **14 günlük ücretsiz deneme** ile başlar; bu süre boyunca tüm Pro/Business özellikler açıktır.
- **Giriş Yöntemleri**:
  - **Yönetici/Sahip Girişi**: `/auth/giris` sayfasından e-posta veya telefon + şifre ile girer.
  - **Personel Girişi**: İşletme altında tanımlanan personeller, e-posta veya telefon numaraları ile giriş yaparlar veya kendilerine iletilen davet bağlantısını (`/auth/davet?token=...`) kullanarak işletme hesabına katılırlar. Personeller sisteme girdiğinde otomatik olarak bağlı bulundukları işletme adının altına yönlendirilir.

## 3. Ana Sayfa (Panel Özeti ve Kişiselleştirme)

Panele giriş yapan her kullanıcı, işletmenin günlük özetini gösteren bir gösterge paneli (dashboard) ile karşılaşır:

- **Kişiselleştir Butonu**: Ekranın sağ üstündeki **Kişiselleştir** butonu ile widget kartları sürükle-bırak yöntemiyle yeniden sıralanabilir, istenmeyen widget'lar göz ikonu ile gizlenebilir.
- **Kullanıcıya Özel Hafıza**: Tercihler kullanıcı bazında saklanır.
- **Açılış Sayfası**: Hesabım → Kişiselleştirme'den panele girişte önce **Genel Bakış**'ın mı yoksa **Takvim**'in mi (son baktığınız görünümle) açılacağı seçilir (cihaza özel).
- **Renk Teması**: Sol menünün altındaki palet simgesinden panel rengi istendiği zaman değiştirilir.

Standart widget'lar: Active Appointments, Daily Calendar, WhatsApp Assistant, Campaigns Star, New Customers, Reports Summary, Income-Expense, Quick Actions, Revenue Summary, Staff Today, Services Summary.

## 4. Takvim ve Randevu Yönetimi

- **Tıklayarak Randevu Oluşturma**: Takvim gridindeki boş bir saat dilimine veya personel sütununa tıklandığında, seçilen tarih, saat ve personel bilgisi otomatik doldurulmuş olarak **Yeni Randevu** modalı açılır.
- **🎤 Konuşarak Randevu Oluşturma**: **Yeni Randevu** ekranındaki (ve takvim üstündeki hızlı randevu panelindeki) mikrofon düğmesiyle randevu bilgileri sesle girilir. Sistem **15 sn** dinler, duyduğu metni canlı gösterir, ekran değişmez.
  - Örn. *"Ahmet Yılmaz, saç kesimi, Zeynep, yarın 15.30"* → müşteri + hizmet + personel + tarih forma yazılır, özet kutusu açılır.
  - Yerel Türkçe ayrıştırıcı ([`src/lib/voice-parse.ts`](../src/lib/voice-parse.ts)) çalışır; `GEMINI_API_KEY` varsa Gemini de devreye girer, yoksa yerel ayrıştırıcı yeterlidir (`/api/ai/voice-booking`, `parseOnly` daima form doldurur, asla yönlendirmez).
  - **Fill-if-empty**: önceden dolan alanlar korunur, eksikler sarı işaretlenir; "Eksikleri sesle ekle" ile tamamlanır.
  - **Telefon opsiyonel**: söylenmezse ve müşteri kayıtlıysa addan otomatik çekilir; değilse randevu numarasız kaydedilip sonra tamamlanabilir.
- **Görünüm ve Filtreleme Özelleştirme**:
  - **Tarih Bazında**: Günü (`day`), Haftayı (`week`), Personel görünümünü (`staff`) veya Ayı (`month`) seçerek görünüm ayarlanabilir. Takvime tekrar girildiğinde **en son bakılan görünüm** açılır (çerez `sp_cal_view`).
  - **Randevu dilimi**: Ayarlar'dan 15 / 30 / 60 dk seçilir; yeni hesaplarda varsayılan **30 dk** (`booking_slot_minutes`).
  - **Personel Bazında**: Personel filtresi veya "Personel Görünümü" (`staff`) ile uzmanlar yan yana sütunlar halinde kıyaslanabilir. Personel rolündeki kullanıcılar varsayılan olarak yalnızca kendi takvimini görür; sahip **Ayarlar → Personel Yetkileri → "Tüm randevuları görsün"** kutusunu açarsa tüm salon takvimini de görebilirler.
- **Randevu Durumları**: Bekliyor, Onaylandı, Tamamlandı, İptal, Gelmedi (No-Show).
- **Önemli**: **Randevuyu mutlaka "Tamamlandı" butonuyla kapatın** — bir randevunun geliri Gelir-Gider tablosuna yalnızca "Tamamlandı" olarak işaretlendiğinde yansır; Bekliyor/Onaylandı durumundaki randevular Gelir-Gider hesaplamalarında yer almaz.

## 5. Adisyon Oluşturma & Fiş Dökümü

Randevu detay sayfasındaki (`/dashboard/randevular/[id]`) **"Adisyon"** butonuna basıldığında:
- İşletme logosu, adı, adresi, telefonu,
- Randevu tarihi, müşteri ve personel bilgileri,
- Hizmet(ler), hizmet fiyatı, bahşiş tutarı, toplam ücret ve ödeme yöntemi (*Nakit, Kredi/Banka Kartı, Havale/EFT, Diğer*) görüntülenir.
- **Yazdır / PDF**: Tek tıkla yazıcıya gönderilebilir veya PDF olarak indirilebilir.
- **Erişim kısayolları**: Adisyona randevu detayı dışında da ulaşılabilir — bir randevuyu "Tamamlandı" işaretlediğinizde çıkan bildirimden, Randevular listesindeki tamamlanmış randevu kartının altındaki "Adisyon" düğmesinden veya müşteri detay sayfasındaki geçmiş randevu satırının yanındaki fiş ikonundan.

## 6. İşletme Web Sitesi & Vitrin Görünümü (`/r/[slug]`)

Müşterilerin online randevu alabileceği ve salon vitrinini inceleyebileceği özel web sayfasıdır:
- Her işletmeye özel `siriplan.com/r/[slug]` adresi tanımlanır.
- **Ayarlar → Genel** sekmesinden işletme **logosu**, **kapak görseli (banner)** ve **salon/hizmet fotoğrafları** yüklenebilir. Müşteriler fotoğrafları ışık kutusunda (lightbox) inceleyebilir.
- Müşteriler *Hizmet → Personel → Tarih/Saat* adımlarıyla 7/24 randevu oluşturabilir.

## 7. Telegram Bildirim Botu (`@siriplan_bot`)

Randevu bildirimlerini anında Telegram'dan almak için:
1. Telegram'da **`@siriplan_bot`** botu aratılıp `/start` butonuna basılır.
2. Botun ürettiği özel **Chat ID** numarası kopyalanır.
3. SiriPlan panelinde **Ayarlar → Bildirimler / Entegrasyonlar → Telegram Bildirimleri (Chat ID)** alanına yapıştırıp kaydedilir. (Personeller de kendi Chat ID'lerini Personel detayından ekleyebilir).

**Telefon bildirimi (uygulama kapalıyken de gelir):** Ayarlar → Bildirim Kanalları'ndaki (personel için Hesabım'daki) **"Telefon / Tarayıcı Bildirimi"** kutusunu işaretleyip izin verin; her cihazda ayrı açılır. iPhone (App Store) ve Android mağaza uygulamalarında da aynı kutuyla çalışır; uygulama içinden "Kayıt olun" ile 14 günlük ücretsiz deneme de başlatılabilir (uygulamada ödeme yoktur). Salon sahibi ve yöneticiler tüm randevu, talep ve stok bildirimlerini; personel yalnızca kendisine atananları alır. Hesap açarken verilen telefon WhatsApp bildirim numarası olarak otomatik tanımlanır.

## 8. Müşteri Yönetimi

Müşteri kayıtları, geçmiş randevular, özel notlar ve sadakat puanı takibi yapılır.

## 9. Hizmet Yönetimi

Hizmet adı, kategori, süre (dakika) ve fiyat tanımlanır.

## 10. Personel Yönetimi

Personeller, çalışma günleri, renk kodları, roller ve özel yetkileri tanımlanır.

## 11. Kampanyalar

Müşteri listesine toplu WhatsApp/SMS mesajı gönderimi sağlanır (yalnızca kampanya bildirimi onayı olan müşterilere).

### İndirimli kampanya

- Kampanya oluştururken **İndirim** bölümü açılırsa yüzde ya da sabit tutar, **son geçerlilik tarihi (zorunlu)**, isteğe bağlı geçerli hizmetler ve asgari işlem tutarı tanımlanır. Kampanya sonsuz olamaz.
- Mesajın sonuna indirim miktarı, geçerli hizmetler, son gün, "müşteri başına bir kez" ve "indirim işlem sonrasında salonda uygulanır" notu otomatik eklenir.
- Hak müşteriye özeldir ve en fazla bir kez kullanılır. Son günü geçmiş kampanya gönderilemez; süresi dolan hak kendiliğinden kapanır, kayıtlar silinmez.
- Müşteri randevu linkinden, indirimli bir hizmet için randevu alırken "indirim işlem sonrasında salonda uygulanacaktır" bilgi notunu görür.
- **Uygulama anı randevunun tamamlanmasıdır:** müşterinin geçerli hakkı varsa "Tamamlandı"da uyarı çıkar; "İndirimi uygula" seçilirse tutar indirimli yazılır ve hak kullanıldı sayılır. Gelir-Gider ve raporlarda indirimli (gerçekten ödenen) tutar görünür.
- Randevu tarihi son gün içindeyse tamamlama sonra yapılsa da hak geçerlidir. Randevu iptal/gelmedi olur ya da Tamamlandı'dan geri alınırsa hak müşteriye geri verilir.
- Kampanyaları yalnızca işletme sahibi ve yönetici yönetir; sahip dilerse Personel → [isim] sayfasındaki "Kampanyaları yönetebilsin" kutusuyla bir personele de yetki verebilir. Serbest indirim girilemez, yalnızca kampanyada tanımlı tutar uygulanır.

## 12. Raporlar

Günlük/dönemsel ciro, gider, randevu sayısı ve personel/hizmet bazlı performans analizleri sunulur.

## 13. Gelir-Gider & Maaş Hesaplama

- Manuel gelir ve gider kayıtları tutulur.
- **Randevuyu mutlaka "Tamamlandı" butonuna basarak kapatın.** Randevu gelirleri kasaya yalnızca "Tamamlandı" işaretlendiğinde yansır — **"Tamamlandı" işaretlenmeyen randevu gelire ve ciroya yansımaz**, hizmet verilmiş olsa bile Gelir-Gider hesaplarına dahil edilmez.
- **Maaş Hesapla**: Taban Maaş + (Ciro × Komisyon %) + Bahşiş formülü ile tek tıkla gider olarak kaydedilir.
- **KDV Hesaplama**: Ayarlar → KDV Hesaplama'dan oranınızı girip özelliği açabilirsiniz (yeni işletmelerde varsayılan olarak açıktır). Yasal oran değiştiğinde aynı ekrandan güncellenir — sabit kodlanmış bir oran kullanılmaz. Açıkken "Tahmini KDV" kartı hem bu sayfada hem de Raporlar'da, o ayki gelirin KDV dahil olduğu varsayılarak hesaplanır.

## 14. Ayarlar

Genel bilgiler, logo/banner yükleme, WhatsApp/SMS/Telegram bildirimleri, yetkilendirme ve abonelik yönetimi.

- **Otomatik WhatsApp Mesajları**: Onay/hatırlatma/iptal/revize mesajları müşteriye SiriPlan hattından (Meta onaylı şablonla) **otomatik** gider; işletmenin göndermesi gerekmez. Kartta olaylar, hatırlatma süreleri ve şablon varyantı seçilir.
- **Elle WhatsApp metni (isteğe bağlı)**: Kartın altında kapalı ince bir satırdır; yalnızca kendi WhatsApp'ından elle mesaj göndermek isteyenler içindir (otomatikle birlikte açıksa müşteri iki kez alabilir).
- **SMS**: İki yol — Abonelik sayfasından SiriPlan SMS kontörü (1.000 SMS'lik paket; gönderdikçe azalır, bitince yenisi alınır) ya da kendi sağlayıcı (Netgsm / VatanSMS / İletimerkezi). Sağlayıcı bağlıysa kontör düşmez; bağlı değilse ve kontör varsa platform hesabından gider (`sendSms`).
- **WhatsApp Business Bağlantısı (Kampanyalar İçin)**: Yalnızca Kampanyalar modülünden pazarlama mesajı ve gelen mesaja otomatik yanıt içindir; randevu mesajları için gerekmez.

- **Instagram & Facebook Messenger Bağlantısı**: Sayfa Erişim Belirteci ve Sayfa Kimliği girilince Instagram DM ve Facebook Messenger'a gelen mesajlara AI otomatik yanıt verir (WhatsApp'takiyle aynı `feature_ai` mantığı). Salon sahibinin Meta tarafında yapması gereken adımlar için bkz. [`docs/sosyal-medya/meta-otomasyon-kilavuzu.md`](sosyal-medya/meta-otomasyon-kilavuzu.md). TikTok'ta otomasyon desteklenmez, yalnızca profil linki gösterilir.

## 15. Veri Göçü (İçe/Dışa Aktarma)

Excel/CSV dosyası ile toplu müşteri aktarımı ve verilerin JSON/CSV/PDF olarak indirilmesi.

## 16. Abonelik ve Plan Yönetimi

- 💬 **SMS Kontörü**: Kendi SMS hesabını bağlamak istemeyenler Ayarlar → Abonelik'ten 1.000 SMS'lik paket satın alır (gönderdikçe azalır, bitince yenisi alınır; süre sınırı yok). Native uygulamada satın alma yüzeyi gösterilmez, bakiye görünür.
- 🧾 **Şeffaf Planlar**: Mini, Starter, Pro ve Business planları sabit ve şeffaf yapıdadır. **Mini** (aylık ₺399): tek kişilik işletmeler için; 1 personel (ek personel daveti yok), ayda 200 randevu ve 200 müşteri WhatsApp mesajı, randevu linki, stok/barkod, paket takibi, gelir-gider & KDV. WhatsApp hakkının %80 ve %100'ünde sahibe bildirim gelir ve panelde şerit görünür. Deneme bitince Pro araçları (sesli asistan, kampanya vb.) Mini'de kapanır. "Teklif Al" bekleme adımı bulunmaz; her yeni hesap 14 gün ücretsiz deneme ile başlar.
- ⚙️ **Plan Bilgileriniz**: Mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi Ayarlar → Abonelik sayfasından görüntüleyebilirsiniz.
- ✉️ **Destek**: Abonelik SiriPlan hesabınıza bağlıdır. Plan yükseltme, yenileme veya faturalandırma sorularınız için info@bysirius.com (WhatsApp +90 535 503 26 34).

## 16b. Yeni Araçlar (Eylül 2026 güncellemesi)

- **Bekleyen İstekler & Yeni Saat Öner:** Talepleri Onayla / Yeni Saat Öner / İptal Et; müşteri öneriyi kabul edince randevu otomatik oluşur. Yeni hesaplarda otomatik onay kapalıdır.
- **Bekleme Listesi:** Dolu saat isteyen müşteriyi sıraya alın.
- **Paket / Seans Takibi (tüm planlar):** Randevu tamamlanınca seans otomatik düşer.
- **Stok & Barkod (tüm planlar):** Stok hareketleri, kamerayla barkod okutma, kritik stok uyarısı.
- **Sesli Asistan (Pro):** Basılı tutup konuşarak randevu/stok girişi; "onayla / düzelt / eksikleri ekle".
- **Takvim:** Excel tarzı kompakt görünüm ve personel grup çipleri.
- **Müşteriler:** Özet şeridi, hızlı filtreler (Son 30 Gün, Riskli/Uzaklaşan), "Randevu Ver", müşteri skoru (Pro).
- **Mobil:** [App Store](https://apps.apple.com/app/siriusplan/id6815322807) (iOS'ta Apple'ın isim kuralları nedeniyle **"SiriusPlan"** adıyla yayındadır) / [Google Play](https://play.google.com/store/apps/details?id=com.siriplan.app) uygulaması veya Ana Ekrana Ekle (Ayarlar → "Uygulamayı Telefona Ekle" kartında doğrudan mağaza bağlantıları da vardır).
- **Deneme süresi** boyunca Pro seviyesi araçlar açıktır.

## 17. Sık Sorulan Sorular

- Telefona (uygulama kapalıyken) bildirim nasıl gelir? (Ayarlar/Hesabım'daki "Telefon / Tarayıcı Bildirimi" kutusu işaretlenip izin verilir; personel yalnızca kendine atananları alır).
- Telegram randevu bildirimleri nasıl açılır? (Telegram'da `@siriplan_bot` botuna `/start` yazıp alınan Chat ID paneldeki alana kaydedilir).
- Business planı için teklif almak gerekir mi? (Hayır, Business dahil tüm planlar şeffaf yapıdadır; teklif alma adımı yoktur).
- Planımı ve fatura geçmişimi nereden görürüm? (Ayarlar → Abonelik sayfasından; plan sorularınız için info@bysirius.com).
- Personeller kendi telefonlarıyla girebilir mi? (Evet, personel hesabı yetkisine göre varsayılan olarak sadece kendi alanını görür; "Tüm randevuları görsün" kutusu açıksa tüm salon takvimini de görür).

## 18. Panel İçi Yardım Asistanı

Paneldeki sağ alt yardım balonu kullanıcı sorularına anında yanıt verir.
