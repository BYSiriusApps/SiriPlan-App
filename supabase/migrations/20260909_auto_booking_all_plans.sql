-- ============================================================
-- 20260909 — Online randevu otomatik onayı TÜM planlarda + varsayılan AÇIK
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRMANIZ
-- yeterlidir. İdempotenttir.
--
-- Önceki durum: `has_auto_booking` kolonu DEFAULT false idi ve ayarlar
-- sayfasında yalnızca Pro/Business planlara gösteriliyordu. Starter'da
-- randevu linkinden gelen randevular kod içinde zaten otomatik onaylanıyordu
-- ama salon bunu göremiyor/kapatamıyordu; Pro/Business ise varsayılan olarak
-- "manuel onay kuyruğu"nda başlıyordu.
--
-- Yeni durum: otomatik onay her planda açık, kutu varsayılan işaretli.
-- Salon isterse Ayarlar → "Online randevuları otomatik onayla" kutusunu
-- kapatır; o zaman randevular "talep" kuyruğuna düşer ve salona bildirim gider.
-- ============================================================

-- 1. Yeni işletmeler otomatik onaylı başlasın
ALTER TABLE organizations ALTER COLUMN has_auto_booking SET DEFAULT true;

-- 2. Mevcut işletmeler: kimse bu kutuyu bilinçli KAPATMADI (Starter'da hiç
--    görünmüyordu, Pro/Business'ta ise varsayılan kapalıydı ama bu bir tercih
--    değil kurulum eksikliğiydi). Hepsini aç — randevu linki deneyimi tüm
--    salonlarda "anında onay" olsun. Bekletmek isteyen tek tıkla kapatır.
UPDATE organizations SET has_auto_booking = true WHERE has_auto_booking IS DISTINCT FROM true;

NOTIFY pgrst, 'reload schema';
