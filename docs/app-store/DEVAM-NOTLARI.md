# App Store — kaldığımız yer (30 Eylül 2026)

Durum: Apple **4. kez reddetti** (Guideline 2.3.10 + 5.2.5, "Siri" ve 3. parti platform adları).
Yeni oturumda bu dosyadan devam et.

## Yapıldı
- Web düzeltmesi main'de (PR #77/#78/#79): persistan "WhatsApp veya Instagram" metni kaldırıldı;
  iOS uygulamasında marka "SiriusPlan" (UA işaretçisi `SiriPlanApp`), canlıda doğrulandı.
- Ekran görüntüleri yeniden üretildi: `screenshots-iphone-1284x2778/` ve
  `screenshots-ipad-2064x2752/` (11'er dosya). Betik: `scripts/app-store-screenshots-capture.mjs`
  (her sayfayı WhatsApp/Instagram/Siri vb. terimlere karşı tarar).
- PR #82 (açık): iOS'ta yeşil WhatsApp benzeri ikon yerine nötr ikon, güvenlik/muhasebe düzeltmeleri.
- Itiraz mektubu taslağı: `itiraz-mektubu-4-red-taslak.md`.

## SENİN YAPACAKLARIN (sırayla)
1. **PR #82'yi merge et**, deploy'u bekle.
2. **Migration çalıştırıldı** (`20260930_revert_auto_income_on_uncomplete.sql`) — tamam.
3. **Demo veri temizliği** (Sirius Demo Güzellik Salonu): `node scripts/_tmp/cleanup_bysiri.mjs`
   ("Bysiri" hizmeti + 2 randevu + 4 gelir satırı siler). Yapılmadı.
   Ayrıca "Zamanlanmış Test Kampanya" adını değiştir/sil (ana sayfa iPad görselinde "Test" görünüyor).
4. **`app-store-10-randevular` ve `app-store-12-raporlar` (iPhone + iPad) görsellerini YÜKLEME**
   — içlerinde "Bysiri" (= "siri") var, 5.2.5 riski. Temizlikten sonra betiği yeniden çalıştır
   (bayraksız): `node scripts/app-store-screenshots-capture.mjs` → sayfalar temiz çıkar.
   Temizlik yapılmayacaksa bu 4 dosyayı klasörden sil, geri kalan 9'ar görselle devam et.
5. **`siriplan-ios` reposu** (bu klasörde yok): `Info.plist` → `CFBundleDisplayName` = "SiriusPlan",
   build numarasını artır, yeni build yükle. Repo yolunu/erişimi yeni oturumda ver.
6. **App Store Connect**: uygulama adı/subtitle/anahtar kelimelerde "Siri" geçen her yeri "SiriusPlan"
   yap; yeni ekran görüntülerini yükle; Resolution Center'a kısa yanıt + resubmit.
7. Telefondan doğrula: RU/AR test mesajlarındaki konum bağlantısı Google Haritalar'ı açıyor mu.

## Bilinen açık noktalar
- Bekleyen İstekler sayfası ekran görüntüsüne alınmadı ("WhatsApp" kaynak etiketi + uyarı metni).
- `/api/import` hizmet upsert'i `org_id,name` benzersiz kısıtına dayanıyor, DB'de yok — test edilmedi.
- Paketle kapanan randevu geri alınıp normal ödemeyle tamamlanırsa fiyat 0 kalıyor (tasarım gerekir).
- Meta'dan silinen `personel_kritik_stok`/`staff_low_stock_alert`: kritik stok bildirimi Telegram +
  serbest metin yedeğiyle gidiyor.
