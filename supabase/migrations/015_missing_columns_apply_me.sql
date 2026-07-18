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
--   3. PostgREST şema önbelleği yenileme
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

-- ─── 3. PostgREST şema önbelleğini yenile ────────────────────
NOTIFY pgrst, 'reload schema';
