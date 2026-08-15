-- ============================================================
-- Website modunda (randevu linki) Instagram'a ek olarak TikTok
-- ikon/linki gösterebilmek için. instagram_handle ile aynı desen:
-- sade kullanıcı adı (@ olmadan) saklanır, URL görüntülenirken kurulur.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;

NOTIFY pgrst, 'reload schema';
