-- ============================================================
-- KDV (vergi) hesaplama ayarları — Pro planında vaat edilip
-- kodda karşılığı olmayan "KDV hesaplama" özelliğini gerçek
-- kılmak için organizations'a oran/aç-kapa alanları ekleniyor.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kdv_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kdv_rate NUMERIC DEFAULT 20;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_kdv_rate_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_kdv_rate_check
  CHECK (kdv_rate >= 0 AND kdv_rate <= 100);

NOTIFY pgrst, 'reload schema';
