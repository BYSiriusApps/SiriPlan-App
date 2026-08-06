-- ============================================================
-- İşletme konum linki (Google Maps paylaşım linki) — otomatik
-- WhatsApp/SMS mesajlarında ve hatırlatıcılarda kullanılmak üzere.
-- Boşsa kod tarafında adres metninden otomatik harita linki üretilir.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS location_url TEXT;

NOTIFY pgrst, 'reload schema';
