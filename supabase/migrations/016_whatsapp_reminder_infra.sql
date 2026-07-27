-- ============================================================
-- 016 — WhatsApp Cloud API hatırlatma altyapısı (pg_cron + pg_net)
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp
-- ÇALIŞTIRMANIZ YETERLİ. Tüm adımlar idempotent.
--
-- Kapsam:
--   1. organizations: özel hatırlatma/iptal notu + WhatsApp bildirim anahtarı
--   2. appointments: WhatsApp hatırlatma zaman damgaları (e-posta ile
--      karışmasın diye reminder_sent_at/reminder2_sent_at'tan AYRI kolonlar)
--   3. get_due_whatsapp_reminders() — 2 saat içinde randevusu olan ve
--      henüz hatırlatma WhatsApp'ı gitmemiş randevuları döner
--   4. pg_cron + pg_net ile her 5 dakikada bir /api/whatsapp/send-template
--      endpoint'ini tetikleyen fonksiyon + zamanlanmış görev
--
-- NOT: pg_cron job'ının gerçek istek atabilmesi için app_secrets
-- tablosuna cron_secret ve app_base_url değerlerinin girilmesi gerekir.
-- Bu INSERT'ler GÜVENLİK nedeniyle bu dosyada YOK — ayrı olarak,
-- gerçek CRON_SECRET değeriyle, sohbette verilen komutla ekleyin.
-- ============================================================

-- ─── 1. organizations — özel mesaj metinleri + bildirim anahtarı ─
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS custom_reminder_message TEXT
    DEFAULT 'Lütfen randevunuza saatinde gelmeye özen gösteriniz.';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS custom_cancellation_message TEXT;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT true;

-- ─── 2. appointments — WhatsApp'a özel hatırlatma zaman damgaları ─
-- (e-posta hatırlatmasını (reminder_sent_at/reminder2_sent_at) yöneten
--  /api/cron/reminder ile karışmasın, iki kanal birbirinden bağımsız
--  işlesin diye ayrı kolon)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS wa_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS wa_reminder2_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_wa_reminder
  ON appointments(appointment_at, status, wa_reminder2_sent_at);

-- ─── 3. Yaklaşan randevuları getiren fonksiyon ───────────────────
CREATE OR REPLACE FUNCTION public.get_due_whatsapp_reminders()
RETURNS TABLE (
  appointment_id UUID,
  org_id UUID,
  salon_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  appointment_at TIMESTAMPTZ,
  custom_reminder_message TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.org_id,
    o.name,
    a.customer_name,
    a.customer_phone,
    a.appointment_at,
    o.custom_reminder_message
  FROM appointments a
  JOIN organizations o ON o.id = a.org_id
  WHERE a.status = 'onaylandi'
    AND a.wa_reminder2_sent_at IS NULL
    AND o.whatsapp_notifications_enabled IS TRUE
    AND a.customer_phone IS NOT NULL
    AND a.appointment_at BETWEEN now() AND now() + INTERVAL '2 hours'
  LIMIT 500;
$$;

-- ─── 4. pg_cron + pg_net ile otomatik tetikleme (her 5 dakika) ───
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Sırrı (cron secret) ve uygulama URL'sini DB içinde saklamak için
-- REST'e (anon/authenticated) hiç GRANT edilmeyen, sadece fonksiyon
-- içinden (postgres sahipli, SECURITY DEFINER) okunabilen basit bir
-- tablo. PostgREST varsayılan olarak grant edilmemiş tabloları dışarı
-- açmaz, bu yüzden ek bir RLS politikasına gerek yok.
CREATE TABLE IF NOT EXISTS app_secrets (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
REVOKE ALL ON app_secrets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  r RECORD;
BEGIN
  SELECT value INTO v_base_url FROM app_secrets WHERE key = 'app_base_url';
  SELECT value INTO v_secret   FROM app_secrets WHERE key = 'cron_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RETURN; -- henüz kurulum tamamlanmadı — sessizce çık
  END IF;

  FOR r IN SELECT * FROM public.get_due_whatsapp_reminders() LOOP
    PERFORM net.http_post(
      url := v_base_url || '/api/whatsapp/send-template',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object(
        'to_phone', r.customer_phone,
        'customer_name', r.customer_name,
        'salon_name', r.salon_name,
        'appointment_date', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
        'status_type', 'Hatırlatma',
        'custom_note', COALESCE(r.custom_reminder_message, 'Lütfen randevunuza saatinde gelmeye özen gösteriniz.')
      )
    );

    UPDATE appointments
      SET wa_reminder2_sent_at = now(),
          wa_reminder_sent_at = COALESCE(wa_reminder_sent_at, now())
      WHERE id = r.appointment_id;
  END LOOP;
END;
$$;

-- Eski job varsa kaldır, güncel tanımla yeniden kur (idempotent)
SELECT cron.unschedule(jobid)
  FROM cron.job WHERE jobname = 'whatsapp-reminder-5min';

SELECT cron.schedule(
  'whatsapp-reminder-5min',
  '*/5 * * * *',
  $$SELECT public.trigger_whatsapp_reminders();$$
);

-- ─── 5. PostgREST şema önbelleğini yenile ────────────────────────
NOTIFY pgrst, 'reload schema';
