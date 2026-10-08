-- ============================================================
-- 20261008 — WhatsApp hatırlatma süreleri: yalnızca "2 saat" ve "1 gün".
--
-- * Yeni organizasyonların varsayılanı {2,24} (ikisi de işaretli).
-- * Mevcut organizasyonlar {2,24}'e alınır (eski 1/3/6 saat seçenekleri
--   arayüzden kalktı; {2} olanlara 1 gün öncesi hatırlatma da eklenir).
--   Sahip dilerse Ayarlar'dan kutucukları kapatabilir.
-- get_due_whatsapp_reminders() zaten her süre için ayrı log tuttuğundan
-- (appointment_reminder_log: appointment_id + offset_hours) iki hatırlatma
-- çift gönderim olmadan çalışır; fonksiyon değişmedi.
-- Supabase SQL Editor'e yapıştırıp ÇALIŞTIRIN.
-- ============================================================
ALTER TABLE organizations
  ALTER COLUMN wa_reminder_offsets_hours SET DEFAULT '{2,24}';

UPDATE organizations
SET wa_reminder_offsets_hours = '{2,24}'
WHERE wa_reminder_offsets_hours IS DISTINCT FROM '{2,24}'::integer[];

NOTIFY pgrst, 'reload schema';
