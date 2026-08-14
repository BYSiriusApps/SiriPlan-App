-- ============================================================
-- 20260814 — plan ile feature_* kolonlarını eşitler (tek seferlik onarım).
--
-- SORUN: /api/admin/orgs/[id] (platform admin panelinden plan değiştirme)
-- şimdiye kadar sadece `plan` kolonunu yazıyordu; feature_ai/campaigns/
-- gamification/api/whitelabel/website kolonları yalnızca Stripe webhook'u
-- (checkout.session.completed / customer.subscription.updated) tarafından
-- güncelleniyordu. Admin panelinden elle "pro" yapılan bir işletme bu
-- yüzden plan='pro' olsa da feature_website=false kalmaya devam ediyor,
-- panelde "Pro Plana Geç" ekranı çıkmaya devam ediyordu (bkz. kod
-- düzeltmesi: route.ts artık plan değişiminde feature_* kolonlarını da
-- yazıyor). Bu dosya, düzeltmeden ÖNCE bu şekilde bozulmuş kayıtları
-- (plan='pro'/'business' ama features starter seviyesinde kalmış) onarır.
-- trial/starter dokunulmuz — trial zaten canlı hesaplanıyor (bkz.
-- src/lib/entitlements.ts), starter'ın features'ı zaten hepsi false.
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRIN.
-- ============================================================

UPDATE organizations
SET feature_ai = false,
    feature_campaigns = true,
    feature_gamification = true,
    feature_api = false,
    feature_whitelabel = false,
    feature_website = true
WHERE plan = 'pro'
  AND (feature_campaigns IS NOT TRUE OR feature_gamification IS NOT TRUE OR feature_website IS NOT TRUE);

UPDATE organizations
SET feature_ai = true,
    feature_campaigns = true,
    feature_gamification = true,
    feature_api = true,
    feature_whitelabel = true,
    feature_website = true
WHERE plan = 'business'
  AND (feature_ai IS NOT TRUE OR feature_campaigns IS NOT TRUE OR feature_gamification IS NOT TRUE
       OR feature_api IS NOT TRUE OR feature_whitelabel IS NOT TRUE OR feature_website IS NOT TRUE);
