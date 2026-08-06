-- ============================================================
-- Müşterilere SMS bildirimi altyapısı (sağlayıcıdan bağımsız).
-- Salon hangi SMS sağlayıcısını (Netgsm, VatanSMS, İletimerkezi...)
-- seçerse seçsin, aynı alan seti kullanılır — kod tarafında
-- sms_provider değerine göre dispatch edilir (bkz. src/lib/sms.ts).
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_provider TEXT,
  ADD COLUMN IF NOT EXISTS sms_username TEXT,
  ADD COLUMN IF NOT EXISTS sms_password TEXT,
  ADD COLUMN IF NOT EXISTS sms_sender_id TEXT;

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_sms_provider_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_sms_provider_check
  CHECK (sms_provider IS NULL OR sms_provider IN ('netgsm', 'vatansms', 'iletimerkezi'));

NOTIFY pgrst, 'reload schema';
