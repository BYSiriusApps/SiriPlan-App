# App Store — kaldığımız yer (30 Eylül 2026, akşam)

Durum: Apple **4. kez reddetti** (Guideline 2.3.10 + 5.2.5, "Siri" ve 3. parti platform adları).
Yeni oturumda bu dosyadan devam et.

## Tamamlananlar
- Web düzeltmesi main'de (PR #77-79): persistan "WhatsApp veya Instagram" metni kaldırıldı;
  iOS uygulamasında marka "SiriusPlan" (UA işaretçisi `SiriPlanApp`), canlıda doğrulandı (iPad kenar çubuğu "SİRİUSPLAN").
- PR #81 ve #82 main'e merge edildi (iOS'ta nötr ikon, çift sayım düzeltmesi, güvenlik/muhasebe, RU/AR WA).
- Migration `20260930_revert_auto_income_on_uncomplete.sql` canlıda çalıştırıldı.
- Demo "Bysiri" randevuları iptal edildi (kayıtlar silinmedi, "İptal" olarak listede duruyor).
- Ekran görüntüleri güncel: `screenshots-iphone-1284x2778/` ve `screenshots-ipad-2064x2752/` (10'ar dosya:
  01 anasayfa, 02 takvim, 04 musteriler, 05 hizmetler, 06 personel, 07 stok, 08 kampanyalar,
  09 paketler, 10 randevular, 12 raporlar). `02-takvim` PERSONEL bazlı takvim (betik her çalıştırmada Personel
  görünümünü seçip doğruluyor); Ay görünümü görseli kaldırıldı (kullanıcı Personel istedi).
  Görsellerde "Bysiri"/WhatsApp/Instagram/Siri **görünmüyor** (gözle doğrulandı). `10-randevular` sayfa metninde
  hâlâ iptal edilmiş "Bysiri" satırı var ama listenin altında, görüntüye girmiyor.
- Kampanya geçmişinde TASLAK satırlarına silme düğmesi eklendi (`DELETE /api/campaigns/[id]`, yalnızca draft,
  `manage_campaigns` izni + org_id kapsamı).

## SENİN YAPACAKLARIN
(Hepsi tamamlandı — aşağıdaki 1 Ekim güncellemesine bak. Apple sonucu bekleniyor.)

## Bilinen açık noktalar
- `/api/import` hizmet içe aktarımı ÇALIŞMIYOR (benzersiz kısıt yok) — bkz. GELISTIRME-LISTESI.md §11.
- Paketle kapanan randevu geri alınıp normal ödemeyle tamamlanırsa fiyat 0 kalıyor (tasarım gerekir).
- `iPad randevular` görselinde bir müşterinin telefonu test numarası (05553287509) görünüyor — demo veri, sorun değil.
- Meta'dan silinen `personel_kritik_stok`/`staff_low_stock_alert`: kritik stok bildirimi Telegram + serbest metin yedeğiyle gidiyor.

## GÜNCELLEME — 30 Eylül 2026, ~20:12: 4. RED SONRASI YENİDEN GÖNDERİLDİ
- siriplan-ios: Info.plist (CFBundleDisplayName + izin metinleri = SiriusPlan), build 3, yazısız ikon + LaunchIcon
  (hazır dosyalar: `docs/app-store/ios-build-3/`) GitHub'a yüklendi, Codemagic #11 ile build 3 TestFlight'a işlendi.
- ASC: Name=SiriusPlan, Description/Notes güncellendi (WhatsApp/Instagram metadata'dan çıkarıldı, Notes'ta entegrasyon açıklaması duruyor),
  10'ar iPhone/iPad görseli yüklendi, build 3 seçildi, Resolution Center'a yanıt yazıldı.
- Durum: iOS Submission "Waiting for Review" (Build 1.0 (3)). Sonuç bekleniyor.
- Sıradaki (Apple onaylarsa): sürüm otomatik yayınlanacak şekilde ayarlı (Automatically release).
- Sonra yapılacaklar (acil değil): GELISTIRME-LISTESI.md §11.

## GÜNCELLEME — 1 Ekim 2026
- Taslak kampanya silme + "Bysiri" temizliği artık gerekmiyor (görsellerde görünmüyor, iPad görselleri zaten yüklü). Listeden çıkarıldı.
- Bekleyen İstekler görseli gerek görülmedi, listeden çıkarıldı.
- Beklenen: Apple incelemesi (Build 1.0 (3)).

## SONUÇ — 3 Ekim 2026: ONAYLANDI
- Apple "Review of your SiriusPlan (iOS) submission is complete" e-postası geldi (17:18): sürüm 1.0 (build 3) dağıtıma uygun,
  otomatik yayın açık. Mağaza: https://apps.apple.com/app/siriusplan/id6815322807
- App Store süreci KAPANDI. Kalan küçük işler: GELISTIRME-LISTESI.md §11.
