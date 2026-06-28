-- ============================================================
-- Siriplan — Expenses (Giderler) Table
-- ============================================================

CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'gider',  -- gelir|gider
  category        TEXT NOT NULL DEFAULT 'diger',  -- kira|personel|malzeme|fatura|pazarlama|diger
  amount          NUMERIC(12,2) NOT NULL,
  description     TEXT NOT NULL,
  note            TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT DEFAULT 'nakit',  -- nakit|kart|havale|çek
  receipt_url     TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_org_date ON expenses(org_id, date DESC);
CREATE INDEX idx_expenses_type     ON expenses(org_id, type);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_all" ON expenses FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
