-- ============================================================
-- Website Modu için hizmet alanları: kategori bağlantısı, fotoğraf,
-- ve serbest bırakılabilir fiyat/süre (vitrin-only hizmetler için —
-- örn. "Gelinlik Paketi — bilgi için arayın"). Online randevuya açık
-- (is_bookable_online = true) hizmetlerde price/duration_minutes'in
-- boş olmaması API katmanında zorlanır, DB constraint'i değildir.
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE services ALTER COLUMN price DROP NOT NULL;
ALTER TABLE services ALTER COLUMN duration_minutes DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

NOTIFY pgrst, 'reload schema';
