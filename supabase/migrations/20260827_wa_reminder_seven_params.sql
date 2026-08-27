-- ============================================================
-- 20260827 — WhatsApp hatırlatma cron'unu Meta'nın "randevu_hatirlatma_*"
-- şablon şekliyle (7 gövde parametresi) yeniden eşitler + 20260824/20260825
-- ile geri gelen iki regresyonu düzeltir.
--
-- SORUN 1 (kullanıcı bildirdi — (#132000)):
--   Meta'daki randevu_hatirlatma_1 / randevu_hatirlatma_2 şablonlarının
--   gövdesi 7 parametre bekliyor:
--     Sayın {{1}}, {{2}} işletmesindeki randevunuza {{3}} kaldı.
--     Tarih: {{4}} / Saat: {{5}}
--     Sorunuz olursa {{6}} numarasından bize ulaşabilirsiniz.
--     Konum bilgisine {{7}} bağlantısından ulaşabilirsiniz.
--   20260824/20260825'teki trigger_whatsapp_reminders() ise vars'a yalnızca
--   {customer_name, date, time} koyuyordu → send.ts registry'den 4 parametre
--   üretiyor, Meta 7 beklediği için mesaj hiç gitmiyordu. (registry.ts +
--   send.ts bu commit'te 7 parametreye çıkarıldı; burada cron gövdesi de
--   business_name / remaining_time / business_phone taşıyacak şekilde
--   güncelleniyor — location_link'i send.ts org kaydından dolduruyor.)
--
-- SORUN 2 (regresyon — 20260814'te düzeltilmişti, 20260825 geri getirdi):
--   get_due_whatsapp_reminders() penceresi tekrar
--   "appointment_at BETWEEN now() AND now() + off.h" idi → off.h'den kısa
--   mühletle alınan randevularda rezervasyon onayından hemen sonra
--   "randevunuza X kaldı" mesajı gidiyordu. Pencere yine randevuya kalan
--   sürenin gerçekten off.h'ye yaklaştığı 15 dk'lık dilime sıkılaştırıldı.
--
-- SORUN 3 (regresyon — 017'de doğruydu, 20260824/20260825 kaldırdı):
--   trigger_whatsapp_reminders() gönderim sonrası appointment_reminder_log'a
--   YAZMIYORDU; oysa dedup guard'ı (l.id IS NULL) o tabloya bakıyor →
--   aynı hatırlatma her 5 dk'da bir yeniden gönderilebiliyordu. Log INSERT'i
--   geri eklendi (appointments.wa_reminder*_sent_at kolonları geriye dönük
--   uyumluluk için yine güncelleniyor).
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRIN.
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
    -- Hatırlatma yalnızca randevuya kalan süre GERÇEKTEN off.h'ye yaklaştığında
    -- (5 dk'lık cron aralığına karşı 15 dk pay ile) gider — off.h'den kısa
    -- mühletle alınan randevular bu pencereye hiç girmez (bkz. SORUN 2).
    AND a.appointment_at <= now() + (off.h || ' hours')::interval
    AND a.appointment_at >  now() + (off.h || ' hours')::interval - INTERVAL '15 minutes'
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
        'cancel_token', r.cancel_token,
        'vars', jsonb_build_object(
          'customer_name', r.customer_name,
          'business_name', r.salon_name,
          'date', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY'),
          'time', to_char(r.appointment_at AT TIME ZONE 'Europe/Istanbul', 'HH24:MI'),
          'remaining_time', CASE
            WHEN r.offset_hours >= 24 AND r.offset_hours % 24 = 0
              THEN (r.offset_hours / 24) || ' gün'
            ELSE r.offset_hours || ' saat'
          END,
          'business_phone', COALESCE(r.business_phone, '')
        )
      )
    );

    INSERT INTO appointment_reminder_log (appointment_id, offset_hours)
    VALUES (r.appointment_id, r.offset_hours)
    ON CONFLICT (appointment_id, offset_hours) DO NOTHING;

    UPDATE appointments
      SET wa_reminder2_sent_at = now(),
          wa_reminder_sent_at = COALESCE(wa_reminder_sent_at, now())
      WHERE id = r.appointment_id;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
