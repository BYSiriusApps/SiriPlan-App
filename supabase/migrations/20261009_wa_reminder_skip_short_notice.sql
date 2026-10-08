-- ============================================================
-- 20261009 — "1 gün önce" hatırlatması, randevu 1 günden az bir süre
-- önce (hatırlatma anına 12 saatten az kala) alındıysa GİTMEZ.
--
-- Örnek: ayın 8'i 08:00'de ayın 9'u 10:00'a randevu alınırsa 1 gün
-- önce anı 8'i 10:00'dur — müşteri 2 saat önce zaten onay mesajını
-- almıştır, tekrar "randevunuza 1 gün kaldı" demek gereksiz.
-- Kural: offset >= 24 saat olan hatırlatmalar için randevu kaydı
-- (created_at) hatırlatma anından en az 12 saat ÖNCE oluşturulmuş olmalı.
-- 2 saat hatırlatması etkilenmez. get_due_whatsapp_reminders() dışında
-- bir şey değişmedi (20260827 gövdesi + tek ek koşul).
-- Supabase SQL Editor'e yapıştırıp ÇALIŞTIRIN.
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
    AND a.appointment_at <= now() + (off.h || ' hours')::interval
    AND a.appointment_at >  now() + (off.h || ' hours')::interval - INTERVAL '15 minutes'
    -- Gün öncesi hatırlatma: randevu hatırlatma anından en az 12 saat önce alınmış olmalı
    AND (off.h < 24
         OR a.created_at <= a.appointment_at - (off.h || ' hours')::interval - INTERVAL '12 hours')
  LIMIT 500;
$$;

NOTIFY pgrst, 'reload schema';
