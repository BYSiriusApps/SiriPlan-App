-- 20261013 — Ek Şube paketi: şube organizasyonlarının ana organizasyona bağlanması.
--
-- TEKRAR ÇALIŞTIRILABİLİR (idempotent). Önce 20261012_org_addons.sql çalışmış olmalı.
--
-- Şube = AYRI bir organizasyon (veri izolasyonu / RLS aynen kalır). Bu tablo
-- yalnızca "şu org, şu ana org'un şubesidir" bilgisini tutar; plan ve özellikler
-- ana org'dan miras alınır (bkz. src/lib/branches.ts), şubenin kendi Stripe
-- aboneliği yoktur. Yalnızca service_role erişir (SMS kontörü / org_addons ile aynı model).

CREATE TABLE IF NOT EXISTS org_branches (
  branch_org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  parent_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (branch_org_id <> parent_org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_branches_parent ON org_branches (parent_org_id, created_at);

ALTER TABLE org_branches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_branches FROM PUBLIC, anon, authenticated;

-- Şube hakkını ATOMİK talep eder: ana org'un org_addons satırını kilitler, kullanılan
-- şube sayısı satın alınan hakkı aşmıyorsa bağlantıyı ekler. İki eşzamanlı istek
-- aynı son hakkı iki kez alamaz. Şube bir başka şubenin ana org'u olamaz.
CREATE OR REPLACE FUNCTION claim_branch_slot(p_parent UUID, p_branch UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slots INT;
  v_used  INT;
BEGIN
  IF EXISTS (SELECT 1 FROM org_branches WHERE branch_org_id = p_parent) THEN
    RETURN false;
  END IF;

  SELECT extra_branch_slots INTO v_slots FROM org_addons WHERE org_id = p_parent FOR UPDATE;
  IF v_slots IS NULL OR v_slots <= 0 THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_used FROM org_branches WHERE parent_org_id = p_parent;
  IF v_used >= v_slots THEN
    RETURN false;
  END IF;

  INSERT INTO org_branches (branch_org_id, parent_org_id) VALUES (p_branch, p_parent);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION claim_branch_slot(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_branch_slot(UUID, UUID) TO service_role;
