-- ============================================================
-- SIRIPLAN — Sektöre özel müşteri alanları + metrik geçmişi
-- Tarih: 2026-09-22
-- Supabase Dashboard → SQL Editor'e yapıştırıp çalıştırın. İdempotenttir.
--
-- Şu ana kadar customers şeması tüm sektörler için birebirdi (ad, telefon,
-- not, tag, puan). Diyetisyen için "kilo", pet kuaför için "tür/cins",
-- klinik/estetik için "kontrol gerekiyor / takipte" gibi sektöre özel
-- alanlar yoktu. Bu migration iki katman ekliyor:
--
--  * customers.custom_fields — sektöre göre değişen TEKİL/anlık değerler
--    (durum rozeti, evcil hayvan türü, program adı vb.). Alan tanımları
--    kodda src/lib/customer-fields/catalog.ts içinde tutulur; burada sadece
--    esnek bir jsonb kutu var.
--  * customer_metrics — zaman içinde değişen SAYISAL değerler (kilo gibi)
--    için geçmiş kaydı; customer_packages ile birebir aynı RLS deseni.
-- ============================================================

-- ── 1. customers.custom_fields ──────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_customers_custom_fields ON customers USING gin (custom_fields);

-- ── 2. customer_metrics (kilo gibi zaman serisi değerler) ───
CREATE TABLE IF NOT EXISTS customer_metrics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  metric_key   text NOT NULL,
  value        numeric(10,2) NOT NULL,
  note         text,
  recorded_at  date NOT NULL DEFAULT current_date,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_metrics_customer_key
  ON customer_metrics(customer_id, metric_key, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_org ON customer_metrics(org_id);

ALTER TABLE customer_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_metrics_member" ON customer_metrics;
CREATE POLICY "customer_metrics_member" ON customer_metrics
  FOR ALL USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

NOTIFY pgrst, 'reload schema';
