-- ============================================================
-- Website modunda Instagram/TikTok'a ek olarak Facebook ve LinkedIn
-- ikon/linki gösterebilmek için. Aynı desen: sade kullanıcı adı/sayfa
-- adı (@ olmadan) saklanır, URL görüntülenirken kurulur.
-- (bkz. 20260815_org_tiktok_handle.sql — aynı desen)
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_handle TEXT;

NOTIFY pgrst, 'reload schema';
