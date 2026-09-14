-- ============================================================
-- KDV (tahmini vergi) hesaplama özelliği artık varsayılan olarak
-- açık geliyor — hem yeni işletmeler için hem de mevcutlar için.
-- Oran (kdv_rate) hâlâ organizasyon bazında Ayarlar sayfasından
-- düzenlenebilir; yasal oran değiştiğinde her işletme kendi oranını
-- orada günceller, kodda hiçbir yerde sabit kodlanmaz.
-- ============================================================

ALTER TABLE organizations
  ALTER COLUMN kdv_enabled SET DEFAULT TRUE;

-- Mevcut işletmelerde hâlâ varsayılan (kapalı) durumda olanları aç.
-- Daha önce elle kapatılmış olabilecekleri ayırt etmenin bir yolu yok,
-- ama bu salt bilgilendirici bir gösterge (Gelir-Gider/Raporlar'da
-- "Tahmini KDV" kartı) — Ayarlar → KDV Hesaplama'dan tek tıkla
-- tekrar kapatılabilir.
UPDATE organizations SET kdv_enabled = TRUE WHERE kdv_enabled = FALSE;

NOTIFY pgrst, 'reload schema';
