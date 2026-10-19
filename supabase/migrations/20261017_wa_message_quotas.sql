-- 20261017 — WhatsApp mesaj kotaları: aylık UTILITY hakkı + satın alınan ek krediler.
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent) ve GERİ UYUMLUDUR: yalnızca YENİ
-- tablo/fonksiyon ekler, mevcut tablolara dokunmaz. Önce kod deploy edilebilir —
-- tablo/fonksiyon yokken kod "sayaç yok" gibi davranır (açık geçer), mevcut mesajlaşma
-- ve plan/ödeme akışı aynen çalışır.
--
-- Terimler:
--   utility   = randevu onay/hatırlatma/iptal/revizyon/yeni saat önerisi (plana dahil aylık hak,
--               dolunca satın alınan ek utility kredisi düşer)
--   marketing = WhatsApp kampanya mesajı (plana dahil DEĞİL; yalnızca satın alınan kampanya kredisi)
--
-- Dönem (yenilenme): takvim ayı DEĞİL, abonelik BAŞLANGIÇ tarihinin aylık yıldönümü. Dönem anahtarını
-- (p_period) uygulama hesaplar (org_message_cycle.anchor → lib/wa-cycle.ts); fonksiyonlar yalnızca o
-- anahtarla sayar. Her yeni dönemde yeni satır açılır = utility_used sıfırdan başlar, ek kredi devreder.
--
-- Güvenlik modeli (SMS kontörüyle aynı): tüm tablolar RLS açık + politika YOK, tüm
-- fonksiyonlar yalnızca service_role çağırır → bir kiracı kendi/başkasının bakiyesini
-- okuyamaz, yazamaz, tüketemez. Panel göstergeleri sunucuda admin client ile okunur.

-- ─── 0) Abonelik döngüsü çıpası ──────────────────────────────
-- anchor = geçerli plan aboneliğinin faturalama çıpası (Stripe billing_cycle_anchor; yükseltmede "şimdi"ye
-- kayar) ya da deneme başlangıcı. Stripe webhook'u yazar; kayıt yoksa uygulama Stripe'tan bir kez okuyup
-- doldurur, o da olmazsa takvim ayına düşer.
CREATE TABLE IF NOT EXISTS org_message_cycle (
  org_id     UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  anchor     TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_message_cycle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_message_cycle FROM PUBLIC, anon, authenticated;

-- ─── 1) Aylık kullanım ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_message_usage (
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period         DATE NOT NULL,                       -- dönem başlangıcı (UTC tarihi; abonelik yıldönümü ya da takvim ayı)
  utility_used   INT  NOT NULL DEFAULT 0 CHECK (utility_used >= 0),
  marketing_used INT  NOT NULL DEFAULT 0 CHECK (marketing_used >= 0),
  utility_quota  INT,                                 -- o ay için son bilinen plan kotası (gösterim/denetim)
  last_reset     TIMESTAMPTZ NOT NULL DEFAULT now(),  -- bu dönem satırının açıldığı an
  PRIMARY KEY (org_id, period)
);

ALTER TABLE org_message_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_message_usage FROM PUBLIC, anon, authenticated;

-- ─── 2) Ek kredi bakiyesi (aya göre sıfırlanmaz, devreder) ───
CREATE TABLE IF NOT EXISTS org_message_addons (
  org_id          UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  utility_balance   INT NOT NULL DEFAULT 0 CHECK (utility_balance >= 0),
  marketing_balance INT NOT NULL DEFAULT 0 CHECK (marketing_balance >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_message_addons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_message_addons FROM PUBLIC, anon, authenticated;

-- ─── 3) Satın alma kayıtları (idempotency = Stripe oturum id) ─
CREATE TABLE IF NOT EXISTS org_message_purchases (
  stripe_session_id TEXT PRIMARY KEY,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('utility', 'marketing')),
  credits           INT  NOT NULL CHECK (credits > 0),
  amount_total      INT,
  currency          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_message_purchases_org ON org_message_purchases (org_id, created_at DESC);

ALTER TABLE org_message_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_message_purchases FROM PUBLIC, anon, authenticated;

-- ─── 4) Atomik fonksiyonlar ──────────────────────────────────

