-- ============================================================
-- Hizmet bazında para birimi. Salon sahibi hizmet eklerken/
-- düzenlerken TRY/USD/EUR seçebilir — varsayılan TRY.
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY';

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_currency_check;
ALTER TABLE services ADD CONSTRAINT services_currency_check
  CHECK (currency IN ('TRY', 'USD', 'EUR'));

NOTIFY pgrst, 'reload schema';
