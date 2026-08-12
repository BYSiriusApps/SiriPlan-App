-- ============================================================
-- Hizmet ve kategori fotoğrafları için Supabase Storage bucket + RLS
-- Dosya yolu konvansiyonu: {org_id}/services/{service_id}.{ext}
--                          {org_id}/categories/{category_id}.{ext}
-- (org_id her zaman path'in ilk segmanı — org-logos ile aynı RLS deseni)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  3145728,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "service_photos_public_read" ON storage.objects;
CREATE POLICY "service_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'service-photos');

DROP POLICY IF EXISTS "service_photos_org_insert" ON storage.objects;
CREATE POLICY "service_photos_org_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_photos_org_update" ON storage.objects;
CREATE POLICY "service_photos_org_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_photos_org_delete" ON storage.objects;
CREATE POLICY "service_photos_org_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
