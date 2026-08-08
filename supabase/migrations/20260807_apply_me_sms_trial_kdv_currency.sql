-- ============================================================
-- CANLI VERİTABANINDA EKSİK KALAN 3 MIGRATION (TEK DOSYA)
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp
-- ÇALIŞTIRMANIZ YETERLİ. Tüm adımlar idempotent — daha önce
-- uygulanmış kısımlar varsa güvenle tekrar çalışır.
--
-- Kapsam (kronolojik sırayla, ayrı dosyalardan birleştirildi):
--   1. 20260806_sms_notifications.sql — SMS bildirim altyapısı
--      (sağlayıcıdan bağımsız: netgsm/vatansms/iletimerkezi)
--   2. 20260806_trial_14_days_default.sql — deneme süresi varsayılanı 14 gün
--   3. 20260807_kdv_settings.sql — KDV hesaplama ayarları
--   4. 20260807_services_currency.sql — hizmet bazında para birimi (TRY/USD/EUR)
-- ============================================================

-- ─── 1. SMS bildirim altyapısı ───────────────────────────────
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

-- ─── 2. Deneme süresi varsayılanı — 14 gün ───────────────────
ALTER TABLE organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '14 days');

-- ─── 3. KDV hesaplama ayarları ────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kdv_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kdv_rate NUMERIC DEFAULT 20;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_kdv_rate_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_kdv_rate_check
  CHECK (kdv_rate >= 0 AND kdv_rate <= 100);

-- ─── 4. Hizmet bazında para birimi ────────────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY';

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_currency_check;
ALTER TABLE services ADD CONSTRAINT services_currency_check
  CHECK (currency IN ('TRY', 'USD', 'EUR'));

-- ─── 5. PostgREST şema önbelleğini yenile ────────────────────
NOTIFY pgrst, 'reload schema';
