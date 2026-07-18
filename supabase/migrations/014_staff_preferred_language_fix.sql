-- ============================================================
-- 014 — preferred_language hotfix
--
-- SORUN: 009 migration'ı canlı veritabanına uygulanmamış;
-- personel eklerken PostgREST "Could not find the
-- 'preferred_language' column of 'staff' in the schema cache"
-- hatası veriyordu.
--
-- Bu dosya kolonu (yoksa) ekler ve PostgREST şema önbelleğini
-- yeniler. 009 daha önce çalıştırıldıysa da güvenle çalışır.
-- ============================================================

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

-- Geçersiz değerleri engelle (NULL = tercih yok, org/tarayıcı diline düşer)
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_preferred_language_check;
ALTER TABLE staff ADD CONSTRAINT staff_preferred_language_check
  CHECK (preferred_language IS NULL OR preferred_language IN ('tr', 'en', 'ru', 'ar'));

-- PostgREST'in yeni kolonu hemen görmesi için şema önbelleğini yenile
NOTIFY pgrst, 'reload schema';
