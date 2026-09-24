-- ============================================================
-- SIRIPLAN — Paket / Seans Takibi (peşin ödemeli seans paketleri)
-- Tarih: 2026-09-11
-- Supabase Dashboard → SQL Editor'e yapıştırıp çalıştırın. İdempotenttir.
--
-- Güzellik sektöründe çok yaygın: "10 seans ağda", "5 seans cilt bakımı" gibi
-- peşin satılan paketler. Müşteri bazlı kalan seans sayacı; hizmet verildikçe
-- (randevu tamamlanınca ya da elle) düşer.
--
-- Ana randevu akışı DEĞİŞMEZ: paket yalnızca opsiyonel bir sayaç katmanıdır.
--  * customer_packages       — paketin kendisi + kalan seans
--  * customer_package_usages — her düşüş/iade hareketi (audit + geri alınabilir)
--  * appointments.package_id — bu randevu hangi paketten düşecek (nullable)
--
-- Muhasebe: paket SATIŞINDA gelir-gider'e tek gelir kaydı girilebilir
-- (uygulama tarafı, opsiyonel kutu). Paketten düşen randevu tamamlanırken
-- price = 0 + payment_method = 'paket' yazılır; böylece aylık ciro iki kez
-- saymaz (raporlar appointments.price topluyor).
-- ============================================================

-- ── 1. Paket tablosu ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_packages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- Paket bir hizmete bağlı olabilir (randevu eşleştirmesi bunun üzerinden yapılır);
  -- serbest metin paketler için NULL bırakılabilir.
  service_id      uuid REFERENCES services(id) ON DELETE SET NULL,
  name            text NOT NULL,
  total_sessions  int  NOT NULL CHECK (total_sessions > 0),
  used_sessions   int  NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  price_paid      numeric(10,2) NOT NULL DEFAULT 0,
  payment_method  text DEFAULT 'nakit',
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      date,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  note            text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_org_status ON customer_packages(org_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_service ON customer_packages(service_id);

-- ── 2. Seans hareketleri (kullanım / iade) ──────────────────
-- delta = +1  → bir seans kullanıldı
-- delta = -1  → yanlış düşüş geri alındı
CREATE TABLE IF NOT EXISTS customer_package_usages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  package_id      uuid NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  appointment_id  uuid REFERENCES appointments(id) ON DELETE SET NULL,
  delta           int  NOT NULL DEFAULT 1 CHECK (delta IN (1, -1)),
  note            text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_usages_package ON customer_package_usages(package_id);
CREATE INDEX IF NOT EXISTS idx_package_usages_appointment ON customer_package_usages(appointment_id);
-- Aynı randevu aynı paketten yalnızca bir kez düşürebilsin (çift tamamlama koruması).
CREATE UNIQUE INDEX IF NOT EXISTS uq_package_usage_appt
  ON customer_package_usages(package_id, appointment_id)
  WHERE appointment_id IS NOT NULL AND delta = 1;

-- ── 3. Randevu → paket bağı ─────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS package_id uuid
  REFERENCES customer_packages(id) ON DELETE SET NULL;

-- ── 4. RLS ──────────────────────────────────────────────────
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_package_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_packages_member" ON customer_packages;
CREATE POLICY "customer_packages_member" ON customer_packages
  FOR ALL USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "customer_package_usages_member" ON customer_package_usages;
CREATE POLICY "customer_package_usages_member" ON customer_package_usages
  FOR ALL USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- ── 5. Sayaç + durum senkronu ───────────────────────────────
-- usage eklendiğinde/silindiğinde customer_packages.used_sessions ve status'u
-- yeniden hesaplar. 'cancelled' / 'expired' durumları elle yönetilir, dokunulmaz.
CREATE OR REPLACE FUNCTION sync_customer_package_counter()
RETURNS TRIGGER AS $$
DECLARE
  pkg_id uuid;
BEGIN
  pkg_id := COALESCE(NEW.package_id, OLD.package_id);

  UPDATE customer_packages p
  SET
    used_sessions = GREATEST(0, (
      SELECT COALESCE(SUM(u.delta), 0)
      FROM customer_package_usages u
      WHERE u.package_id = pkg_id
    )),
    status = CASE
      WHEN p.status IN ('cancelled', 'expired') THEN p.status
      WHEN GREATEST(0, (
        SELECT COALESCE(SUM(u.delta), 0)
        FROM customer_package_usages u
        WHERE u.package_id = pkg_id
      )) >= p.total_sessions THEN 'completed'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE p.id = pkg_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_package_counter ON customer_package_usages;
CREATE TRIGGER tr_sync_package_counter
AFTER INSERT OR UPDATE OR DELETE ON customer_package_usages
FOR EACH ROW EXECUTE FUNCTION sync_customer_package_counter();

NOTIFY pgrst, 'reload schema';
