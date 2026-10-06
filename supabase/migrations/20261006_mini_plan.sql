-- 20261006 — Mini plan + Starter'da ayda 1 kampanya.
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent). Önce kod deploy edilebilir:
-- kod, burada tanımlanan fonksiyon/tablo henüz yokken de çalışmaya devam eder
-- (kota sayaçları "açık geç" davranır), sınırlar migration uygulanınca devreye girer.
--
-- 1) plan_usage: aylık kullanım sayaçları (org + tür + ay). Yalnızca service_role
--    erişir (RLS açık, politika yok) — kiracılar birbirinin ya da kendi sayacını
--    okuyup/yazamaz; panel sayıları sunucu tarafında service role ile okunur.
--      kind = 'wa_message'  → Mini: ayda 200 müşteri WhatsApp şablon mesajı
--      kind = 'campaign'    → Starter: ayda 1 kampanya
-- 2) consume_plan_usage / release_plan_usage: atomik sayaç artır/azalt.
-- 3) Mini için DB seviyesinde tek aktif personel sınırı (API'yi atlayan her yol dahil).
-- 4) Starter organizasyonlarında feature_campaigns açılır (sayı sınırı yukarıdaki sayaçla).

-- ─── 1) Kullanım sayacı tablosu ──────────────────────────────
CREATE TABLE IF NOT EXISTS plan_usage (
  org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind    TEXT NOT NULL,
  period  DATE NOT NULL,                 -- ayın ilk günü (UTC)
  count   INT  NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (org_id, kind, period)
);

ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON plan_usage FROM PUBLIC, anon, authenticated;

-- ─── 2) Atomik sayaç fonksiyonları ───────────────────────────
-- Sınır aşılmadıysa sayacı 1 artırır ve true döner; aşıldıysa dokunmaz, false döner.
CREATE OR REPLACE FUNCTION consume_plan_usage(p_org UUID, p_kind TEXT, p_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := (date_trunc('month', now() AT TIME ZONE 'utc'))::date;
  v_count  INT;
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO plan_usage (org_id, kind, period, count)
  VALUES (p_org, p_kind, v_period, 1)
  ON CONFLICT (org_id, kind, period)
  DO UPDATE SET count = plan_usage.count + 1
  WHERE plan_usage.count < p_limit
  RETURNING count INTO v_count;

  RETURN v_count IS NOT NULL;
END;
$$;

-- Gönderim/oluşturma başarısız olduysa harcanan hakkı geri verir.
CREATE OR REPLACE FUNCTION release_plan_usage(p_org UUID, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := (date_trunc('month', now() AT TIME ZONE 'utc'))::date;
BEGIN
  UPDATE plan_usage
     SET count = GREATEST(count - 1, 0)
   WHERE org_id = p_org AND kind = p_kind AND period = v_period;
END;
$$;

-- Yalnızca sunucu (service_role) çağırabilir: bir kiracı başkasının hakkını tüketemez.
REVOKE ALL ON FUNCTION consume_plan_usage(UUID, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_plan_usage(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_plan_usage(UUID, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION release_plan_usage(UUID, TEXT) TO service_role;

-- ─── 3) Mini: tek aktif personel (DB güvenlik ağı) ───────────
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
  -- Zaten aktif olan bir satırın başka alanlarının güncellenmesi sayıyı değiştirmez.
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

DROP TRIGGER IF EXISTS trg_mini_staff_limit ON staff;
CREATE TRIGGER trg_mini_staff_limit
  BEFORE INSERT OR UPDATE OF is_active ON staff
  FOR EACH ROW EXECUTE FUNCTION enforce_mini_staff_limit();

-- ─── 4) Starter: kampanya modülü açılır (ayda 1 sınırıyla) ───
UPDATE organizations
   SET feature_campaigns = TRUE
 WHERE plan = 'starter'
   AND feature_campaigns IS DISTINCT FROM TRUE;
