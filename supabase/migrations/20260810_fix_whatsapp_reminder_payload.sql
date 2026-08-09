-- ============================================================
-- 20260810 — WhatsApp hatırlatma cron'unun gönderdiği payload'ı
-- /api/whatsapp/send-template rotasının GERÇEK sözleşmesiyle eşitler.
--
-- SORUN (doğrulandı): migration 016'daki trigger_whatsapp_reminders()
-- fonksiyonu {to_phone, customer_name, salon_name, appointment_date,
-- status_type, custom_note} gövdesi gönderiyordu. Ama route.ts (tek
-- doğru kaynak: sendPurposeTemplate) {to_phone, org_id, purpose, vars}
-- bekliyor — eşleşmeyen alanlar 400 ile reddediliyordu. pg_net'in
-- yanıtı kontrol edilmediği için appointments.wa_reminder_sent_at yine
-- de "gönderildi" olarak işaretleniyor, mesaj hiç gitmiyordu.
-- Kanıt: appointments.wa_reminder_sent_at şu ana kadar TÜM kayıtlarda
-- NULL (2026-08-10 itibarıyla üretimde doğrulandı).
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRIN.
-- Ayrıca: app_secrets.cron_secret değerinin Vercel'deki production
-- CRON_SECRET ortam değişkeniyle BİREBİR aynı olduğunu doğrulayın —
-- farklıysa bu fonksiyon her tetiklemede 401 alır (ayrı bir olası
-- arıza noktası, bu migration bunu düzeltmez).
-- ============================================================

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
    RETURN; -- kurulum tamamlanmadı — sessizce çık
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
        'org_id', r.org_id,
        'purpose', 'hatirlatma',
        'vars', jsonb_build_object(
          'customer_name', r.customer_name,
          'date', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY'),
          'time', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'HH24:MI')
        )
      )
    );

    UPDATE appointments
      SET wa_reminder2_sent_at = now(),
          wa_reminder_sent_at = COALESCE(wa_reminder_sent_at, now())
      WHERE id = r.appointment_id;
  END LOOP;
END;
$$;

-- Job kaydı olmayabilir (016'nın cron.schedule adımı hiç çalışmamış
-- olabilir) — güvenlik için idempotent şekilde yeniden kur.
SELECT cron.unschedule(jobid)
  FROM cron.job WHERE jobname = 'whatsapp-reminder-5min';

SELECT cron.schedule(
  'whatsapp-reminder-5min',
  '*/5 * * * *',
  $$SELECT public.trigger_whatsapp_reminders();$$
);

NOTIFY pgrst, 'reload schema';
