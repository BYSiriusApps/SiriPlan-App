-- ============================================================
-- Pro/Business abonelere özel "Website Modu": randevu linkini
-- (/r/[slug]) sade panelden internet sitesi görünümüne çevirme.
-- feature_website  = plan bazlı erişim hakkı (Pro/Business = true)
-- website_enabled  = işletme sahibinin kendi aç/kapa tercihi
-- Website modu SADECE ikisi de true ise gösterilir; plan düşünce
-- feature_website false olur, website_enabled DB'de true kalsa
-- bile sayfa otomatik sade panele döner.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS feature_website BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS website_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS website_palette TEXT NOT NULL DEFAULT 'rose',
  ADD COLUMN IF NOT EXISTS google_review_url TEXT,
  ADD COLUMN IF NOT EXISTS website_tagline TEXT;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_website_palette_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_website_palette_check
  CHECK (website_palette IN ('rose', 'ocean', 'sage', 'dark', 'sunset', 'midnight'));

NOTIFY pgrst, 'reload schema';
