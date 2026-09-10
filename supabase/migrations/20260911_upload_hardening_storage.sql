-- ============================================================
-- Görsel yükleme sertleştirme — Storage tarafı
--
-- Bağlam: Panel görsel yüklemeleri (logo, kapak, hizmet/kategori foto) artık
-- tarayıcıdan DOĞRUDAN Storage'a değil, `/api/uploads` üzerinden gidiyor. Sunucu
-- görseli doğruluyor + sharp ile piksel piksel yeniden üretiyor (gömülü
-- script/polyglot/virüs yükü atılır) + `service_role` ile yazıyor.
--
-- Bu migration:
--   1. `authenticated` kullanıcıların Storage'a DOĞRUDAN yazmasını kapatır
--      (INSERT/UPDATE politikaları kaldırılır). service_role RLS'i bypass ettiği
--      için API yolu etkilenmez.
--   2. `org-logos` bucket'ından `image/svg+xml` desteğini kaldırır — script
--      gömülü SVG herkese açık bucket'tan servis edilince stored-XSS oluyordu.
--
-- ÖNEMLİ — UYGULAMA SIRASI: Bu migration YALNIZCA yeni uygulama kodu (API +
-- güncellenmiş panel istemcisi) canlıya çıktıktan SONRA uygulanmalı. Ters
-- sırada, eski istemcinin doğrudan yüklemesi "permission denied" ile kırılır.
--
-- `*_public_read` ve `*_org_delete` politikaları KASITLI olarak korunuyor:
-- herkese açık okuma gerekli; silme hâlâ istemci tarafında (DB kolonu null'lama
-- + ileride storage temizliği) kullanılabilir.
-- ============================================================

-- 1) SVG'yi org-logos allowed_mime_types'tan çıkar
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'org-logos';

-- 2) Doğrudan (authenticated) yazım politikalarını kaldır — yazım artık yalnız API/service_role
DROP POLICY IF EXISTS "org_logos_org_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_logos_org_update" ON storage.objects;
DROP POLICY IF EXISTS "service_photos_org_insert" ON storage.objects;
DROP POLICY IF EXISTS "service_photos_org_update" ON storage.objects;

NOTIFY pgrst, 'reload schema';
