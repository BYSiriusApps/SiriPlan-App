-- ============================================================
-- 1) organizations.tax_number — VKN / TC Kimlik No (opsiyonel)
-- 2) customers tablosunda DELETE yetkisinin daraltılması
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) VKN / TCKN
--    Kayıt sırasında ve Ayarlar > İşletme Bilgileri'nden opsiyonel olarak
--    doldurulur; fatura/sözleşme süreçleri için tutulur. Kolon yalnızca
--    işletme üyelerine görünür (org_select → is_org_member) ve herkese açık
--    randevu sayfasına giden /api/public/salon kolon beyaz listesinde YOKTUR.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_number TEXT;

COMMENT ON COLUMN organizations.tax_number IS
  'Vergi Kimlik No (10 hane) veya TC Kimlik No (11 hane). Opsiyonel; yalnızca rakam.';

-- ─────────────────────────────────────────────────────────────
-- 2) Müşteri silme yetkisi
--
-- 013_multi_org_rls_platform_admins.sql tek bir "customers_all FOR ALL"
-- policy'si tanımlıyordu: işletmenin HER üyesi — en kısıtlı personel dahil —
-- müşteri satırı silebiliyordu. Panelde silme arayüzü olmadığı için bugüne
-- kadar fark edilmedi, ama tarayıcıdan doğrudan Supabase çağrısıyla
-- kullanılabilirdi.
--
-- FOR ALL permissive bir policy olduğu için üzerine kısıtlayıcı bir policy
-- eklemek yetmez (permissive policy'ler OR ile birleşir); bu yüzden
-- SELECT/INSERT/UPDATE ayrı ayrı yeniden kurulur ve DELETE yalnızca
-- owner/manager'a verilir. Panelin silme akışı zaten service role kullanan
-- DELETE /api/customers/[id] ucundan geçer ve orada `delete_customers` izni
-- ayrıca denetlenir; bu policy tarayıcıdan gelen doğrudan çağrılar için
-- ikinci savunma hattıdır.
--
-- ETKİ: müşteri okuma/ekleme/güncelleme davranışı birebir aynı kalır —
-- randevu oluşturma, müşteri kartı düzenleme, veri göçü etkilenmez.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_all" ON customers;

CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (is_org_member(org_id));

CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "customers_delete" ON customers FOR DELETE
  USING (is_org_member(org_id) AND my_org_role(org_id) IN ('owner','manager'));

NOTIFY pgrst, 'reload schema';
