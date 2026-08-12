-- ============================================================
-- Hizmet kategorileri (Website Modu için): isim, sabit renk swatch'i,
-- fotoğraf ve sıralama taşıyan gerçek bir varlık. Mevcut services.category_tag
-- serbest metin alanı geriye dönük uyumluluk için korunuyor; yeni
-- website/admin akışları bu tablonun id'sini (services.category_id) kullanır.
-- ============================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT,  -- sabit swatch anahtarı (örn. "pink", "blue"), serbest hex değil
  photo_url     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_categories_org_order
  ON service_categories(org_id, display_order);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_categories_all" ON service_categories;
CREATE POLICY "service_categories_all" ON service_categories FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());

DROP POLICY IF EXISTS "public_service_categories_read" ON service_categories;
CREATE POLICY "public_service_categories_read" ON service_categories FOR SELECT TO anon
  USING (TRUE);

NOTIFY pgrst, 'reload schema';
