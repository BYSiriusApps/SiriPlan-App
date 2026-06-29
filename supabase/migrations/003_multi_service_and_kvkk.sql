-- ── Multi-service support for appointments ──────────────────
-- extra_services_json: [{id, name, price, duration_minutes}]
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS extra_services_json JSONB DEFAULT '[]'::jsonb;

-- ── KVKK consent on customers ────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS kvkk_consent        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kvkk_consent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_consent   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

-- ── Phone on organizations (owner contact) ───────────────────
-- Already exists; ensure NOT NULL is NOT enforced (optional)
-- Just add an index for lookup speed
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_appointments_extra ON appointments USING GIN(extra_services_json);
