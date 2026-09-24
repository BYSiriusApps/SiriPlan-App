-- ============================================================
-- SIRIPLAN — Stok: Barkod alanı (barkodla perakende satış)
-- Tarih: 2026-09-12
-- Supabase Dashboard → SQL Editor'e yapıştırıp çalıştırın. İdempotenttir.
--
-- Amaç: telefon kamerasıyla barkod okutup tek dokunuşta perakende satış
-- (mevcut "Stok Çıkışı" akışı). Ürünü barkoddan bulmak için tek yeni kolon.
--
-- GÜVENLİK / İZOLASYON:
--  * barcode benzersizliği KİRACI BAŞINA (org_id, barcode) — global değil.
--    İki farklı salon aynı üründeki aynı EAN-13'ü tutabilir; ama bir salonda
--    aynı barkod iki ürüne bağlanamaz.
--  * Aramalar uygulama tarafında her zaman org_id ile sınırlı + RLS
--    (inventory_items_member: is_org_member(org_id)) ikinci kat.
--  * Üretilen iç barkodlar (barcode_source = 'generated') uygulamada
--    kriptografik rastgele üretilir (SP + base32), sıralı/tahmin edilebilir değil.
--
-- Ana stok/gelir-gider/rapor/bildirim akışı DEĞİŞMEZ: satış hâlâ bir
-- inventory_transactions (type='out') kaydıdır, recordInventoryTransaction
-- üzerinden gelir kaydı + kritik stok bildirimi otomatik yapılır.
-- ============================================================

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode_source text
  CHECK (barcode_source IS NULL OR barcode_source IN ('manual', 'generated'));

-- Kiracı başına benzersiz; NULL barkodlar kısıttan muaf (kısmi indeks).
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_barcode_per_org
  ON inventory_items(org_id, barcode)
  WHERE barcode IS NOT NULL;

-- Barkoddan hızlı arama (tarama uçları için).
CREATE INDEX IF NOT EXISTS idx_inventory_barcode_lookup
  ON inventory_items(org_id, barcode)
  WHERE barcode IS NOT NULL AND is_active;

NOTIFY pgrst, 'reload schema';