-- Bir UTILITY mesaj hakkı tüketir. Önce plan kotası, dolunca ek kredi.
--   'plan'      → plan kotasından düştü
--   'addon'     → ek krediden düştü
--   'plan_over' → kota doldu, ek kredi yok, ama p_enforce=false: sadece SAYILDI, gönderime izin
--   'exceeded'  → kota+kredi yok ve p_enforce=true: hiçbir şey değişmez, GÖNDERME
-- p_quota NULL → sınırsız plan (yalnızca sayılır).
CREATE OR REPLACE FUNCTION consume_wa_utility(p_org UUID, p_quota INT, p_enforce BOOLEAN, p_period DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := p_period;
  v_used   INT;
  v_bal    INT;
BEGIN
  INSERT INTO org_message_usage (org_id, period, utility_quota)
  VALUES (p_org, v_period, p_quota)
  ON CONFLICT (org_id, period) DO NOTHING;

  -- Satırı kilitle: aynı org için eşzamanlı gönderimler sıraya girer (çift sayım yok).
  SELECT utility_used INTO v_used
    FROM org_message_usage
   WHERE org_id = p_org AND period = v_period
   FOR UPDATE;

  IF p_quota IS NULL OR v_used < p_quota THEN
    UPDATE org_message_usage
       SET utility_used = utility_used + 1, utility_quota = p_quota
     WHERE org_id = p_org AND period = v_period;
    RETURN 'plan';
  END IF;

  UPDATE org_message_addons
     SET utility_balance = utility_balance - 1, updated_at = now()
   WHERE org_id = p_org AND utility_balance > 0
  RETURNING utility_balance INTO v_bal;

  IF v_bal IS NOT NULL THEN
    UPDATE org_message_usage SET utility_quota = p_quota
     WHERE org_id = p_org AND period = v_period;
    RETURN 'addon';
  END IF;

  IF p_enforce THEN
    RETURN 'exceeded';
  END IF;

  UPDATE org_message_usage
     SET utility_used = utility_used + 1, utility_quota = p_quota
   WHERE org_id = p_org AND period = v_period;
  RETURN 'plan_over';
END;
$$;

-- Gönderim Meta'ya gitmediyse hakkı geri verir. p_source = consume_wa_utility'nin döndürdüğü değer.
CREATE OR REPLACE FUNCTION release_wa_utility(p_org UUID, p_source TEXT, p_period DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := p_period;
BEGIN
  IF p_source = 'addon' THEN
    UPDATE org_message_addons
       SET utility_balance = utility_balance + 1, updated_at = now()
     WHERE org_id = p_org;
  ELSIF p_source IN ('plan', 'plan_over') THEN
    UPDATE org_message_usage
       SET utility_used = GREATEST(utility_used - 1, 0)
     WHERE org_id = p_org AND period = v_period;
  END IF;
END;
$$;

-- Bir KAMPANYA (marketing) kredisi tüketir. Bakiye yoksa false (gönderme).
CREATE OR REPLACE FUNCTION consume_wa_marketing(p_org UUID, p_period DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := p_period;
  v_bal    INT;
BEGIN
  UPDATE org_message_addons
     SET marketing_balance = marketing_balance - 1, updated_at = now()
   WHERE org_id = p_org AND marketing_balance > 0
  RETURNING marketing_balance INTO v_bal;

  IF v_bal IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO org_message_usage (org_id, period, marketing_used)
  VALUES (p_org, v_period, 1)
  ON CONFLICT (org_id, period)
  DO UPDATE SET marketing_used = org_message_usage.marketing_used + 1;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION release_wa_marketing(p_org UUID, p_period DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := p_period;
BEGIN
  UPDATE org_message_addons
     SET marketing_balance = marketing_balance + 1, updated_at = now()
   WHERE org_id = p_org;
  UPDATE org_message_usage
     SET marketing_used = GREATEST(marketing_used - 1, 0)
   WHERE org_id = p_org AND period = v_period;
END;
$$;

-- Satın alınan krediyi yükler. Aynı Stripe oturumu ikinci kez gelirse dokunmaz, false döner.
CREATE OR REPLACE FUNCTION add_wa_credits(
  p_org UUID, p_kind TEXT, p_credits INT, p_session TEXT, p_amount INT, p_currency TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted TEXT;
BEGIN
  IF p_kind NOT IN ('utility', 'marketing') OR p_credits IS NULL OR p_credits <= 0 OR p_session IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO org_message_purchases (stripe_session_id, org_id, kind, credits, amount_total, currency)
  VALUES (p_session, p_org, p_kind, p_credits, p_amount, p_currency)
  ON CONFLICT (stripe_session_id) DO NOTHING
  RETURNING stripe_session_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO org_message_addons (org_id, utility_balance, marketing_balance)
  VALUES (
    p_org,
    CASE WHEN p_kind = 'utility'   THEN p_credits ELSE 0 END,
    CASE WHEN p_kind = 'marketing' THEN p_credits ELSE 0 END
  )
  ON CONFLICT (org_id) DO UPDATE SET
    utility_balance   = org_message_addons.utility_balance   + CASE WHEN p_kind = 'utility'   THEN p_credits ELSE 0 END,
    marketing_balance = org_message_addons.marketing_balance + CASE WHEN p_kind = 'marketing' THEN p_credits ELSE 0 END,
    updated_at = now();

  RETURN TRUE;
END;
$$;

-- Yalnızca sunucu (service_role) çağırabilir.
REVOKE ALL ON FUNCTION consume_wa_utility(UUID, INT, BOOLEAN, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_wa_utility(UUID, TEXT, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION consume_wa_marketing(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_wa_marketing(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION add_wa_credits(UUID, TEXT, INT, TEXT, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_wa_utility(UUID, INT, BOOLEAN, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION release_wa_utility(UUID, TEXT, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION consume_wa_marketing(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION release_wa_marketing(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION add_wa_credits(UUID, TEXT, INT, TEXT, INT, TEXT) TO service_role;
