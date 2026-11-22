-- GERİ ALMA: 20261018_mini_lite_ephemeral.sql
-- Mevcut veriyi bozmaz: yalnızca bu migration'ın eklediği nesneleri kaldırır ve
-- 20261006'daki enforce_mini_staff_limit() tanımına döner. 'lite' planında org varsa
-- önce o kiracıları başka plana taşıyın (silinmiş randevular geri gelmez).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-ephemeral-appointments';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron kaldırma atlandı: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_skip_ephemeral ON customers;
DROP TRIGGER IF EXISTS trg_consents_skip_ephemeral ON customer_consents;
DROP FUNCTION IF EXISTS skip_pii_insert_for_ephemeral();
DROP FUNCTION IF EXISTS purge_expired_retention_history(UUID);
DROP FUNCTION IF EXISTS purge_ephemeral_appointments(UUID);
DROP FUNCTION IF EXISTS org_is_ephemeral(UUID);
ALTER TABLE organizations DROP COLUMN IF EXISTS data_retention_until;
DROP TABLE IF EXISTS plan_data_retention;

-- 20261006 tanımına dön (yalnızca 'mini').
CREATE OR REPLACE FUNCTION enforce_mini_staff_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan  TEXT;
  v_other INT;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT plan INTO v_plan FROM organizations WHERE id = NEW.org_id;
  IF v_plan = 'mini' THEN
    SELECT COUNT(*) INTO v_other
      FROM staff
     WHERE org_id = NEW.org_id AND is_active = TRUE AND id <> NEW.id;
    IF v_other >= 1 THEN
      RAISE EXCEPTION 'Mini planda yalnızca 1 aktif personel kullanılabilir. Daha fazlası için planı yükseltin.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
