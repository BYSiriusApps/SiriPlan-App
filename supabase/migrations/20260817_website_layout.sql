-- ============================================================
-- Randevu sayfası (website modu) için ŞABLON seçimi.
--
-- website_palette "hangi renkler" sorusunu cevaplıyordu; bu kolon
-- "hangi yerleşim" sorusunu cevaplar:
--
--   classic  — mevcut davranış: sayfa doğrudan 3 adımlı randevu
--              sihirbazıyla açılır, kategoriler liste halinde.
--   showcase — vitrin: tam genişlik hero, büyük kategori kartları,
--              galeri mozaiği, bilgi şeridi; randevu formu sayfanın
--              altında ve mobilde sabit "Randevu Al" butonuyla.
--
-- Varsayılan 'classic': bu migration uygulandığında hiçbir mevcut
-- salonun sayfası değişmez, şablonu bilinçli seçen değişir.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS website_layout TEXT NOT NULL DEFAULT 'classic';

-- Bilinmeyen bir değer sayfayı kırmasın diye veritabanı seviyesinde de kısıtlanır.
-- (İstemci tarafı ayrıca WEBSITE_LAYOUTS sözlüğünde bulunmayan değeri
--  'classic'e düşürür — bkz. src/lib/website-layouts.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_website_layout_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_website_layout_check
      CHECK (website_layout IN ('classic', 'showcase'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
