-- ============================================================
-- Deneme (trial) süresi artık Pro plana denk özellikler sunuyor.
--
-- Uygulama tarafında feature_* yetkileri plan + trial_ends_at'ten CANLI
-- hesaplanır (src/lib/entitlements.ts) — deneme bitince kendiliğinden kapanır,
-- bu yüzden feature_* kolonlarına YAZMIYORUZ.
--
-- Ancak randevu kotası DB trigger'ı (check_appointment_quota) doğrudan
-- max_appointments_monthly kolonunu okur. Bu yüzden AKTİF denemedeki mevcut
-- işletmelerin personel/randevu limitlerini Pro seviyesine (sınırsız) çekiyoruz.
-- Yeni kayıtlar bu limitleri zaten kayıt anında alıyor (bkz. TRIAL_PLAN_LIMITS).
-- ============================================================

UPDATE organizations
   SET max_staff = 999,
       max_appointments_monthly = 999999
 WHERE plan = 'trial'
   AND trial_ends_at IS NOT NULL
   AND trial_ends_at > NOW();
