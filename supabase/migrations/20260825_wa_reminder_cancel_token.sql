-- ============================================================
-- 20260825 — pg_cron hatırlatma tetikleyicisine cancel_token ekler.
--
-- SEBEP: Müşterinin WhatsApp'taki "Detayları görüntüle" butonuna tıkladığında
-- siriplan.com yerine kendi randevu detay sayfasına (/randevu/[token]) yönlenmesi
-- için /api/whatsapp/send-template çağrısına cancel_token da eklenmelidir.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_due_whatsapp_reminders();

CREATE OR REPLACE FUNCTION public.get_due_whatsapp_reminders()
RETURNS TABLE (
  appointment_id UUID,
  org_id UUID,
  offset_hours INTEGER,
  salon_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  appointment_at TIMESTAMPTZ,
  style TEXT,
  business_phone TEXT,
  cancel_token TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.org_id,
    off.h,
    o.name,
    a.customer_name,
    a.customer_phone,
    a.appointment_at,
    COALESCE(o.wa_template_styles->>'hatirlatma', 'sicak'),
    COALESCE(NULLIF(o.phone, ''), NULLIF(o.whatsapp_number, '')),
    a.cancel_token
  FROM appointments a
  JOIN organizations o ON o.id = a.org_id
  CROSS JOIN LATERAL unnest(o.wa_reminder_offsets_hours) AS off(h)
  LEFT JOIN appointment_reminder_log l
    ON l.appointment_id = a.id AND l.offset_hours = off.h
  WHERE a.status = 'onaylandi'
    AND l.id IS NULL
    AND o.whatsapp_notifications_enabled IS TRUE
    AND a.customer_phone IS NOT NULL
    AND a.appointment_at BETWEEN now() AND now() + (off.h || ' hours')::interval
  LIMIT 500;
$$;

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
        'org_id', r.org_id,
        'purpose', 'hatirlatma',
        'appointment_at', r.appointment_at,
        'cancel_token', r.cancel_token,
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
