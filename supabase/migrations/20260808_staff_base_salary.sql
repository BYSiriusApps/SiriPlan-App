-- ============================================================
-- Personel maaş hesaplama: sabit taban maaş alanı.
-- Toplam ödeme = base_salary + (tamamlanan randevu cirosu * commission_rate) + bahşişler.
-- commission_rate zaten staff tablosunda mevcuttu (bkz. 0..1 arası ondalık, Personel
-- sayfasında % olarak gösterilir/düzenlenir).
-- ============================================================

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
