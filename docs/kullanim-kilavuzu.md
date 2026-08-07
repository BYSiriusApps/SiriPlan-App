# SiriPlan Panel Kullanım Kılavuzu

> Kaynak doküman — güncel panel özelliklerine göre yazılmıştır. Panelde yeni bir özellik eklendiğinde bu dosyayı da güncelleyin; docx/PDF ve sosyal medya içerikleri buradan türetilir.

## İçindekiler

1. [SiriPlan Nedir](#1-siriplan-nedir)
2. [Kayıt, Giriş ve Deneme Süresi](#2-kayıt-giriş-ve-deneme-süresi)
3. [Ana Sayfa (Panel Özeti)](#3-ana-sayfa-panel-özeti)
4. [Takvim ve Randevu Yönetimi](#4-takvim-ve-randevu-yönetimi)
5. [Müşteri Yönetimi](#5-müşteri-yönetimi)
6. [Hizmet Yönetimi](#6-hizmet-yönetimi)
7. [Personel Yönetimi](#7-personel-yönetimi)
8. [Kampanyalar](#8-kampanyalar)
9. [Raporlar](#9-raporlar)
10. [Gelir-Gider](#10-gelir-gider)
11. [Ayarlar](#11-ayarlar)
12. [Veri Göçü (İçe/Dışa Aktarma)](#12-veri-göçü-içedışa-aktarma)
13. [Abonelik](#13-abonelik)
14. [Sık Sorulan Sorular](#14-sık-sorulan-sorular)
15. [Gelecek Adım: Panel İçi AI Asistan](#15-gelecek-adım-panel-içi-ai-asistan)

---

## 1. SiriPlan Nedir

SiriPlan; kuaför, berber, güzellik merkezi, spa, nail salon, estetik klinik, makyaj stüdyosu, tattoo stüdyosu, diyetisyen, kaş & kirpik stüdyosu gibi randevu bazlı işletmeler için geliştirilmiş; randevu, müşteri, personel ve gelir-gider yönetimini tek panelde toplayan bir SaaS platformudur. Panel Türkçe, İngilizce, Rusça ve Arapça dillerini destekler; WhatsApp, e-posta ve Telegram üzerinden otomatik bildirim gönderir.

## 2. Kayıt, Giriş ve Deneme Süresi

- Yeni işletmeler `/auth/kayit` üzerinden kayıt olur, mevcut kullanıcılar `/auth/giris` ile panele erişir.
- Yeni kayıt olan her işletme **14 günlük ücretsiz deneme** ile başlar; bu süre boyunca tüm özellikler açıktır.
- Deneme süresi dolmadan önce Ayarlar → Abonelik bölümünden plan seçilerek ödemeye geçilir.

## 3. Ana Sayfa (Panel Özeti)

Panele giriş yapan her kullanıcı, işletmenin günlük özetini gösteren bir gösterge paneli (dashboard) ile karşılaşır. Bu ekran **kart tabanlı widget'lardan** oluşur ve her kullanıcı kendi görünümünü kişiselleştirebilir:

- **Kişiselleştir** butonu ile widget'lar sürükle-bırak yöntemiyle yeniden sıralanabilir, istenmeyen widget'lar gizlenebilir.
- Tercihler kullanıcıya özel kaydedilir (bir personelin gizlediği widget diğer kullanıcıyı etkilemez).

Standart widget'lar:

| Widget | İçerik |
|---|---|
| Aktif Randevular | Bugünün randevu sayısı ve yaklaşan randevuların canlı listesi |
| Günlük Takvim | Seçili günün saat bazlı randevu görünümü |
| WhatsApp Asistanı | WhatsApp bağlantı/bildirim durumu özeti |
| Kampanya Yıldızı | En son gönderilen kampanyanın durumu ve gönderim sayısı |
| Yeni Müşteri | Son eklenen müşteriler |
| Rapor Özeti | Günlük randevu/ciro/gider mini özeti |
| Gelir-Gider | Güncel kasa durumu |
| Hızlı İşlemler | Yeni randevu, yeni müşteri gibi kısayollar |
| Ciro Özeti | Dönemsel ciro göstergesi |
| Bugünkü Personel | Bugün çalışan personel listesi |
| Hizmet Özeti | En çok tercih edilen hizmetler |

## 4. Takvim ve Randevu Yönetimi

- **Takvim** sekmesi, tüm randevuları gün/hafta bazlı, personel renklerine göre kodlanmış bir takvim görünümünde sunar. Randevu süreleri **15 dakikalık dilimler** halinde planlanır.
- **Randevular** listesinde tüm randevular tablo halinde görüntülenir, filtrelenir ve arama yapılabilir.
- **Yeni Randevu** ekranından müşteri, hizmet, personel, tarih/saat seçilerek randevu oluşturulur; oluşturma anında müşteriye otomatik bildirim (WhatsApp/E-posta/Telegram, işletme ayarına göre) gönderilir.
- Her randevunun 5 durumu vardır:

  | Durum | Anlamı |
  |---|---|
  | Bekliyor | Müşteri/kanal üzerinden talep edildi, henüz onaylanmadı |
  | Onaylandı | İşletme tarafından onaylandı |
  | Tamamlandı | Hizmet verildi |
  | İptal | Randevu iptal edildi |
  | Gelmedi | Müşteri randevuya gelmedi (no-show) |

- Randevu detay sayfasından durum güncellenebilir, düzenlenebilir; düzenleme/iptal işlemlerinde de otomatik bildirim tetiklenir.

## 5. Müşteri Yönetimi

- **Müşteriler** listesinde tüm müşteri kayıtları, iletişim bilgileri ve geçmiş randevu sayısı görüntülenir.
- Müşteri detay sayfasında geçmiş randevular, notlar ve (etkinse) sadakat puanı bilgisi yer alır.
- **Yeni Müşteri** ekranından manuel kayıt eklenebilir; randevu oluştururken de otomatik olarak yeni müşteri kaydı açılır.

## 6. Hizmet Yönetimi

- **Hizmetler** sayfasında sunulan tüm hizmetler; kategori, süre, fiyat ve (etkinse) puan bilgisiyle listelenir.
- **Yeni Hizmet** ekranından hizmet adı, kategori, süre ve fiyat tanımlanır. Hizmet listesi randevu oluşturma ekranında ve raporlarda kullanılır.

## 7. Personel Yönetimi

- **Personel** sayfasında işletmedeki tüm personel, çalışma günleri ve takvimde kullanılan renk koduyla listelenir.
- **Personel Davet Et** akışıyla yeni personel e-posta/telefon ile panele davet edilir.
- Her personelin **rolü** (örn. sahip, yönetici, personel) ve buna bağlı **varsayılan yetkileri** vardır; gerekirse kişi bazında özel yetki override'ı tanımlanabilir (iki katmanlı yetki sistemi: rol bazlı varsayılan + kişiye özel istisna).
- Personel detay sayfasında çalışma saatleri, izinler ve panel dili tercihi (bildirimlerin hangi dilde gideceği) ayarlanır.

## 8. Kampanyalar

- **Kampanyalar** modülü, müşteri listesine toplu WhatsApp mesajı göndermeyi sağlar (doğum günü kutlaması, promosyon, hatırlatma vb.).
- Kampanya mesajlarında `{{musteri_adi}}`, `{{salon_adi}}` gibi şablon değişkenleri kullanılır.
- Her kampanyanın 5 durumu vardır: **Taslak → Planlandı → Gönderiliyor → Gönderildi**, hata durumunda **Başarısız**.

## 9. Raporlar

- **Raporlar** sayfası seçilen gün/dönem için: randevu sayısı, tamamlanan randevu sayısı, günlük ciro, günlük gider ve yeni müşteri sayısını özetler.
- Ayrıca **personel bazlı** ve **hizmet bazlı** performans kırılımları sunar (kim ne kadar ciro yaptı, hangi hizmet ne kadar satıldı).

## 10. Gelir-Gider

- **Gelir-Gider** sayfası randevu gelirlerinin yanı sıra manuel girilen gelir ve gider kalemlerini (kira, malzeme, fatura vb.) takip eder; kasa durumunu gösterir.

## 11. Ayarlar

Ayarlar sayfası birkaç alt bölümden oluşur:

- **Genel**: İşletme adı, sektör (kuaför, berber, spa, nail salon, estetik klinik vb.), çalışma günleri (Pazartesi–Pazar), logo/QR kod.
- **Bildirimler**:
  - **WhatsApp**: Randevu oluşturulunca / revize edilince / iptal edilince otomatik bildirim gönderimi ayrı ayrı açılıp kapatılabilir. Mesaj tonu **Sıcak, Kısa, Resmi, Hizmet Detaylı** seçeneklerinden seçilir. Otomatik hatırlatma zamanlaması (randevudan kaç saat/gün önce) tanımlanır.
  - **SMS**: Netgsm, VatanSMS veya İletimerkezi sağlayıcılarından biri entegre edilerek özel hatırlatma/iptal mesajları gönderilebilir.
  - **E-posta ve Telegram**: Randevu bildirimleri için ek kanal olarak kullanılabilir.
- **Yetkilendirme**: Rol bazlı ve personel bazlı yetki/izin yönetimi.
- **Abonelik**: Plan ve ödeme bilgileri (bkz. bölüm 13).

## 12. Veri Göçü (İçe/Dışa Aktarma)

- **Veri Göçü** sayfasından mevcut müşteri/randevu verileri **Excel/CSV** formatında panele aktarılabilir.
- Aynı sayfadan mevcut veriler **JSON, CSV, Excel veya PDF** olarak dışa aktarılabilir (yedekleme, muhasebe, başka bir sisteme geçiş vb. amaçlarla).

## 13. Abonelik

- Kayıt sonrası 14 günlük ücretsiz deneme başlar.
- Deneme süresi dolmadan Ayarlar → Abonelik üzerinden plan seçilip ödeme yapılarak kesintisiz kullanım sağlanır.

## 14. Sık Sorulan Sorular

**Randevu oluşturunca müşteriye otomatik mesaj gidiyor mu?**
Evet — Ayarlar → Bildirimler'de açık olan kanallara (WhatsApp/E-posta/Telegram) göre otomatik mesaj gönderilir.

**Panel dilini nasıl değiştiririm?**
Panel dört dili destekler (TR/EN/RU/AR); dil seçimi hesap/tarayıcı diline göre otomatik belirlenir, personel bazında bildirim dili ayrıca Personel sayfasından ayarlanabilir.

**Birden fazla şubem/personelim var, aynı panelden yönetebilir miyim?**
Evet, panel çoklu personel ve rol bazlı yetkilendirmeyi destekler; her personelin görebileceği/işlem yapabileceği alanlar Ayarlar → Yetkilendirme'den sınırlandırılabilir.

**Eski verilerimi (Excel) panele nasıl aktarırım?**
Veri Göçü sayfasından Excel/CSV dosyanızı yükleyerek mevcut müşteri kayıtlarınızı içe aktarabilirsiniz.

**Randevu durumları neyi ifade ediyor?**
Bekliyor (henüz onaylanmadı), Onaylandı, Tamamlandı, İptal, Gelmedi (müşteri gelmedi). Bkz. bölüm 4.

## 15. Panel İçi Yardım Asistanı

Panelde sağ altta sabit bir "Yardım" balonu bulunur (`HelpAssistant` bileşeni). Dış bir AI servisine/API anahtarına ihtiyaç duymaz — `src/app/api/dashboard-chat/route.ts` içindeki statik, anahtar kelime eşleştirmeli bir bilgi tabanından anında yanıt verir.

1. **İçerik kaynağı**: Bilgi tabanı bu kılavuzla senkron tutulmalıdır — panelde yeni bir özellik/sayfa eklendiğinde önce bu dosya, ardından `KNOWLEDGE_BASE` dizisindeki ilgili girdi güncellenir.
2. **Kapsam**: Randevu durumları, aktif/pasif personel-hizmet, widget kişiselleştirme, konum ekleme, Telegram Chat ID, online randevu linki/QR kodu, otomatik onay, müşteri dil tercihi, sadakat/puan sistemi, müşteriyi online randevudan engelleme, personel izin günleri, çalışma saatleri, KVKK metni, tema, çoklu işletme geçişi, hızlı randevu, yetki/rol ayarları, mesaj şablonları, bildirim kanalları, ödeme yöntemi/bahşiş girme, plan/ödeme özellikleri, kayıt/giriş, PWA kurulumu gibi panel genelindeki tüm pratik kullanım soruları — yalnızca yukarıdakiler değil, panelin her bölümü kapsam dahilindedir.
3. **Eşleşmeyen sorular**: Bilgi tabanında karşılığı olmayan (hesaba özel veya çok spesifik) sorularda kullanıcı doğrudan destek@siriplan.com ve WhatsApp destek hattına (+90 535 503 26 34) yönlendirilir — asistan tahmini/yanlış bilgi üretmez.
4. **Ölçüm**: Cevapsız kalan (fallback'e düşen) soru kalıpları zamanla `KNOWLEDGE_BASE`'e yeni madde olarak eklenerek kapsam genişletilebilir.
