-- 20261010 — SMS kontör paketi (tek seferlik, Stripe ile satılır).
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent). Önce kod deploy edilebilir:
-- tablo/fonksiyon henüz yokken kod "kontör yok" gibi davranır ve mevcut SMS
-- akışı (kendi sağlayıcısını bağlamış kiracılar) aynen çalışır.
--
-- 1) org_sms_credits: kiracı başına kontör bakiyesi. Yalnızca service_role
--    erişir (RLS açık, politika yok) — bir kiracı kendi bakiyesini yazamaz.
-- 2) sms_credit_purchases: Stripe Checkout oturumu başına tek satır (idempotency
--    anahtarı = oturum id). Webhook tekrar gelse bile kontör iki kez yüklenmez.
-- 3) add_sms_credits / consume_sms_credit / release_sms_credit: atomik işlemler.

-- ─── 1) Bakiye ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_sms_credits (
  org_id     UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  balance    INT  NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_sms_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_sms_credits FROM PUBLIC, anon, authenticated;

-- ─── 2) Satın alma kayıtları ─────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_credit_purchases (
  stripe_session_id TEXT PRIMARY KEY,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credits           INT  NOT NULL CHECK (credits > 0),
  amount_total      INT,            -- Stripe'ın en küçük birimi (kuruş/cent)
  currency          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_credit_purchases_org ON sms_credit_purchases (org_id, created_at DESC);

ALTER TABLE sms_credit_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sms_credit_purchases FROM PUBLIC, anon, authenticated;

-- ─── 3) Atomik fonksiyonlar ──────────────────────────────────
-- Satın alınan kontörü yükler. Aynı oturum ikinci kez gelirse dokunmaz, false döner.
CREATE OR REPLACE FUNCTION add_sms_credits(
  p_org UUID, p_credits INT, p_session TEXT, p_amount INT, p_currency TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted TEXT;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 OR p_session IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO sms_credit_purchases (stripe_session_id, org_id, credits, amount_total, currency)
  VALUES (p_session, p_org, p_credits, p_amount, p_currency)
  ON CONFLICT (stripe_session_id) DO NOTHING
  RETURNING stripe_session_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO org_sms_credits (org_id, balance)
  VALUES (p_org, p_credits)
  ON CONFLICT (org_id)
  DO UPDATE SET balance = org_sms_credits.balance + p_credits, updated_at = now();

  RETURN TRUE;
END;
$$;

-- Bakiye varsa 1 kontör düşer ve true döner; yoksa dokunmaz, false döner.
CREATE OR REPLACE FUNCTION consume_sms_credit(p_org UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INT;
BEGIN
  UPDATE org_sms_credits
     SET balance = balance - 1, updated_at = now()
   WHERE org_id = p_org AND balance > 0
  RETURNING balance INTO v_balance;

  RETURN v_balance IS NOT NULL;
END;
$$;

-- Gönderim başarısız olduysa düşen kontörü geri verir.
CREATE OR REPLACE FUNCTION release_sms_credit(p_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE org_sms_credits
     SET balance = balance + 1, updated_at = now()
   WHERE org_id = p_org;
END;
$$;

-- Yalnızca sunucu (service_role) çağırabilir: bir kiracı kontör yükleyemez/tüketemez.
REVOKE ALL ON FUNCTION add_sms_credits(UUID, INT, TEXT, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION consume_sms_credit(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_sms_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_sms_credits(UUID, INT, TEXT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION consume_sms_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION release_sms_credit(UUID) TO service_role;
