-- 20261018 — "Mini Lite" planı: geçici veri modu (ephemeral).
--
-- Mini Lite'ta müşteri verisi / randevu geçmişi KALICI tutulmaz: randevu tamamlanınca
-- ya da iptal edilince satır HARD DELETE edilir; durumu ne olursa olsun bitiş saatinden
-- 24 saat sonra da silinir. Diğer planlar (mini, starter, pro, business, trial) 'persistent'
-- kalır — davranışları DEĞİŞMEZ.
--
-- TEKRAR ÇALIŞTIRILABİLİR (idempotent). Geri alma: supabase/migrations/rollback/20261018_mini_lite_ephemeral_down.sql
-- Önce kod deploy edilebilir: kod bu tablo/fonksiyonlar yokken de çalışır (silme kancaları
-- uygulama tarafında; günlük cron hata verirse sessizce 0 döner).
--
-- Güvenlik:
--  * Yeni tablo RLS açık + politika YOK + anon/authenticated REVOKE → yalnızca service_role.
--  * Tüm SECURITY DEFINER fonksiyonlarda SET search_path = public; EXECUTE yalnızca
--    service_role/postgres (anon/authenticated/PUBLIC REVOKE).
--  * Mevcut RLS politikalarına DOKUNULMAZ.

-- ─── 1) Plan başına veri saklama modu ────────────────────────
CREATE TABLE IF NOT EXISTS plan_data_retention (
  plan TEXT PRIMARY KEY,
  data_retention_mode TEXT NOT NULL DEFAULT 'persistent'
    CHECK (data_retention_mode IN ('persistent', 'ephemeral'))
);
ALTER TABLE plan_data_retention ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON plan_data_retention FROM PUBLIC, anon, authenticated;

INSERT INTO plan_data_retention (plan, data_retention_mode) VALUES
  ('trial',    'persistent'),
  ('mini',     'persistent'),
  ('starter',  'persistent'),
  ('pro',      'persistent'),
  ('business', 'persistent'),
  ('lite',     'ephemeral')
ON CONFLICT (plan) DO NOTHING;   -- mevcut satırı ASLA ezme

-- Persistent → ephemeral geçişte dışa aktarma süresi (30 gün). NULL = süre yok.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMPTZ;

-- ─── 2) Yardımcı: org ephemeral mi? ──────────────────────────
CREATE OR REPLACE FUNCTION org_is_ephemeral(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT r.data_retention_mode = 'ephemeral'
      FROM organizations o
      JOIN plan_data_retention r ON r.plan = o.plan
     WHERE o.id = p_org
  ), FALSE);
$$;

