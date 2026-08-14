-- ============================================================
-- 20260814 — WhatsApp hatırlatmasının randevu onayından hemen sonra
-- gitmesini engeller + kalıntı çoklu-süre verisini tekliye indirger.
--
-- SORUN (kullanıcı tarafından doğrulandı — 2026-08-14 21:49/21:50
-- "Randevu Onayı" ve bir dakika sonra "Yaklaşan randevu var" hatırlatması
-- art arda gitti): get_due_whatsapp_reminders() (migration 017)
--   a.appointment_at BETWEEN now() AND now() + (off.h || ' hours')::interval
-- koşulunu kullanıyordu. Bu, randevuya kalan süre off.h saatten AZ olan
-- HER randevuyu hemen "sırası geldi" sayar — yani ör. "1 gün önce" (24s)
-- ayarlıyken 17 saat sonrasına alınan bir randevu, rezervasyon onayından
-- birkaç dakika sonraki ilk cron tetiklemesinde (her 5 dk) anında
-- hatırlatma gönderiyordu. Doğru davranış: hatırlatma sadece randevuya
-- kalan süre GERÇEKTEN off.h saate yaklaştığında (cron aralığı kadar
-- toleransla) gitmeli; off.h'den daha az mühletle alınan randevular için
-- o süre hiç gerçekleşmediğinden hatırlatma atlanır (zaten az önce onay
-- mesajı gitti).
--
-- Ayrıca: wa_reminder_offsets_hours bugüne kadar çoklu seçime izin
-- veriyordu (ayarlar sayfası bugün tekliye çevrildi, bkz. commit
-- bba306a) — ama var olan organizasyonlarda birden fazla değer kalmış
-- olabilir. Bu dosya ilk (en küçük) değeri bırakıp geri kalanını temizler.
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRIN.
-- ============================================================

-- ─── 1. Kalıntı çoklu-süre verisini tekliye indirgen ─────────────
UPDATE organizations
SET wa_reminder_offsets_hours = ARRAY[(
  SELECT MIN(h) FROM unnest(wa_reminder_offsets_hours) AS h
)]
WHERE array_length(wa_reminder_offsets_hours, 1) > 1;

-- ─── 2. Hatırlatma penceresini randevuya kalan süreye sıkılaştır ─
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
    -- Randevuya kalan süre off.h'ye ulaştığında (5 dk'lık cron aralığına
    -- karşı 15 dk pay ile) tetiklenir — off.h'den daha kısa mühletle
    -- alınan randevularda bu pencereye hiç girilmez, hatırlatma atlanır.
    AND a.appointment_at <= now() + (off.h || ' hours')::interval
    AND a.appointment_at >  now() + (off.h || ' hours')::interval - INTERVAL '15 minutes'
  LIMIT 500;
$$;

NOTIFY pgrst, 'reload schema';
