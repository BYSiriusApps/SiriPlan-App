-- ============================================================
-- İşletme saat dilimi — global kullanım için. Varsayılan Europe/Istanbul
-- (mevcut tüm işletmeler için davranış aynı kalır); işletme sahibi kayıt
-- esnasında veya Ayarlar'dan IANA timezone adı ("America/New_York" gibi)
-- seçerek değiştirebilir. Randevu müsaitlik hesaplamaları ve bildirim
-- mesajları bu alana göre hesaplanır.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul';

NOTIFY pgrst, 'reload schema';
