-- ============================================================
-- 20260814 — Zamanlanmış kampanya gönderim tetikleyicisi (pg_cron + pg_net)
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRIN.
-- İdempotenttir, tekrar çalıştırılabilir.
--
-- Vercel (Hobby plan) cron'ları günde bir kez çalışıyor, bu yüzden
-- "Gönderim Tarihi" seçilen kampanyaların dakika hassasiyetinde otomatik
-- gönderilmesi için 016_whatsapp_reminder_infra.sql'deki pg_cron + pg_net
-- deseni tekrar kullanılıyor: app_secrets tablosundaki app_base_url ve
-- cron_secret DEĞERLERİ zaten o migration'la kurulu olduğundan burada
-- tekrar girilmesine gerek yok.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_campaign_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
BEGIN
  SELECT value INTO v_base_url FROM app_secrets WHERE key = 'app_base_url';
  SELECT value INTO v_secret   FROM app_secrets WHERE key = 'cron_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RETURN; -- kurulum tamamlanmadıysa sessizce çık
  END IF;

  -- Zamanı gelmiş kampanya var mı diye her seferinde sorgu atmak yerine
  -- doğrudan endpoint'i tetikliyoruz; asıl sorgu ve döngü Next.js tarafında
  -- (/api/cron/campaigns) tek seferde yapılıyor.
  PERFORM net.http_post(
    url := v_base_url || '/api/cron/campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.unschedule(jobid)
  FROM cron.job WHERE jobname = 'campaign-scheduler-5min';

SELECT cron.schedule(
  'campaign-scheduler-5min',
  '*/5 * * * *',
  $$SELECT public.trigger_campaign_scheduler();$$
);

NOTIFY pgrst, 'reload schema';
