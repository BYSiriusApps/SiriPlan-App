-- ============================================================
-- SIRIPLAN — Yeni kullanıcı kurulum turu (onboarding)
-- Tarih: 2026-09-07
-- Supabase SQL Editor'da çalıştırılmalı (idempotent)
--
-- Tek bir zaman damgası kolonu:
--   NULL  → işletme henüz turu görmedi → panelde karşılama kutusu çıkar
--   dolu  → tur tamamlandı ya da "atla" dendi → kutu bir daha çıkmaz
--
-- Yazma yolu: ayarlar sayfasının kullandığı client → organizations UPDATE
-- ile aynı (org_update RLS: yalnızca owner/manager). Yeni API/tablo YOK.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_tour_completed_at timestamptz;

-- Mevcut işletmeler turu görmemeli — yalnızca bu andan SONRA kaydolanlar.
UPDATE organizations
   SET onboarding_tour_completed_at = now()
 WHERE onboarding_tour_completed_at IS NULL;

NOTIFY pgrst, 'reload schema';
