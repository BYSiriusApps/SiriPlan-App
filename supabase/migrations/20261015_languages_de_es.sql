-- ============================================================
-- Almanca (de) ve İspanyolca (es) dil desteği
-- ============================================================
-- staff.preferred_language ve customers.preferred_language kolonları bir CHECK
-- kısıtıyla ('tr','en','ru','ar') ile sınırlıydı. Bu migration uygulanmadan önce
-- uygulama de/es yazarsa veritabanı reddeder → randevu/profil kaydı hata verir.
--
-- ÖNEMLİ: Bu dosya de/es'li kod canlıya alınmadan ÖNCE Supabase SQL Editor'de
-- elle çalıştırılmalıdır. Kısıtı yalnızca GENİŞLETİR (mevcut tr/en/ru/ar
-- kayıtları geçerliliğini korur); veri silmez/değiştirmez. Tekrar çalıştırmak güvenlidir.

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_preferred_language_check;
ALTER TABLE staff ADD CONSTRAINT staff_preferred_language_check
  CHECK (preferred_language IS NULL OR preferred_language IN ('tr', 'en', 'ru', 'ar', 'de', 'es'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_preferred_language_check;
ALTER TABLE customers ADD CONSTRAINT customers_preferred_language_check
  CHECK (preferred_language IS NULL OR preferred_language IN ('tr', 'en', 'ru', 'ar', 'de', 'es'));

NOTIFY pgrst, 'reload schema';
