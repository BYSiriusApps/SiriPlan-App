-- ============================================================
-- SIRIPLAN — Güvenlik Düzeltmeleri + Expenses Tablosu + Indexler
-- Tarih: 2026-06-30
-- Supabase SQL Editor'da çalıştırıldı
-- ============================================================

-- 1. ORGANIZATIONS — RLS politikaları
--    Public booking sayfası (/r/[slug]) için SELECT herkese açık,
--    ancak yazma işlemleri sadece org sahiplerine
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select_public"  ON organizations;
DROP POLICY IF EXISTS "orgs_update_members" ON organizations;
DROP POLICY IF EXISTS "orgs_insert_service" ON organizations;
DROP POLICY IF EXISTS "orgs_delete_service" ON organizations;

CREATE POLICY "orgs_select_public" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "orgs_update_members" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "orgs_insert_service" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "orgs_delete_service" ON organizations
  FOR DELETE USING (auth.role() = 'service_role');

-- 2. EXPENSES — Gelir/gider takip tablosu
CREATE TABLE IF NOT EXISTS expenses (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type           TEXT          NOT NULL CHECK (type IN ('gelir','gider')),
  category       TEXT          NOT NULL,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description    TEXT          NOT NULL,
  note           TEXT,
  date           DATE          NOT NULL,
  payment_method TEXT,
  created_by     UUID          REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_org_members" ON expenses;
CREATE POLICY "expenses_org_members" ON expenses
  FOR ALL USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- 3. PERFORMANS İNDEXLERİ
CREATE INDEX IF NOT EXISTS idx_appointments_org_id   ON appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_at        ON appointments(appointment_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON appointments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id  ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id       ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone        ON customers(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id    ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id     ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_org_id           ON staff(org_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id        ON services(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id       ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date      ON expenses(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_slug     ON organizations(slug);

-- 4. UPDATED_AT OTOMATİK GÜNCELLEME
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON organizations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
