-- ── Owner KVKK & marketing consent on org_members ───────────
ALTER TABLE org_members
  ADD COLUMN IF NOT EXISTS kvkk_consent        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kvkk_consent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_consent   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

-- Index for quick lookup of marketing-opted-in owners
CREATE INDEX IF NOT EXISTS idx_org_members_marketing
  ON org_members(org_id, marketing_consent)
  WHERE marketing_consent = TRUE;
