# SiriPlan Panel Kullanım Kılavuzu

> Kaynak doküman — güncel panel özelliklerine göre yazılmıştır. Panelde yeni bir özellik eklendiğinde bu dosyayı da güncelleyin; docx/PDF ve sosyal medya içerikleri buradan türetilir.

## İçindekiler

1. [SiriPlan Nedir](#1-siriplan-nedir)
2. [Kayıt, Giriş ve Deneme Süresi (Yönetici & Personel Girişi)](#2-kayıt-giriş-ve-deneme-süresi)
3. [Ana Sayfa (Panel Özeti ve Kişiselleştirme)](#3-ana-sayfa-panel-özeti-ve-kişiselleştirme)
4. [Takvim ve Randevu Yönetimi (Tıklayarak Oluşturma & Görünüm Özelleştirme)](#4-takvim-ve-randevu-yönetimi)
5. [Adisyon Oluşturma & Fiş Dökümü](#5-adisyon-oluşturma--fiş-dökümü)
6. [İşletme Web Sitesi & Vitrin Görünümü (/r/[slug])](#6-işletme-web-sitesi--vitrin-görünümü-rslug)
7. [Müşteri Yönetimi](#7-müşteri-yönetimi)
8. [Hizmet Yönetimi](#8-hizmet-yönetimi)
9. [Personel Yönetimi](#9-personel-yönetimi)
10. [Kampanyalar](#10-kampanyalar)
11. [Raporlar](#11-raporlar)
12. [Gelir-Gider & Maaş Hesaplama](#12-gelir-gider--maaş-hesaplama)
13. [Ayarlar](#13-ayarlar)
14. [Veri Göçü (İçe/Dışa Aktarma)](#14-veri-göçü-içedışa-aktarma)
15. [Abonelik ve Ödeme Yapısı (Web vs. Mobil Uygulama)](#15-abonelik-ve-ödeme-yapısı)
16. [Sık Sorulan Sorular](#16-sık-sorulan-sorular)
17. [Panel İçi Yardım Asistanı](#17-panel-içi-yardım-asistanı)

---

## 1. SiriPlan Nedir

SiriPlan; kuaför, berber, güzellik merkezi, spa, nail salon, estetik klinik, makyaj stüdyosu, tattoo stüdyosu, diyetisyen, kaş & kirpik stüdyosu gibi randevu bazlı işletmeler için geliştirilmiş; randevu, müşteri, personel ve gelir-gider yönetimini tek panelde toplayan bir SaaS platformudur. Panel Türkçe, İngilizce, Rusça ve Arapça dillerini destekler; WhatsApp, e-posta ve Telegram üzerinden otomatik bildirim gönderir.

## 2. Kayıt, Giriş ve Deneme Süresi

- **İşletme Kaydı**: Yeni işletmeler `/auth/kayit` üzerinden kayıt olur. Kayıt olan her işletme **14 günlük ücretsiz deneme** ile başlar; bu süre boyunca tüm Pro özellikler açıktır.
- **Giriş Yöntemleri**:
  - **Yönetici/Sahip Girişi**: `/auth/giris` sayfasından e-posta veya telefon + şifre ile girer.
  - **Personel Girişi**: İşletme altında tanımlanan personeller, e-posta veya telefon numaraları ile giriş yaparlar veya kendilerine iletilen davet bağlantısını (`/auth/davet?token=...`) kullanarak işletme hesabına katılırlar. Personeller sisteme girdiğinde otomatik olarak bağlı bulundukları işletme adının altına yönlendirilir.

## 3. Ana Sayfa (Panel Özeti ve Kişiselleştirme)

Panele giriş yapan her kullanıcı, işletmenin günlük özetini gösteren bir gösterge paneli (dashboard) ile karşılaşır:

- **Kişiselleştir Butonu**: Ekranın sağ üstündeki **Kişiselleştir** butonu ile widget kartları sürükle-bırak yöntemiyle yeniden sıralanabilir, istenmeyen widget'lar göz ikonu ile gizlenebilir.
- **Kullanıcıya Özel Hafıza**: Tercihler kullanıcı bazında saklanır (bir personelin gizlediği widget işletme sahibini etkilemez).

Standart widget'lar: Active Appointments, Daily Calendar, WhatsApp Assistant, Campaigns Star, New Customers, Reports Summary, Income-Expense, Quick Actions, Revenue Summary, Staff Today, Services Summary.

## 4. Takvim ve Randevu Yönetimi

- **Tıklayarak Randevu Oluşturma**: Takvim gridindeki boş bir saat dilimine veya personel sütununa tıklandığında, seçilen tarih, saat ve personel bilgisi otomatik doldurulmuş olarak **Yeni Randevu** modalı açılır.
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

## 7. Müşteri Yönetimi

Müşteri kayıtları, geçmiş randevular, özel notlar ve sadakat puanı takibi yapılır.

## 8. Hizmet Yönetimi

Hizmet adı, kategori, süre (dakika) ve fiyat tanımlanır.

## 9. Personel Yönetimi

Personeller, çalışma günleri, renk kodları, roller ve özel yetkileri tanımlanır.

## 10. Kampanyalar

Müşteri listesine toplu WhatsApp mesajı gönderimi sağlanır.

## 11. Raporlar

Günlük/dönemsel ciro, gider, randevu sayısı ve personel/hizmet bazlı performans analizleri sunulur.

## 12. Gelir-Gider & Maaş Hesaplama

- Manuel gelir ve gider kayıtları tutulur.
- **Maaş Hesapla**: Taban Maaş + (Ciro × Komisyon %) + Bahşiş formülü ile tek tıkla gider olarak kaydedilir.

## 13. Ayarlar

Genel bilgiler, logo/banner yükleme, WhatsApp/SMS/Telegram bildirim şablonları, yetkilendirme ve abonelik yönetimi.

## 14. Veri Göçü (İçe/Dışa Aktarma)

Excel/CSV dosyası ile toplu müşteri aktarımı ve verilerin JSON/CSV/PDF olarak indirilmesi.

## 15. Abonelik ve Ödeme Yapısı

- 💻 **Web (Tarayıcı)**: Ayarlar → Abonelik veya `/auth/plan-sec` üzerinden kredi kartı ile ödeme yapılır.
- 📱 **Mobil Uygulama (App Store & Google Play)**: Mağaza politikaları (%0 mağaza komisyonu) uyarınca mobil uygulamada fiyat veya satın alma butonları bulunmaz. Deneme süresi dolduğunda web adresi ve destek hattı bilgileri verilir.

## 16. Sık Sorulan Sorular

- Randevu saatinde hatırlatma mesajı gidiyor mu? (Evet, 2 saat / 1 gün önce).
- Mobil uygulamadan ödeme yapılıyor mu? (Ödeme işlemleri web sitemiz üzerinden yürütülür).
- Personeller kendi telefonlarıyla girebilir mi? (Evet, personel hesabı yetkisine göre sadece kendi alanını görür).
- Adisyon yazdırılabilir mi? (Evet, randevu detayından adisyon oluşturulup yazdırılabilir).

## 17. Panel İçi Yardım Asistanı

Paneldeki sağ alt yardım balonu kullanıcı sorularına anında yanıt verir.
