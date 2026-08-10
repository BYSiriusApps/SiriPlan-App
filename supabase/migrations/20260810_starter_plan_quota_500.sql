-- ============================================================
-- Starter paketi randevu kotasını 300 -> 500'e yükselt
--
-- src/lib/stripe/config.ts içindeki PLANS.starter.max_appointments_monthly
-- 500 olarak güncellendi; bu migration mevcut starter plandaki
-- organizasyonların DB'deki kota değerini de günceller (yeni değer
-- yalnızca yeni checkout/webhook tetiklemelerinde uygulanırdı).
-- ============================================================

UPDATE organizations
   SET max_appointments_monthly = 500
 WHERE plan = 'starter'
   AND max_appointments_monthly = 300;
