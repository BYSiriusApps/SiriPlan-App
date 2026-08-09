-- ============================================================
-- Deneme süresi bitiş hatırlatma takibi
--
-- Mobil uygulama (App Store/Play Store) mağaza kurallarına uymak için
-- deneme süresi bitimine 2 gün kala ve bittiği gün otomatik e-posta/SMS
-- gönderen cron (/api/cron/trial-reminder) her org'a en fazla bir kez
-- gönderim yapabilsin diye bu iki "gönderildi" damgası eklenir — cron
-- günde birden fazla kez tetiklense veya pencere birden fazla günü
-- kapsasa bile tekrar gönderim olmaz (bkz. appointments.reminder_sent_at
-- ile aynı desen).
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_reminder_2d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_reminder_0d_sent_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
