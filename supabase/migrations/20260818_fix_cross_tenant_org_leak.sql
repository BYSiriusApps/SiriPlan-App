-- ============================================================
-- 🔴 KRİTİK — ÇAPRAZ-KİRACI SIZINTISI: organizations tablosu
--
-- BULGU (scripts/security/tenant-isolation.mjs ile canlıda doğrulandı):
-- Giriş yapmış HERHANGİ bir kullanıcı — platformdaki herhangi bir salonun
-- herhangi bir personeli dahil — PLATFORMDAKİ TÜM SALONLARIN organizations
-- satırını okuyabiliyordu:
--
--   wa_token, sms_password, ig_page_access_token, google_calendar_token,
--   stripe_customer_id, stripe_subscription_id, e-posta, telefon, adres…
--
-- Yani bir salon çalışanı, rakip salonların WhatsApp erişim jetonunu alıp
-- onların adına müşterilerine mesaj gönderebilirdi.
--
-- KÖK NEDEN:
-- 20260630_security_expenses_indexes.sql, o tarihte /r/[slug] randevu sayfası
-- veriyi doğrudan tarayıcıdan çektiği için şu policy'yi eklemişti:
--
--     CREATE POLICY "orgs_select_public" ON organizations
--       FOR SELECT USING (true);
--
-- Bu policy `TO anon` ile SINIRLANDIRILMAMIŞTI — yani PUBLIC, dolayısıyla
-- authenticated rolü de kapsıyordu. 013_multi_org_rls_platform_admins.sql
-- daha sonra doğru policy'yi (org_select → is_org_member(id)) ekledi ama
-- ESKİSİNİ DÜŞÜRMEDİ. RLS policy'leri VEYA (OR) ile birleşir; dolayısıyla
-- `USING (true)` her zaman kazandı ve is_org_member kontrolü hiç devreye
-- girmedi.
--
-- 20260817_public_data_lockdown.sql neden yakalamadı: o migration yalnızca
-- ANON rolünü hedefliyordu (anon'un tablo GRANT'ini geri aldı). authenticated
-- rolünün GRANT'i durduğu için `orgs_select_public` giriş yapmış kullanıcılar
-- için çalışmaya devam etti.
--
-- PANEL / RANDEVU ETKİSİ: YOK.
--   • Panel yalnızca kendi işletmesini okur; org_select (is_org_member) bunu
--     zaten karşılıyor.
--   • Herkese açık randevu sayfası (/r/[slug]) veriyi artık tarayıcıdan değil
--     /api/public/salon üzerinden, service role + kolon beyaz listesiyle
--     alıyor; service role RLS'e hiç takılmaz.
--   • /admin paneli de service role kullanır.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- A) Sızdıran policy'yi kaldır
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orgs_select_public" ON organizations;

-- 20260630'daki diğer policy'ler de 013'ün rol denetimli sürümleriyle
-- çakışıyor (orgs_update_members rol ayrımı yapmaz: staff rolündeki bir
-- kullanıcı da işletme ayarlarını değiştirebilirdi). Dosya sırası nedeniyle
-- 013'ten SONRA uygulanmış olabilecekleri için burada kesin olarak düşürülür.
DROP POLICY IF EXISTS "orgs_update_members" ON organizations;

-- ─────────────────────────────────────────────────────────────
-- B) Doğru policy'leri yeniden kur (013 ile birebir aynı — idempotent)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (is_org_member(id));

DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (is_org_member(id) AND my_org_role(id) IN ('owner','manager'));

-- ─────────────────────────────────────────────────────────────
-- C) anon'un GRANT'i kalmış tablolar
--    20260817_public_data_lockdown.sql'in listesinde olmayan tablolar;
--    policy'leri olmadığı için bugün veri dönmüyor ama GRANT durduğu sürece
--    ileride eklenecek tek bir policy veriyi anında açar (fail-open).
--    Test çıktısı: "HTTP 200 / 0 satır" → policy yok, GRANT var.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recurring_expenses', 'platform_admins', 'data_imports',
    'loyalty_redeems', 'staff_performance_weekly', 'staff_badges',
    'expenses', 'staff_time_off', 'customer_consents'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- D) SECURITY DEFINER yardımcı fonksiyonları anon'a kapat
--    is_org_member/my_org_role RLS'i atlayarak org_members tablosunu okur.
--    anon için her zaman false/NULL döndürürler (auth.uid() boştur), ama
--    anon'a EXECUTE vermek için hiçbir sebep yok: bu fonksiyonlar yalnızca
--    policy değerlendirmesi sırasında çağrılır, orada rol kısıtı işlemez.
-- ─────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION is_org_member(UUID) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION my_org_role(UUID)   FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION is_org_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION my_org_role(UUID)   TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
