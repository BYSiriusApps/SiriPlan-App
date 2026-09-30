-- ============================================================
-- Kampanya indirim teklifi (süreli, müşteri başına tek kullanımlık)
-- ============================================================
-- Amaç: Kampanya mesajındaki indirim vaadinin panelde karşılığı olsun.
--  * campaigns      : indirim tanımı (tür, değer, son gün, hizmet/tutar koşulu)
--  * campaign_logs  : müşteri başına hak — "kullanıldı" işareti
--  * appointments   : uygulanan indirim tutarı + hangi haktan geldiği
--
-- Güvenlik / geriye uyumluluk:
--  * Tüm kolonlar NULL'lanabilir ve yeni; mevcut satırlar, sorgular ve
--    tetikleyiciler (gelir satırı dahil) aynen çalışır. Veri silinmez.
--  * İndirim tanımı olmayan kampanyalar bugünkü gibi yalnızca mesajdır.
--  * Mevcut RLS politikaları (campaigns_all / campaign_logs_all / appointments)
--    satır bazlıdır; yeni kolonlar otomatik kapsanır.
--  * Tekrar çalıştırılması güvenlidir (IF NOT EXISTS / idempotent).
-- ============================================================

-- 1) Kampanya: indirim tanımı
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS discount_type  TEXT;           -- percent | fixed
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS valid_until    DATE;           -- son geçerli gün (dahil)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS service_ids    UUID[];         -- NULL = tüm hizmetler
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_amount     NUMERIC(10,2);  -- NULL = alt sınır yok

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_offer_check') THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_offer_check CHECK (
      (discount_type IS NULL AND discount_value IS NULL AND valid_until IS NULL)
      OR (
        discount_type IN ('percent', 'fixed')
        AND discount_value IS NOT NULL AND discount_value > 0
        AND (discount_type <> 'percent' OR discount_value <= 100)
        AND valid_until IS NOT NULL
        AND (min_amount IS NULL OR min_amount >= 0)
      )
    );
  END IF;
END $$;

-- 2) Kampanya günlüğü: hak kullanıldı işareti
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS redeemed_at             TIMESTAMPTZ;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS redeemed_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- Müşteri seçilince "kullanılmamış hakkı var mı?" sorgusu için küçük kısmi indeks
CREATE INDEX IF NOT EXISTS idx_campaign_logs_open_offers
  ON campaign_logs (customer_id)
  WHERE status = 'sent' AND redeemed_at IS NULL;

-- 3) Randevu: uygulanan indirim (fiyat zaten indirimli yazılır; bu alan yalnızca kayıt/rapor içindir)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS campaign_log_id   UUID REFERENCES campaign_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_campaign_log
  ON appointments (campaign_log_id)
  WHERE campaign_log_id IS NOT NULL;
