-- ============================================================
-- Müşteriyi online rezervasyon widget'ından (/r/[slug]) engelleme
-- (sık gelmeyen / no-show yapan müşteriler için — panelden elle
-- randevu oluşturmayı etkilemez, sadece anonim self-servis akışını).
-- ============================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS online_booking_blocked BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
