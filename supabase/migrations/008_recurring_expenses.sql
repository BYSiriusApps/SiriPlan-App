-- Recurring expense templates — saved monthly fixed costs
-- Users create templates once; apply them to any month with one click.

CREATE TABLE recurring_expenses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'gider',       -- gelir|gider
  category       TEXT NOT NULL DEFAULT 'diger',
  amount         NUMERIC(12,2) NOT NULL,
  description    TEXT NOT NULL,
  payment_method TEXT DEFAULT 'nakit',
  note           TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_expenses_org ON recurring_expenses(org_id, is_active, sort_order);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_expenses_all" ON recurring_expenses FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
