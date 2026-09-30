# App Store — kaldığımız yer (30 Eylül 2026, akşam)

Durum: Apple **4. kez reddetti** (Guideline 2.3.10 + 5.2.5, "Siri" ve 3. parti platform adları).
Yeni oturumda bu dosyadan devam et.

## Tamamlananlar
- Web düzeltmesi main'de (PR #77-79): persistan "WhatsApp veya Instagram" metni kaldırıldı;
  iOS uygulamasında marka "SiriusPlan" (UA işaretçisi `SiriPlanApp`), canlıda doğrulandı (iPad kenar çubuğu "SİRİUSPLAN").
- PR #81 ve #82 main'e merge edildi (iOS'ta nötr ikon, çift sayım düzeltmesi, güvenlik/muhasebe, RU/AR WA).
- Migration `20260930_revert_auto_income_on_uncomplete.sql` canlıda çalıştırıldı.
- Demo "Bysiri" randevuları iptal edildi (kayıtlar silinmedi, "İptal" olarak listede duruyor).
- Ekran görüntüleri güncel: `screenshots-iphone-1284x2778/` ve `screenshots-ipad-2064x2752/` (11'er dosya:
  01 anasayfa, 02 takvim, 03 takvimay, 04 musteriler, 05 hizmetler, 06 personel, 07 stok, 08 kampanyalar,
  09 paketler, 10 randevular, 12 raporlar). `03-takvimay` artık gerçekten Ay görünümü (betik tıklamayı doğruluyor).
  Görsellerde "Bysiri"/WhatsApp/Instagram/Siri **görünmüyor** (gözle doğrulandı). `10-randevular` sayfa metninde
  hâlâ iptal edilmiş "Bysiri" satırı var ama listenin altında, görüntüye girmiyor.
- Kampanya geçmişinde TASLAK satırlarına silme düğmesi eklendi (`DELETE /api/campaigns/[id]`, yalnızca draft,
  `manage_campaigns` izni + org_id kapsamı).

## SENİN YAPACAKLARIN (sırayla)
1. Bu dalın PR'ını merge et, deploy'u bekle; Kampanyalar → Kampanya Geçmişi'nde
   "Zamanlanmış Test Kampanya" taslağını yeni çöp kutusu düğmesiyle sil. Sonra `01-anasayfa` iPad görselini
   yeniden çek (iPad ana sayfada "Test Kampanya" görünüyor): `SCREENSHOT_ONLY=anasayfa node scripts/app-store-screenshots-capture.mjs`
2. (İsteğe bağlı, daha temiz) `node scripts/_tmp/cleanup_bysiri.mjs` — iptal edilen "Bysiri" randevularını/gelirlerini kalıcı siler.
   Bu yapılırsa `randevular` taraması da temiz çıkar.
3. `siriplan-ios` reposu (bu klasörde yok): `Info.plist` → `CFBundleDisplayName` = "SiriusPlan",
   build numarasını artır, yeni build yükle. Repo yolunu/erişimi yeni oturumda ver.
4. App Store Connect: uygulama adı/subtitle/anahtar kelimelerde "Siri" geçen her yeri "SiriusPlan" yap;
   yeni ekran görüntülerini yükle; Resolution Center'a kısa yanıt + resubmit.
5. Telefondan doğrula: RU/AR test mesajlarındaki konum bağlantısı Google Haritalar'ı açıyor mu.

## Bilinen açık noktalar
- Bekleyen İstekler sayfası ekran görüntüsüne alınmadı ("WhatsApp" kaynak etiketi + uyarı metni, kodda sabit).
- `/api/import` hizmet upsert'i `org_id,name` benzersiz kısıtına dayanıyor, DB'de yok — test edilmedi.
- Paketle kapanan randevu geri alınıp normal ödemeyle tamamlanırsa fiyat 0 kalıyor (tasarım gerekir).
- `iPad randevular` görselinde bir müşterinin telefonu test numarası (05553287509) görünüyor — demo veri, sorun değil.
- Meta'dan silinen `personel_kritik_stok`/`staff_low_stock_alert`: kritik stok bildirimi Telegram + serbest metin yedeğiyle gidiyor.
