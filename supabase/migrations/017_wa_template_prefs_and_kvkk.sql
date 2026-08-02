-- ============================================================
-- 017 — WhatsApp şablon stilleri + çoklu hatırlatma + KVKK onay mimarisi
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp
-- ÇALIŞTIRMANIZ YETERLİ. Tüm adımlar idempotent.
--
-- Kapsam:
--   1. organizations: amaç başına şablon stili + çoklu hatırlatma süresi + KVKK metni
--   2. appointment_reminder_log — çoklu-süre hatırlatma için idempotent gönderim kaydı
--      (016'daki wa_reminder_sent_at/wa_reminder2_sent_at kolonlarının yerini alır;
--       o kolonlar silinmiyor, sadece artık bu akışta kullanılmıyor)
--   3. customer_consents — KVKK/pazarlama onay denetim izi (sadece ekleme, hiç güncellenmez)
--   4. consent_requests — link tabanlı KVKK onayı için token tablosu
--   5. get_due_whatsapp_reminders() / trigger_whatsapp_reminders() — çoklu süre
--      (unnest) + appointment_reminder_log dedup ile yeniden tanımlanır
-- ============================================================

-- ─── 1. organizations — şablon stili, çoklu hatırlatma süresi, KVKK metni ─
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS wa_template_styles JSONB
    DEFAULT '{"onay":"sicak","iptal":"sicak","revize":"sicak","hatirlatma":"sicak"}'::jsonb;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS wa_reminder_offsets_hours INTEGER[] DEFAULT '{2}';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kvkk_notice_text TEXT;

-- 016'nın hiç çalıştırılmamış olma ihtimaline karşı (bu kolon olmadan
-- get_due_whatsapp_reminders() derlenemez) — zaten varsa no-op.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT true;

-- ─── 2. appointment_reminder_log — çoklu süre için idempotent gönderim kaydı ─
CREATE TABLE IF NOT EXISTS appointment_reminder_log (
  id SERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  offset_hours INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, offset_hours)
);
CREATE INDEX IF NOT EXISTS idx_appt_reminder_log_appt ON appointment_reminder_log(appointment_id);
REVOKE ALL ON appointment_reminder_log FROM anon, authenticated;

-- ─── 3. customer_consents — KVKK/pazarlama onay denetim izi ──────────────
CREATE TABLE IF NOT EXISTS customer_consents (
  id SERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('kvkk','marketing')),
  given BOOLEAN NOT NULL,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_channel TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  consent_text_snapshot TEXT NOT NULL,
  captured_via TEXT NOT NULL CHECK (captured_via IN ('inline_web','link','staff_attested'))
);
CREATE INDEX IF NOT EXISTS idx_customer_consents_org_phone ON customer_consents(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_customer_consents_customer ON customer_consents(customer_id);

ALTER TABLE customer_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_consents_org_select ON customer_consents;
CREATE POLICY customer_consents_org_select ON customer_consents
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ─── 4. consent_requests — link tabanlı KVKK onayı için token tablosu ────
CREATE TABLE IF NOT EXISTS consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_consent_requests_token ON consent_requests(token);
REVOKE ALL ON consent_requests FROM anon, authenticated;

-- ─── 5. Çoklu süreli hatırlatma fonksiyonları (016'nın yerini alır) ──────
-- 016'daki fonksiyon farklı bir dönüş satır tipiyle (OUT parametreleri)
-- tanımlıydı; CREATE OR REPLACE dönüş tipi değişikliğine izin vermiyor,
-- bu yüzden önce eski tanımı kaldırıyoruz (varsa).
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
  business_phone TEXT
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
    COALESCE(NULLIF(o.phone, ''), NULLIF(o.whatsapp_number, ''))
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
  v_response_id BIGINT;
BEGIN
  SELECT value INTO v_base_url FROM app_secrets WHERE key = 'app_base_url';
  SELECT value INTO v_secret   FROM app_secrets WHERE key = 'cron_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RETURN; -- henüz kurulum tamamlanmadı — sessizce çık
  END IF;

  FOR r IN SELECT * FROM public.get_due_whatsapp_reminders() LOOP
    SELECT net.http_post(
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
          'business_name', r.salon_name,
          'date', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY'),
          'time', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'HH24:MI'),
          'remaining_time', CASE
            WHEN r.offset_hours >= 24 THEN (r.offset_hours / 24) || ' gün'
            ELSE r.offset_hours || ' saat'
          END,
          'business_phone', r.business_phone
        )
      )
    ) INTO v_response_id;

    INSERT INTO appointment_reminder_log (appointment_id, offset_hours)
    VALUES (r.appointment_id, r.offset_hours)
    ON CONFLICT (appointment_id, offset_hours) DO NOTHING;
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

-- ─── 6. PostgREST şema önbelleğini yenile ────────────────────────────────
NOTIFY pgrst, 'reload schema';
