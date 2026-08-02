-- ============================================================
-- SIRIPLAN — Randevu çakışması engelleme (DB seviyesi)
-- Tarih: 2026-07-31
-- Supabase SQL Editor'da çalıştırılmalı
--
-- SORUN: POST/PATCH /api/appointments hiçbir çakışma kontrolü
-- yapmadan insert/update ediyordu; aynı personele aynı saatte
-- birden fazla randevu girilebiliyordu.
--
-- ÇÖZÜM: appointment_at + duration_minutes'tan üretilen bir
-- tstzrange kolonu + GiST exclusion constraint. Uygulama
-- katmanındaki kontrolden farklı olarak race condition'a karşı
-- da garantili (iki eşzamanlı istek aynı anda geçemez).
--
-- NOT (v2): İlk denemede appointment_range GENERATED ALWAYS AS
-- kolonu kullanılmıştı, ama Postgres "timestamptz + interval"
-- işlemini IMMUTABLE değil STABLE olarak işaretliyor (timezone/DST
-- geçişleri yüzünden) — bu yüzden generated column tanımı
-- "generation expression is not immutable" hatasıyla reddedildi.
-- Bunun yerine sıradan bir kolon + trigger kullanıyoruz (trigger'lar
-- STABLE fonksiyon çağırabilir, kısıtlama yok).
--
-- NOT: Eğer constraint eklerken "conflicting key value violates
-- exclusion constraint" hatası alırsan, mevcut veride zaten çakışan
-- randevular var demektir. Önce şu sorguyla bulup elle düzeltin
-- (saat kaydırma/iptal):
--
--   SELECT a1.id, a2.id, a1.staff_id, a1.appointment_at, a2.appointment_at
--   FROM appointments a1
--   JOIN appointments a2
--     ON a1.staff_id = a2.staff_id
--    AND a1.id < a2.id
--    AND a1.status NOT IN ('iptal','gelmedi')
--    AND a2.status NOT IN ('iptal','gelmedi')
--    AND tstzrange(a1.appointment_at, a1.appointment_at + (a1.duration_minutes || ' minutes')::interval, '[)')
--        && tstzrange(a2.appointment_at, a2.appointment_at + (a2.duration_minutes || ' minutes')::interval, '[)');
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_range tstzrange;

CREATE OR REPLACE FUNCTION appointments_set_range()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.appointment_range := tstzrange(
    NEW.appointment_at,
    NEW.appointment_at + (NEW.duration_minutes || ' minutes')::interval,
    '[)'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_set_range ON appointments;
CREATE TRIGGER trg_appointments_set_range
  BEFORE INSERT OR UPDATE OF appointment_at, duration_minutes ON appointments
  FOR EACH ROW EXECUTE FUNCTION appointments_set_range();

-- Mevcut satırları doldur (trigger yalnızca yeni insert/update'te tetiklenir)
UPDATE appointments
  SET appointment_range = tstzrange(appointment_at, appointment_at + (duration_minutes || ' minutes')::interval, '[)')
  WHERE appointment_range IS NULL;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (staff_id WITH =, appointment_range WITH &&)
  WHERE (status NOT IN ('iptal', 'gelmedi'));

NOTIFY pgrst, 'reload schema';
