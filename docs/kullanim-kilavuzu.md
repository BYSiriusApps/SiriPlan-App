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

Standart widget'lar: Active Appointments, Daily Calendar, WhatsApp Assistant, Campaigns Star, New Customers, Reports Summary, Income-Expense, Quick Actions, Revenue Summary, Staff Today, Services Summary.

## 4. Takvim ve Randevu Yönetimi

- **Tıklayarak Randevu Oluşturma**: Takvim gridindeki boş bir saat dilimine veya personel sütununa tıklandığında, seçilen tarih, saat ve personel bilgisi otomatik doldurulmuş olarak **Yeni Randevu** modalı açılır.
- **🎤 Konuşarak Randevu Oluşturma**: **Yeni Randevu** ekranındaki (ve takvim üstündeki hızlı randevu panelindeki) mikrofon düğmesiyle randevu bilgileri sesle girilir. Sistem **15 sn** dinler, duyduğu metni canlı gösterir, ekran değişmez.
  - Örn. *"Ahmet Yılmaz, saç kesimi, Zeynep, yarın 15.30"* → müşteri + hizmet + personel + tarih forma yazılır, özet kutusu açılır.
  - Yerel Türkçe ayrıştırıcı ([`src/lib/voice-parse.ts`](../src/lib/voice-parse.ts)) çalışır; `GEMINI_API_KEY` varsa Gemini de devreye girer, yoksa yerel ayrıştırıcı yeterlidir (`/api/ai/voice-booking`, `parseOnly` daima form doldurur, asla yönlendirmez).
  - **Fill-if-empty**: önceden dolan alanlar korunur, eksikler sarı işaretlenir; "Eksikleri sesle ekle" ile tamamlanır.
  - **Telefon opsiyonel**: söylenmezse ve müşteri kayıtlıysa addan otomatik çekilir; değilse randevu numarasız kaydedilip sonra tamamlanabilir.
- **Görünüm ve Filtreleme Özelleştirme**:
  - **Tarih Bazında**: Günü (`day`), Haftayı (`week`), Ayı (`month`) seçerek görünüm ayarlanabilir.
  - **Personel Bazında**: Personel filtresi veya "Personel Görünümü" (`staff`) ile uzmanlar yan yana sütunlar halinde kıyaslanabilir. Personel rolündeki kullanıcılar yalnızca kendi takvimini görebilir.
- **Randevu Durumları**: Bekliyor, Onaylandı, Tamamlandı, İptal, Gelmedi (No-Show).

## 5. Adisyon Oluşturma & Fiş Dökümü

Randevu detay sayfasındaki (`/dashboard/randevular/[id]`) **"Adisyon"** butonuna basıldığında:
- İşletme logosu, adı, adresi, telefonu,
- Randevu tarihi, müşteri ve personel bilgileri,
- Hizmet(ler), hizmet fiyatı, bahşiş tutarı, toplam ücret ve ödeme yöntemi (*Nakit, Kredi/Banka Kartı, Havale/EFT, Diğer*) görüntülenir.
- **Yazdır / PDF**: Tek tıkla yazıcıya gönderilebilir veya PDF olarak indirilebilir.

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

## 8. Müşteri Yönetimi

Müşteri kayıtları, geçmiş randevular, özel notlar ve sadakat puanı takibi yapılır.

## 9. Hizmet Yönetimi

Hizmet adı, kategori, süre (dakika) ve fiyat tanımlanır.

## 10. Personel Yönetimi

Personeller, çalışma günleri, renk kodları, roller ve özel yetkileri tanımlanır.

## 11. Kampanyalar

Müşteri listesine toplu WhatsApp mesajı gönderimi sağlanır.

## 12. Raporlar

Günlük/dönemsel ciro, gider, randevu sayısı ve personel/hizmet bazlı performans analizleri sunulur.

## 13. Gelir-Gider & Maaş Hesaplama

- Manuel gelir ve gider kayıtları tutulur.
- **Maaş Hesapla**: Taban Maaş + (Ciro × Komisyon %) + Bahşiş formülü ile tek tıkla gider olarak kaydedilir.

## 14. Ayarlar

Genel bilgiler, logo/banner yükleme, WhatsApp/SMS/Telegram bildirim şablonları, yetkilendirme ve abonelik yönetimi.

## 15. Veri Göçü (İçe/Dışa Aktarma)

Excel/CSV dosyası ile toplu müşteri aktarımı ve verilerin JSON/CSV/PDF olarak indirilmesi.

## 16. Abonelik ve Plan Yönetimi

- 🧾 **Şeffaf Planlar**: Starter, Pro ve Business planları sabit ve şeffaf yapıdadır. "Teklif Al" bekleme adımı bulunmaz; her yeni hesap 14 gün ücretsiz deneme ile başlar.
- ⚙️ **Plan Bilgileriniz**: Mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi Ayarlar → Abonelik sayfasından görüntüleyebilirsiniz.
- ✉️ **Destek**: Abonelik SiriPlan hesabınıza bağlıdır. Plan yükseltme, yenileme veya faturalandırma sorularınız için info@bysirius.com (WhatsApp +90 535 503 26 34).

## 17. Sık Sorulan Sorular

- Telegram randevu bildirimleri nasıl açılır? (Telegram'da `@siriplan_bot` botuna `/start` yazıp alınan Chat ID paneldeki alana kaydedilir).
- Business planı için teklif almak gerekir mi? (Hayır, Business dahil tüm planlar şeffaf yapıdadır; teklif alma adımı yoktur).
- Planımı ve fatura geçmişimi nereden görürüm? (Ayarlar → Abonelik sayfasından; plan sorularınız için info@bysirius.com).
- Personeller kendi telefonlarıyla girebilir mi? (Evet, personel hesabı yetkisine göre sadece kendi alanını görür).

## 18. Panel İçi Yardım Asistanı

Paneldeki sağ alt yardım balonu kullanıcı sorularına anında yanıt verir.
