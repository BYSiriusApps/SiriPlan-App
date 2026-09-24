-- ============================================================
-- Önce/Sonra (before/after) müşteri fotoğrafları
--
-- Bağlam: Görsel-sonuç-odaklı sektörlerde (makyaj, estetik, dövme, güzellik,
-- nail, kaş/kirpik) salonun müşteriye gösterdiği önce/sonra fotoğraf çiftini
-- panelde saklaması istendi. Bu KVKK anlamında hassas kişisel veri (görüntü,
-- estetik/sağlık bağlamı içerebilir) olduğundan:
--   1. Bucket PUBLIC DEĞİL — diğer görsel bucket'larının (org-logos,
--      service-photos) aksine herkese açık okuma politikası YOK. Görseller
--      yalnızca sunucuda üretilen kısa ömürlü imzalı URL ile servis edilir.
--   2. Yazım/okuma/silme yalnızca `service_role` (API) veya org üyesi RLS'i
--      üzerinden — bkz. 20260911_upload_hardening_storage.sql ile aynı
--      sertleştirilmiş desen (authenticated INSERT/UPDATE politikası yok).
--   3. `consent_confirmed` sütunu NOT NULL DEFAULT false + API tarafında
--      zorunlu kılınır: personel her yüklemede müşteriden açık rıza aldığını
--      onaylamadan kayıt oluşturulamaz (bkz. src/app/api/customers/[id]/photos).
-- İdempotenttir.
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  before_path text NOT NULL,
  after_path text NOT NULL,
  note text,
  consent_confirmed boolean NOT NULL DEFAULT false,
  taken_at date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_photos_org_customer_idx
  ON customer_photos (org_id, customer_id, taken_at DESC);

ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_photos_member" ON customer_photos;
CREATE POLICY "customer_photos_member" ON customer_photos FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- Storage bucket: private (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-photos',
  'customer-photos',
  false,
  3145728,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Okuma da org üyeleriyle sınırlı (herkese açık DEĞİL) — asıl servis yolu
-- yine de API'nin ürettiği imzalı URL'dir; bu politika yalnız ikinci kat.
DROP POLICY IF EXISTS "customer_photos_org_select" ON storage.objects;
CREATE POLICY "customer_photos_org_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customer_photos_org_delete" ON storage.objects;
CREATE POLICY "customer_photos_org_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Yazım (INSERT/UPDATE) İÇİN authenticated politikası KASITLI olarak
-- eklenmiyor — yükleme yalnızca /api/uploads (service_role) üzerinden.

NOTIFY pgrst, 'reload schema';
