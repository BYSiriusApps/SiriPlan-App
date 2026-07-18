-- ============================================================
-- 013 — Çoklu işletme (multi-org) RLS düzeltmesi + Platform Admin
--
-- SORUN: get_my_org_id() LIMIT 1 ile tek org döndürüyordu.
-- Bir kullanıcı birden fazla işletmeye üye olduğunda (örn. hem
-- kendi salonu var hem başka salonda personel) ikinci işletmenin
-- verisine RLS izin vermiyordu ve .single() sorguları patlıyordu.
--
-- ÇÖZÜM: is_org_member(org_id) — kullanıcının ÜYESİ OLDUĞU TÜM
-- işletmeler için erişim. Aktif işletme seçimi uygulama katmanında
-- (active_org cookie) yapılır; her sorgu zaten org_id filtreler.
-- ============================================================

-- ─── Yardımcı fonksiyonlar ───────────────────────────────────
CREATE OR REPLACE FUNCTION is_org_member(p_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
     WHERE user_id = auth.uid() AND org_id = p_org
  );
$$;

-- Rol bazlı kontrol (DB-katmanı yetki denetimi için)
CREATE OR REPLACE FUNCTION my_org_role(p_org UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM org_members
   WHERE user_id = auth.uid() AND org_id = p_org
   LIMIT 1;
$$;

-- ─── ORGANIZATIONS ───────────────────────────────────────────
DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (is_org_member(id));

DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "orgs_update_members" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (is_org_member(id) AND my_org_role(id) IN ('owner','manager'));

-- ─── ORG MEMBERS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "members_select" ON org_members;
CREATE POLICY "members_select" ON org_members FOR SELECT
  USING (user_id = auth.uid() OR is_org_member(org_id));

DROP POLICY IF EXISTS "members_insert" ON org_members;
CREATE POLICY "members_insert" ON org_members FOR INSERT
  WITH CHECK (is_org_member(org_id) AND my_org_role(org_id) IN ('owner','manager'));

DROP POLICY IF EXISTS "members_update" ON org_members;
CREATE POLICY "members_update" ON org_members FOR UPDATE
  USING (is_org_member(org_id) AND my_org_role(org_id) IN ('owner','manager'));

DROP POLICY IF EXISTS "members_delete" ON org_members;
CREATE POLICY "members_delete" ON org_members FOR DELETE
  USING (
    is_org_member(org_id)
    AND my_org_role(org_id) IN ('owner','manager')
    AND user_id <> auth.uid()          -- kendi üyeliğini silemez
  );

-- ─── Org-scoped tablolar: get_my_org_id → is_org_member ─────
DROP POLICY IF EXISTS "staff_all" ON staff;
CREATE POLICY "staff_all" ON staff FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "services_all" ON services;
CREATE POLICY "services_all" ON services FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "staff_services_all" ON staff_services;
CREATE POLICY "staff_services_all" ON staff_services FOR ALL
  USING (EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND is_org_member(s.org_id)));

DROP POLICY IF EXISTS "customers_all" ON customers;
CREATE POLICY "customers_all" ON customers FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "appointments_all" ON appointments;
CREATE POLICY "appointments_all" ON appointments FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "loyalty_all" ON loyalty_redeems;
CREATE POLICY "loyalty_all" ON loyalty_redeems FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "waitlist_all" ON waitlist;
CREATE POLICY "waitlist_all" ON waitlist FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "campaigns_all" ON campaigns;
CREATE POLICY "campaigns_all" ON campaigns FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "campaign_logs_all" ON campaign_logs;
CREATE POLICY "campaign_logs_all" ON campaign_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND is_org_member(c.org_id)));

DROP POLICY IF EXISTS "perf_all" ON staff_performance_weekly;
CREATE POLICY "perf_all" ON staff_performance_weekly FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "badges_all" ON staff_badges;
CREATE POLICY "badges_all" ON staff_badges FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "imports_all" ON data_imports;
CREATE POLICY "imports_all" ON data_imports FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (is_org_member(org_id));

-- expenses (002 + 20260630'daki her iki policy adı da temizlenir)
DROP POLICY IF EXISTS "expenses_all" ON expenses;
DROP POLICY IF EXISTS "expenses_org_members" ON expenses;
CREATE POLICY "expenses_all" ON expenses FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "recurring_expenses_all" ON recurring_expenses;
CREATE POLICY "recurring_expenses_all" ON recurring_expenses FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- appointment_requests (012'de IN-subquery formuna alınmıştı; standardize et)
DROP POLICY IF EXISTS "org_members_manage_requests" ON appointment_requests;
CREATE POLICY "org_members_manage_requests" ON appointment_requests FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- ============================================================
-- PLATFORM ADMINS — uygulama sahibinin süper admin paneli
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Sadece kendi kaydını okuyabilir (admin API'leri service_role kullanır)
DROP POLICY IF EXISTS "platform_admins_self_read" ON platform_admins;
CREATE POLICY "platform_admins_self_read" ON platform_admins FOR SELECT
  USING (user_id = auth.uid());

-- Uygulama sahibini tohumla (auth kullanıcısı mevcutsa)
INSERT INTO platform_admins (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'ustuayozgun@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Yeni kayıt olan kullanıcı admin e-postasıyla eşleşirse otomatik ekle
CREATE OR REPLACE FUNCTION seed_platform_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'ustuayozgun@gmail.com' THEN
    INSERT INTO platform_admins (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_platform_admin ON auth.users;
CREATE TRIGGER trg_seed_platform_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_platform_admin();

-- ─── İndeksler ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON org_members(user_id, org_id);
