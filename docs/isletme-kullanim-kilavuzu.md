# 📖 SiriPlan İşletme Kullanım Kılavuzu (Güncel & Doğrulanmış)

> **SiriPlan Randevu & İşletme Yönetim Sistemi** ile salonunuzu 5 dakikada dijitalleştirin. Kağıt-kalem karmaşasına, unutulan randevulara ve boş koltuklara son verin!

---

## 📑 İçindekiler
1. [Hızlı Başlangıç & Hesap Kurulumu](#1-hızlı-başlangıç--hesap-kurulumu)
2. [Giriş Akışı: Yönetici ve Personel Girişi](#2-giriş-akışı-yönetici-ve-personel-girişi)
3. [Panel Açılışını (Dashboard) Kişiselleştirme](#3-panel-açılışını-dashboard-kişiselleştirme)
4. [Hizmetlerinizi Tanımlayın](#4-hizmetlerinizi-tanımlayın)
5. [Personellerinizi ve Yetkileri Ekleyin](#5-personellerinizi-ve-yetkileri-ekleyin)
6. [Takvim & Randevu Yönetimi (Tıklayarak Randevu & Özelleştirme)](#6-takvim--randevu-yönetimi)
7. [Adisyon Oluşturma & Fiş Çıkarma](#7-adisyon-oluşturma--fiş-çıkarma)
8. [İşletme Web Sitesi & Vitrin Görünümü (/r/[slug])](#8-işletme-web-sitesi--vitrin-görünümü-rslug)
9. [Otomatik WhatsApp / SMS Bildirimleri](#9-otomatik-whatsapp--sms-bildirimleri)
10. [Telegram Bildirim Botu (@siriplan_bot Kurulumu)](#10-telegram-bildirim-botu-siriplan_bot-kurulumu)
11. [Toplu WhatsApp Kampanyaları](#11-toplu-whatsapp-kampanyaları)
12. [Abonelik & Ödeme Yapısı (Web vs. Mobil Farkı & Business Planı)](#12-abonelik--ödeme-yapısı-web-vs-mobil-farkı--business-planı)
13. [Müşteri Yönetimi & Sadakat Puanları](#13-müşteri-yönetimi--sadakat-puanları)
14. [Gelir-Gider Takibi & Personel Maaş Hesaplama](#14-gelir-gider-takibi--personel-maaş-hesaplama)
15. [Raporlar ve Veri Göçü (Excel)](#15-raporlar-ve-veri-göçü-excel)
16. [Sık Sorulan Sorular (SSS)](#16-sık-sorulan-sorular-sss)

---

## 1. Hızlı Başlangıç & Hesap Kurulumu

1. **Ücretsiz Kayıt Olun**: `siriplan.com/auth/kayit` adresinden veya web sitemizden işletme adınız, e-postanız ve telefon numaranızla **14 gün ücretsiz** hesabınızı açın. (Kredi kartı gerekmez!)
2. **İşletme Bilgilerini Doldurun**:
   - **Ayarlar → Genel** sekmesine gidin.
   - Sektörünüzü seçin (*Kuaför, Berber, Güzellik Salonu, Nail Art, Estetik Klinik, Spa, Diyetisyen vb.*).
   - Çalışma günlerinizi ve saatlerinizi belirleyin (Örn: Pazartesi-Cumartesi 09:00 - 20:00).
   - Logonuzu, kapak görselinizi (banner) ve işletme bilgilerinizi yükleyin.

---

## 2. Giriş Akışı: Yönetici ve Personel Girişi

SiriPlan çoklu kullanıcı ve rol mimarisini destekler:

- **İşletme Sahibi / Yönetici Girişi**:
  - `siriplan.com/auth/giris` adresinden kayıtlı E-posta veya Telefon numarası + şifre ile sisteme giriş yapar. İşletmenin tüm finansal verilerine, ayarlarına ve raporlarına tam erişime sahiptir.
- **Personel Girişi (İşletme Altında Çalışan Uzmanlar)**:
  - Yönetici, **Personel → Davet Et** butonunu kullanarak personeline bir davet bağlantısı (`/auth/davet?token=...`) gönderir ya da personelin telefon numarasını sisteme tanımlar.
  - Personel kendi e-postası veya telefon numarası ile sisteme giriş yapar.
  - **İşletme Altında Çalışma**: Personel sisteme girdiğinde otomatik olarak bağlı olduğu işletmenin paneline yönlendirilir. Personel rolündeki kullanıcılar yalnızca kendi randevularını ve müşteri takvimini görür; işletme cirosu, gelir-gider ve hassas ayarları görmeleri engellenir.

---

## 3. Panel Açılışını (Dashboard) Kişiselleştirme

Panele giriş yaptığınızda karşınıza çıkan Ana Sayfa (Dashboard) widget tabanlı esnek bir yapıya sahiptir:

- **Widget'ları Sürükle-Bırak**: Sağ üstteki **"Kişiselleştir"** butonuna basarak widget kartlarının yerlerini sürükleyip değiştirebilirsiniz.
- **Kartları Göster / Gizle**: İhtiyacınız olmayan kartları göz ikonuna basarak gizleyebilir, sık kullandıklarınızı ön plana çıkarabilirsiniz.
- **Kişiye Özel Hafıza**: Yapılan görünüm tercihleri her kullanıcının kendi hesabına özel kaydedilir (bir uzmanın gizlediği kart yöneticinin ekranını etkilemez).

---

## 4. Hizmetlerinizi Tanımlayın

İşletmenizde sunduğunuz tüm işlemleri sisteme yükleyin:
1. Sol menüden **Hizmetler** sekmesine girin.
2. **+ Yeni Hizmet** butonuna tıklayın.
3. Bilgileri doldurun:
   - **Hizmet Adı**: (*Saç Kesimi & Şekillendirme, Protez Tırnak, Cilt Bakımı vb.*)
   - **Kategori**: (*Saç, Tırnak, Yüz Bakımı vb.*)
   - **Süre**: (*30 dk, 45 dk, 60 dk → randevu takviminde işlem süresini kilitler*)
   - **Fiyat**: İşlem ücretini belirleyin.
4. **Kaydet** butonuna basın.

---

## 5. Personellerinizi ve Yetkileri Ekleyin

Ekibinizdeki her uzman için ayrı takvim ve yetki tanımlayabilirsiniz:
1. Sol menüden **Personel** sekmesine girin.
2. **+ Personel Ekle / Davet Et** butonuna tıklayın.
3. Personelin adını, telefonunu, çalışma günlerini ve **takvimde görünecek rengini** seçin.
4. **Yetki Rolü Belirleyin**:
   - *Yönetici*: Tüm yetkilere sahiptir.
   - *Personel*: Sadece kendi randevularını görebilir.
5. **Maaş & Komisyon Tanımı**: Personel detay sayfasından **Taban Maaş** ve **% Komisyon Oranı** belirleyin.

---

## 6. Takvim & Randevu Yönetimi

### Tıklayarak Anında Randevu Oluşturma:
- Takvim ekranında boş bir saat dilimine veya bir uzmanın sütununa tıkladığınızda, seçtiğiniz **Tarih, Saat ve Personel** otomatik doldurulmuş olarak **Yeni Randevu** modalı açılır. Müşteriyi seçip tek tıkla randevuyu kaydedebilirsiniz.

### Takvimi Özelleştirme ve Filtreleme:
- **Tarih Bazında Görünüm**: Takviminizi **Gün**, **Hafta** veya **Ay** bazında görüntüleyebilirsiniz.
- **Personel Bazında Görünüm**: Personel filtresini kullanarak tüm uzmanları yan yana sütunlar halinde kıyaslayabilir veya sadece seçtiğiniz tek bir personelin programına odaklanabilirsiniz.

### Randevu Durumları:
| Durum | Açıklama |
|---|---|
| Bekliyor | Müşteriden talep geldi, onay bekliyor. |
| Onaylandı | Randevu kesinleşti. Müşteriye otomatik bilgi mesajı gitti. |
| Tamamlandı | Hizmet verildi, ödeme alındı. |
| İptal | Randevu iptal edildi. |
| Gelmedi (No-Show) | Müşteri randevu saatinde salona gelmedi. |

---

## 7. Adisyon Oluşturma & Fiş Çıkarma

SiriPlan panelinde tamamlanan randevular için profesyonel adisyon ve fiş dökümü mevcuttur:

1. **Randevu Detayına Gidin**: Takvimden veya Randevular listesinden ilgili randevunun üzerine tıklayın.
2. **Adisyon Butonuna Basın**: Detay sayfasında bulunan **"Adisyon"** butonuna tıklayın.
3. **Adisyon İçeriği**:
   - İşletme Logosu, İşletme Adı, Adres ve Telefon
   - Randevu Tarihi ve Saati
   - Müşteri Adı ve İlgilenen Personel Adı
   - Alınan Hizmet(ler), Hizmet Tutarı, Eklenen Bahşiş ve Toplam Tutar
   - Ödeme Yöntemi (*Nakit, Kredi Kartı, Havale/EFT, Diğer*)
4. **Yazdır veya PDF Kaydet**: Sağ üstteki **"Yazdır"** butonu ile adisyonu doğrudan termal yazıcıya/standart yazıcıya gönderebilir veya bilgisayarınıza/telefonunuza PDF olarak indirebilirsiniz.

---

## 8. İşletme Web Sitesi & Vitrin Görünümü (`/r/[slug]`)

Müşterilerinizin 7/24 online randevu alabileceği ve salonunuzu inceleyebileceği özel bir web vitrini sunulur:

- **Özel Web Adresi**: Her işletmeye özel `siriplan.com/r/isletme-adiniz` şeklinde şık bir bağlantı tanımlanır.
- **Resim & Görsel Yükleme**: **Ayarlar → Genel** sayfasından salonunuzun **Logosunu**, **Kapak Görselini (Banner)** ve **Salon Galeri Fotoğraflarını** yükleyebilirsiniz. Yüklenen fotoğraflar web vitrininizde müşterilerinize estetik bir şekilde sunulur.
- **Online Randevu Sihirbazı**: Müşterileriniz profilinize girerek sırasıyla *Hizmet → Personel → Tarih ve Saat* seçip telefon numaralarıyla saniyeler içinde randevu oluşturabilirler.

---

## 9. Otomatik WhatsApp / SMS Bildirimleri

Müşterilerinizin randevuyu unutmasını engellemenin en pratik yolu!

1. **Ayarlar → Bildirimler** bölümüne gidin.
2. **Bildirim Kanalları**: WhatsApp, SMS veya Telegram entegrasyonunu aktif edin.
3. **Otomatik Mesaj Türleri**:
   - **Randevu Oluşturuldu**: Randevu alındığı an anında teyit mesajı gider.
   - **Randevu Hatırlatma**: Randevudan **2 saat önce** veya **1 gün önce** otomatik hatırlatıcı gönderir.
   - **İptal / Değişiklik**: Randevu saati değiştiğinde müşteriye bilgi verir.
4. **Mesaj Tonu**: *Sıcak, Resmi veya Kısa* stillerden salon konseptinize uygun olanı seçin.

---

## 10. Telegram Bildirim Botu (`@siriplan_bot` Kurulumu)

Salonunuza yeni bir randevu düştüğünde, ertelendiğinde veya iptal edildiğinde telefonunuza anında Telegram bildirimi almak çok kolaydır:

1. **Botu Başlatın**: Telegram uygulamasında arama kısmına **`@siriplan_bot`** yazın ve botu açıp **"Başlat / Start"** butonuna basın.
2. **Chat ID Alın**: Bot size özel bir **Chat ID** (sayısal numara) yanıtı verecektir.
3. **Panele Kaydedin**:
   - SiriPlan panelinde **Ayarlar → Bildirimler (veya Sosyal Medya & Entegrasyonlar)** alanındaki **"Telegram Chat ID"** kutusuna kopyaladığınız numarayı yapıştırıp **Kaydet** butonuna basın.
   - *(İsteğe Bağlı)* Personelleriniz de kendi Telegram Chat ID'lerini **Personel → Detay** sayfasından ekleyerek sadece kendilerine ait randevu bildirimlerini kendi Telegram hesaplarına alabilirler.

---

## 11. Toplu WhatsApp Kampanyaları

Salondaki boş günleri doldurmak veya özel günleri kutlamak için müşterilerinize toplu mesaj gönderin:

1. **Kampanyalar** sekmesine tıklayın.
2. **+ Yeni Kampanya** başlatın.
3. Mesaj metnini yazın. Değişkenleri kullanın: `Merhaba {{musteri_adi}}, {{salon_adi}} salonumuzda bu haftaya özel %20 indirim fırsatı!`
4. Müşteri grubunu filtreleyin (Örn: *Son 30 gündür gelmeyen müşteriler*) ve **Gönder**'e basın.

---

## 12. Abonelik & Ödeme Yapısı (Web vs. Mobil Farkı & Business Planı)

SiriPlan platformunun ödeme ve abonelik yönetimi:

- **Sabit Fiyatlı Planlar & Anında Satın Alma**:
  - **Starter**, **Pro** ve **Business** planlarının tamamı sabit, şeffaf fiyatlara sahiptir.
  - **"Teklif Al" bekleme dönemi yoktur!** İşletmeler diledikleri paketi doğrudan web üzerinden anında seçip satın alabilir veya 14 gün ücretsiz deneme başlatabilirler.
- **Web Üzerinden Ödeme (Bilgisayar & Mobil Tarayıcı)**:
  - 14 günlük ücretsiz deneme süreniz boyunca tüm özellikler açıktır.
  - Deneme süresi bitiminde veya öncesinde **Ayarlar → Abonelik** veya `siriplan.com/auth/plan-sec` sayfasından aylık/yıllık planınızı seçip kredi kartınızla güvenle ödeme yapabilirsiniz.
- **Mobil Uygulama (iOS App Store & Google Play Store)**:
  - App Store ve Google Play politika gereksinimleri doğrultusunda (%0 mağaza komisyonu uyumluluğu), mobil uygulama içerisinde **satın alma butonları veya doğrudan ödeme alma alanları yer almaz**.
  - Mobil uygulamada deneme süresi dolduğunda web adresi ve destek iletişim bilgileri gösterilir. Ödeme web üzerinden tamamlandıktan sonra mobil uygulama kullanımı kesintisiz devam eder.

---

## 13. Müşteri Yönetimi & Sadakat Puanları

- **Geçmişi Takip Edin**: Müşteri detayına tıklayarak daha önce hangi uzmandan hangi hizmeti aldığını, ne kadar ödeme yaptığını ve özel notlarını (*örn: "Sarı 9.0 boya tercih ediyor"*) görün.
- **Sadakat Puanı**: Her tamamlanan randevuda müşterilerinize otomatik puan kazandırarak tekrar gelmelerini sağlayın.

---

## 14. Gelir-Gider Takibi & Personel Maaş Hesaplama

- **Gelir-Gider Kasa Takibi**: **Gelir-Gider** sekmesinden kira, malzeme alımı, çay-kahve masrafları ve faturaları kaydederek günlük net karınızı görün.
- **Personel Maaş & Komisyon Hesaplama**:
  - **Personel → Maaş Hesapla** sayfasına gidin.
  - Ay ve personel seçin. Sistem otomatik olarak **Taban Maaş + (Yapılan Ciro × Komisyon %) + Bahşişler** formülüyle toplam ödemeyi çıkarır.
  - **"Gider Olarak Kaydet"** butonuna basarak tek tıkla işletme kasasından düşürün.

---

## 15. Raporlar ve Veri Göçü (Excel)

- **Ciro & Performans Raporları**: Hangi personel kaç müşteri ağırladı, en çok kazandıran hizmet hangisi, hangi günler daha yoğun grafikleri inceleyin.
- **Excel'den Aktarma**: Eski müşteri listenizi **Veri Göçü** sayfasından tek tıkla Excel/CSV formatında yükleyin. Tüm geçmiş verilerinizi dışa aktarıp yedekleyin.

---

## 16. Sık Sorulan Sorular (SSS)

**Telegram randevu bildirimlerini nasıl açabilirim?**
Telegram'da `@siriplan_bot` hesabına mesaj atıp `/start` basın. Size verilen Chat ID numarasını Ayarlar sekmesindeki Telegram alanına yapıştırın.

**Business planını satın almak için teklif mi istemeliyim?**
Hayır! Business dahil tüm planlarımız sabit fiyatlıdır. Herhangi bir temsilci beklemeden web sitemizden anında 14 gün ücretsiz başlatabilir veya satın alabilirsiniz.

**Mobil uygulamadan ödeme yapabilir miyim?**
Hayır. Mobil mağaza politikaları uyarınca mobil uygulama içerisinde ödeme ekranı bulunmaz. Ödemenizi web sitemiz (`siriplan.com/auth/plan-sec`) üzerinden yapabilirsiniz.

**Personelim sisteme kendi telefonuyla girebilir mi?**
Evet! Personeliniz kendi telefon numarası veya e-postasıyla sisteme giriş yaparak işletmeniz altında kendi randevu takvimini yönetebilir.
