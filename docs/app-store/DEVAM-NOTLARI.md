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

## YAPILACAK — Sonraki iOS sürümünde Review Notes'a eklenecek (4 Ekim 2026)
Uygulama içi kayıt eklendi (PR: feat/uygulama-ici-kayit; yeni build GEREKMEZ, canlı web). Yayında olan sürüm
(1.0 build 3) kilitli olduğu için Notes şimdi düzenlenemiyor. Bir sonraki sürüm gönderilirken (sol menü iOS App yanındaki "+")
App Review Information → Notes alanının sonuna şunu ekle:

```
In-app registration (new): The login screen now has a "Kayıt olun" (Sign up) link. It only creates a free 14-day trial account (name, business, email, phone, password). There is NO pricing, plan selection or payment anywhere in the app. Subscriptions are B2B and purchased/managed outside the app on our website (Guideline 3.1.3(c) Enterprise Services); the app contains no purchase buttons, links or calls to action. Account deletion is available in-app: Settings > "Delete my account" (Guideline 5.1.1(v)). Privacy Policy / Terms / KVKK links on the sign-up form open inside the app.
```
Ayrıca ASC → App Privacy: ad, e-posta, telefon toplandığı işaretli mi kontrol et.
Play Console tarafı kontrol edildi: Veri güvenliği formu uygun (kullanıcı adı+şifre, ad, e-posta, adres, telefon işaretli), değişiklik gerekmedi.

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

## GÜNCELLEME — 10 Ekim 2026: SÜRÜM 1.1 (build 4) TASLAK — GÖNDERİLMEYECEK, iOS PUSH BEKLİYOR
- siriplan-ios: `src/SiriPlan.xcodeproj/project.pbxproj` içinde `CURRENT_PROJECT_VERSION` 3→4 (Debug+Release, her blokta 2'şer satır),
  `MARKETING_VERSION` 1→1.1. Codemagic #13 ile build 4 TestFlight'a işlendi ("1.1 (4)").
- App Store Connect: iOS App Version 1.1 **Prepare for Submission** (taslak). Türkçe + English (U.S.) metinleri, görseller
  (iPhone için 1206×2622 / 1179×2556 yeniden boyutlu set; iPad 2064×2752) ve Notes ("In-app registration…" metni) girildi. **Add for Review'a BASILMADI.**
- Neden bekliyor: iOS kabuğu WKWebView → Web Push desteklemez. Kabukta `FirebaseApp.configure()` / `registerForRemoteNotifications()` yorum satırında,
  `GoogleService-Info.plist` PWABuilder boş şablonu (API_KEY 0000…, BUNDLE_ID com.microsoft.pwabuilder-ios). `Entitlements.plist`'te `aps-environment=production` var,
  `Info.plist`'te `UIBackgroundModes: remote-notification` var. Yani: Firebase iOS uygulaması + APNs anahtarı (.p8) + kabuk kodu + sunucuda cihaz-token tablosu/endpoint
  ve `sendPushToOrg` içinde FCM gönderimi gerekiyor. Push bitince build 5 çıkar; taslakta build 4 yerine 5 seçilir; What's New'e push satırı geri eklenir.
- What's New (TR/EN) hazır; push satırı yalnızca push çalışınca eklenecek.
- Demo hesap (`sahip.demo@siriplan.com`) kayıtlı dili **Türkçe** (10 Eki doğrulandı). Ekran görüntüsü betiği: `SCREENSHOT_LANG=en node scripts/app-store-screenshots-capture.mjs`
  — çıkışta dili Türkçe'ye geri alır; İngilizce çekimden sonra mutlaka kontrol et.
- İngilizce görseller: `screenshots-iphone-1284x2778-en/`, `screenshots-ipad-2064x2752-en/` (1206/1179 boyutlular 1284'ten yeniden boyutlanır, repoda tutulmadı).
