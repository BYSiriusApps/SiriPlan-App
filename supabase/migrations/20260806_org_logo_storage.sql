-- ============================================================
-- İşletme logosu için Supabase Storage bucket + RLS politikaları
-- Dosya yolu konvansiyonu: {org_id}/logo.{ext}
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

DROP POLICY IF EXISTS "org_logos_public_read" ON storage.objects;
CREATE POLICY "org_logos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

DROP POLICY IF EXISTS "org_logos_org_insert" ON storage.objects;
CREATE POLICY "org_logos_org_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_logos_org_update" ON storage.objects;
CREATE POLICY "org_logos_org_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_logos_org_delete" ON storage.objects;
CREATE POLICY "org_logos_org_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
