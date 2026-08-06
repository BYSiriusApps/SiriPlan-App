-- ============================================================
-- Ücretsiz deneme süresi varsayılanı 14 güne sabitlenir.
-- Not: kayıt akışları (quick-register, auth/callback,
-- complete-registration) trial_ends_at'i zaten kodda açıkça
-- hesaplayıp gönderiyor — bu DEFAULT yalnızca değeri belirtilmeden
-- yapılan insert'ler için bir güvenlik ağı.
-- ============================================================

ALTER TABLE organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '14 days');
