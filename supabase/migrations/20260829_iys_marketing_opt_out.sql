-- ============================================================
-- 20260829 — İYS / 6563 uyumu: pazarlama iletisi RET (opt-out) altyapısı
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRMANIZ
-- YETERLİ. Tüm adımlar idempotent.
--
-- Kapsam:
--   1. customer_consents.captured_via — 'opt_out_reply' değerine izin ver
--      (müşteri WhatsApp/SMS ile "RET" yazınca oluşan ret kaydı için)
--   2. Yardımcı görünüm: son pazarlama onay/ret durumu (denetim kolaylığı)
-- ============================================================

-- ─── 1. captured_via CHECK kısıtını genişlet ────────────────────────────
DO $$
BEGIN
  ALTER TABLE customer_consents DROP CONSTRAINT IF EXISTS customer_consents_captured_via_check;
  ALTER TABLE customer_consents
    ADD CONSTRAINT customer_consents_captured_via_check
    CHECK (captured_via IN ('inline_web', 'link', 'staff_attested', 'opt_out_reply'));
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'customer_consents tablosu yok — migration 017 önce çalıştırılmalı';
END $$;

-- ─── 2. Denetim görünümü — müşteri başına en güncel pazarlama onay durumu ─
-- customer_consents yalnızca eklemeli (append-only) denetim izidir; "şu an
-- onaylı mı?" sorusunun tek doğru cevabı customers.marketing_consent'tir.
-- Bu görünüm ikisini yan yana koyar; tutarsızlık (ör. RET geldi ama kolon
-- güncellenmedi) hızlı görülebilsin.
CREATE OR REPLACE VIEW marketing_consent_audit AS
SELECT
  c.id            AS customer_id,
  c.org_id,
  c.full_name,
  c.phone,
  c.marketing_consent            AS current_flag,
  c.marketing_consent_at         AS current_flag_at,
  lc.given                       AS last_log_given,
  lc.given_at                    AS last_log_at,
  lc.source_channel              AS last_log_channel,
  lc.captured_via                AS last_log_captured_via
FROM customers c
LEFT JOIN LATERAL (
  SELECT given, given_at, source_channel, captured_via
  FROM customer_consents cc
  WHERE cc.customer_id = c.id AND cc.consent_type = 'marketing'
  ORDER BY cc.given_at DESC
  LIMIT 1
) lc ON TRUE;

REVOKE ALL ON marketing_consent_audit FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