-- ─── 3) Silme (purge) fonksiyonları ──────────────────────────
-- 3a) Bitmiş randevular: yalnızca ephemeral planlar; idempotent; p_org verilirse tek kiracı.
--   - durum 'tamamlandi' veya 'iptal'  → sil
--   - durumu ne olursa olsun bitişi 24 saatten eski → sil (gelmeyen/işaretlenmeyen)
--   Gelecek veya devam eden randevuya (bitiş + 24 saat geçmemiş, kapanmamış) DOKUNMAZ:
--   hatırlatma cron'u etkilenmez. PII loglanmaz; yalnızca silinen satır sayısı döner.
--   30 günlük dışa aktarma süresi (data_retention_until > now()) açıkken, geçiş ÖNCESİNDE
--   oluşturulmuş geçmişe DOKUNMAZ (geçiş anı = data_retention_until - 30 gün); yalnızca geçişten
--   sonra oluşan randevular silinir. Süre dolunca geçmişi purge_expired_retention_history siler.
CREATE OR REPLACE FUNCTION purge_ephemeral_appointments(p_org UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_n   INT := 0;
BEGIN
  SELECT COALESCE(array_agg(a.id), '{}') INTO v_ids
    FROM appointments a
    JOIN organizations o ON o.id = a.org_id
    JOIN plan_data_retention r ON r.plan = o.plan
   WHERE r.data_retention_mode = 'ephemeral'
     AND (p_org IS NULL OR a.org_id = p_org)
     AND (
           o.data_retention_until IS NULL
        OR o.data_retention_until <= now()
        OR a.created_at >= o.data_retention_until - INTERVAL '30 days'
     )
     AND (
           a.status IN ('tamamlandi', 'iptal')
        OR a.appointment_at + make_interval(mins => COALESCE(a.duration_minutes, 0)) + INTERVAL '24 hours' < now()
     );

  IF array_length(v_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- NO ACTION FK (loyalty_redeems.appointment_id): önce bağı kopar, yoksa silme patlar.
  UPDATE loyalty_redeems SET appointment_id = NULL WHERE appointment_id = ANY (v_ids);

  DELETE FROM appointments WHERE id = ANY (v_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- 3b) Persistent → ephemeral geçişten 30 gün sonra eski geçmiş (müşteri + randevular).
--   Yalnızca: plan ephemeral VE data_retention_until dolmuş. Biten kayıttan sonra
--   data_retention_until NULL'lanır (idempotent: ikinci çalıştırma 0 döner).
CREATE OR REPLACE FUNCTION purge_expired_retention_history(p_org UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org   UUID;
  v_total INT := 0;
  v_n     INT;
  v_cids  UUID[];
  r       RECORD;
BEGIN
  FOR v_org IN
    SELECT o.id
      FROM organizations o
      JOIN plan_data_retention d ON d.plan = o.plan
     WHERE d.data_retention_mode = 'ephemeral'
       AND o.data_retention_until IS NOT NULL
       AND o.data_retention_until < now()
       AND (p_org IS NULL OR o.id = p_org)
  LOOP
    -- Gelecekteki (henüz bitmemiş) randevular KALIR; yalnızca geçmiş + kapanmış olanlar silinir.
    UPDATE loyalty_redeems SET appointment_id = NULL
     WHERE org_id = v_org
       AND appointment_id IN (
         SELECT id FROM appointments
          WHERE org_id = v_org
            AND (status IN ('tamamlandi', 'iptal', 'gelmedi') OR appointment_at < now())
       );
    DELETE FROM appointments
     WHERE org_id = v_org
       AND (status IN ('tamamlandi', 'iptal', 'gelmedi') OR appointment_at < now());
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_total := v_total + v_n;

    -- Müşteri kayıtları: bu kiracının müşterilerine bağlı NO ACTION/RESTRICT çocuk satırlar
    -- (FK'lar çalışma anında bulunur — şema büyüse de eksik kalmaz), sonra müşteriler.
    SELECT COALESCE(array_agg(id), '{}') INTO v_cids FROM customers WHERE org_id = v_org;
    IF array_length(v_cids, 1) IS NOT NULL THEN
      -- Açık (gelecek) randevuların müşteri bağı kopar; randevu satırında ad/telefon zaten var.
      UPDATE appointments SET customer_id = NULL WHERE org_id = v_org AND customer_id = ANY (v_cids);
      -- Kendine referans.
      UPDATE customers SET referred_by_customer_id = NULL WHERE org_id = v_org;
      FOR r IN
        SELECT c.conrelid::regclass AS tbl, a.attname AS col
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
         WHERE c.contype = 'f'
           AND c.confrelid = 'customers'::regclass
           AND c.confdeltype IN ('a', 'r')          -- NO ACTION / RESTRICT
           AND c.conrelid <> 'customers'::regclass
           AND array_length(c.conkey, 1) = 1
      LOOP
        EXECUTE format('DELETE FROM %s WHERE %I = ANY ($1)', r.tbl, r.col) USING v_cids;
      END LOOP;
      DELETE FROM customers WHERE org_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_total := v_total + v_n;
    END IF;

    UPDATE organizations SET data_retention_until = NULL WHERE id = v_org;
  END LOOP;

  RETURN v_total;
END;
$$;

-- ─── 4) Güvenlik ağı: ephemeral kiracıda yeni müşteri / rıza kaydı oluşmaz ──
-- Uygulama zaten oluşturmaz; bu, API'yi atlayan yollar için DB seviyesi garanti.
-- RETURN NULL = satır sessizce atlanır (hata fırlatmaz; randevu akışı bozulmaz).
CREATE OR REPLACE FUNCTION skip_pii_insert_for_ephemeral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF org_is_ephemeral(NEW.org_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_skip_ephemeral ON customers;
CREATE TRIGGER trg_customers_skip_ephemeral
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION skip_pii_insert_for_ephemeral();

DROP TRIGGER IF EXISTS trg_consents_skip_ephemeral ON customer_consents;
CREATE TRIGGER trg_consents_skip_ephemeral
  BEFORE INSERT ON customer_consents
  FOR EACH ROW EXECUTE FUNCTION skip_pii_insert_for_ephemeral();

-- ─── 5) Mini Lite: Mini ile aynı tek aktif personel sınırı (DB güvenlik ağı) ──
-- 20261006'daki fonksiyonun aynısı; yalnızca plan kontrolü 'lite'ı da kapsar.
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
  IF v_plan IN ('mini', 'lite') THEN
    SELECT COUNT(*) INTO v_other
      FROM staff
     WHERE org_id = NEW.org_id AND is_active = TRUE AND id <> NEW.id;
    IF v_other >= 1 THEN
      RAISE EXCEPTION 'Mini / Mini Lite planda yalnızca 1 aktif personel kullanılabilir. Daha fazlası için planı yükseltin.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 6) Yetkiler: yalnızca service_role / postgres ───────────
REVOKE ALL ON FUNCTION org_is_ephemeral(UUID)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION purge_ephemeral_appointments(UUID)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION purge_expired_retention_history(UUID)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION skip_pii_insert_for_ephemeral()           FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION org_is_ephemeral(UUID)                 TO service_role;
GRANT EXECUTE ON FUNCTION purge_ephemeral_appointments(UUID)     TO service_role;
GRANT EXECUTE ON FUNCTION purge_expired_retention_history(UUID)  TO service_role;

-- ─── 7) pg_cron (varsa): saatlik silme. Yoksa Vercel günlük cron'u (/api/cron/purge-ephemeral) çalışır. ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-ephemeral-appointments';
    PERFORM cron.schedule(
      'purge-ephemeral-appointments',
      '7 * * * *',
      $cron$SELECT public.purge_ephemeral_appointments(NULL); SELECT public.purge_expired_retention_history(NULL);$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron zamanlaması atlandı: %', SQLERRM;
END;
$$;
