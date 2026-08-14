-- ============================================================
-- Hizmet kategorisi foto galerisi (Website Modu): tek photo_url
-- (kapak) yanında kategori başına çoklu fotoğraf ekleyip
-- çıkarabilme. Kategori başına en fazla 20 foto — client-side
-- kontrolün yanında burada trigger'la DB seviyesinde de garanti
-- altına alınır (bkz. service_category_photos yorum notu).
-- Depolama: mevcut "service-photos" bucket'ı, yol konvansiyonu
-- {org_id}/categories/{category_id}/{photo_id}.{ext} — storage RLS
-- politikaları (20260812_service_photos_storage.sql) sadece path'in
-- ilk segmanına (org_id) baktığı için değişiklik gerekmiyor.
-- ============================================================

CREATE TABLE IF NOT EXISTS service_category_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_category_photos_category_order
  ON service_category_photos(category_id, display_order);

ALTER TABLE service_category_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_category_photos_all" ON service_category_photos;
CREATE POLICY "service_category_photos_all" ON service_category_photos FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());

DROP POLICY IF EXISTS "public_service_category_photos_read" ON service_category_photos;
CREATE POLICY "public_service_category_photos_read" ON service_category_photos FOR SELECT TO anon
  USING (TRUE);

-- Kategori başına 20 foto limiti — arayüz de aynı limiti uygular,
-- ama API/DB seviyesinde de garanti altına alınmalı.
CREATE OR REPLACE FUNCTION enforce_service_category_photos_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM service_category_photos WHERE category_id = NEW.category_id) >= 20 THEN
    RAISE EXCEPTION 'Bir kategoriye en fazla 20 fotoğraf eklenebilir';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_category_photos_limit ON service_category_photos;
CREATE TRIGGER trg_service_category_photos_limit
  BEFORE INSERT ON service_category_photos
  FOR EACH ROW EXECUTE FUNCTION enforce_service_category_photos_limit();

NOTIFY pgrst, 'reload schema';
