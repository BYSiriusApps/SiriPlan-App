-- ============================================================
-- 20260824 — pg_cron hatırlatma tetikleyicisine appointment_at ekler.
--
-- SEBEP: /api/whatsapp/send-template artık "onay"/"hatirlatma" için
-- appointment_at ISO zaman damgasını görürse randevu saati geçmişse
-- (5 dk toleransla) mesajı atlıyor (bkz. src/lib/wa-templates/send.ts
-- PAST_APPOINTMENT_GRACE_MS). get_due_whatsapp_reminders() penceresi
-- zaten çoğunlukla geçmiş randevuları eledi (migration 20260814), ama
-- appointment_at gövdede taşınmadığı için bu son savunma satırı
-- devreye giremiyordu — burada eklenir.
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRIN.
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
        'appointment_at', r.appointment_at,
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

NOTIFY pgrst, 'reload schema';