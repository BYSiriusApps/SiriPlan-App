-- 20261012 — Ek paketler (AI Asistan WA/IG + Ek Şube) için kiracı başına durum.
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent). Önce kod deploy edilebilir:
-- tablo yokken kod "ek paket yok" gibi davranır, mevcut plan/ödeme akışı aynen çalışır.
--
-- Neden organizations kolonu değil, ayrı tablo: organizations üzerindeki feature_*
-- kolonlarını her plan değişikliği (applyPlanToOrg) yeniden yazar; ek paket oraya
-- yazılsaydı bir sonraki plan değişiminde sessizce silinirdi. Ayrıca bu tablo
-- yalnızca service_role erişimlidir (RLS açık, politika yok) — bir kiracı kendi
-- ek paketini PostgREST ile kendine açamaz (SMS kontörüyle aynı model).

CREATE TABLE IF NOT EXISTS org_addons (
  org_id                 UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  -- AI Asistan (WhatsApp + Instagram/Messenger otomatik yanıt)
  ai_assistant           BOOLEAN NOT NULL DEFAULT false,
  ai_subscription_id     TEXT,
  -- Ek Şube: satın alınmış ek şube hakkı (adet). Şube oluşturma akışı (faz 2)
  -- bu değerin üstüne çıkmaya izin vermez.
  extra_branch_slots     INT NOT NULL DEFAULT 0 CHECK (extra_branch_slots >= 0),
  branch_subscription_id TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_addons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON org_addons FROM PUBLIC, anon, authenticated;
