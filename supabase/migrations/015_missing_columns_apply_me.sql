-- ============================================================
-- 015 — CANLI VERİTABANINDA EKSİK KALAN HER ŞEY (TEK DOSYA)
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp
-- ÇALIŞTIRMANIZ YETERLİ. Tüm adımlar idempotent — daha önce
-- uygulanmış kısımlar varsa güvenle tekrar çalışır.
--
-- Kapsam:
--   1. 009/014 — staff.preferred_language (canlıda EKSİK, personel
--      ekleme bu yüzden patlıyordu)
--   2. staff.color — takvimde personel bazlı kalıcı renk
--      (salon sahibi özelleştirebilir; boşsa uygulama otomatik atar)
--   3. customers.preferred_language — online randevu sayfası, müşterinin
--      daha önce seçtiği dilde açılabilsin diye
--   4. PostgREST şema önbelleği yenileme
--
-- Not: Deneme süresi varsayılanı (trial_ends_at) artık ayrı dosyada —
-- bkz. 20260806_trial_14_days_default.sql (14 gün). Bu dosyada eskiden
-- yer alan 7 günlük adım, o dosyayla çakışmaması için kaldırıldı.
-- ============================================================

-- ─── 1. preferred_language (009 + 014) ───────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_preferred_language_check;
ALTER TABLE staff ADD CONSTRAINT staff_preferred_language_check
  CHECK (preferred_language IS NULL OR preferred_language IN ('tr', 'en', 'ru', 'ar'));

-- ─── 2. Personel rengi (takvim görünümü için) ────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_color_check;
ALTER TABLE staff ADD CONSTRAINT staff_color_check
  CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$');

-- ─── 3. Müşteri tercih ettiği dil (online randevu sayfası) ───
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_preferred_language_check;
ALTER TABLE customers ADD CONSTRAINT customers_preferred_language_check
  CHECK (preferred_language IS NULL OR preferred_language IN ('tr', 'en', 'ru', 'ar'));

-- ─── 4. PostgREST şema önbelleğini yenile ────────────────────
NOTIFY pgrst, 'reload schema';
