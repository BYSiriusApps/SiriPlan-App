-- 20261016 — Randevu sayfasında geçici saat kilidi (soft hold).
--
-- Bir ziyaretçi saate tıkladığında o saat kısa süre (birkaç dk) diğer ziyaretçilere
-- "dolu" görünür; sayfadan çıkarsa / başka saat seçerse / süre dolarsa serbest kalır.
-- Bu kilit YALNIZCA görsel önlemdir: asıl çakışma kontrolü /api/appointments'ta aynen
-- sürer. Tablo yokken kod sessizce kilitsiz çalışır (ana akış etkilenmez).
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent).
-- GÜVENLİK: RLS açık, politika yok, anon/authenticated'dan tüm yetki alınır;
-- tabloya YALNIZCA service_role (sunucu uçları) erişir.

CREATE TABLE IF NOT EXISTS slot_holds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Belirli personel seçildiyse personel id'si; "Farketmez" için NULL.
  staff_id   UUID REFERENCES staff(id) ON DELETE CASCADE,
  hold_date  DATE NOT NULL,
  slot       TEXT NOT NULL,                 -- "HH:MM"
  holder_id  TEXT NOT NULL,                 -- tarayıcıda üretilen rastgele ziyaretçi kimliği
  -- Aynı (personel, gün, saat) için tek kilit; "Farketmez" kilitleri holder'a özel.
  hold_key   TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_holds_key ON slot_holds (org_id, hold_date, slot, hold_key);
CREATE INDEX IF NOT EXISTS idx_slot_holds_lookup ON slot_holds (org_id, hold_date, expires_at);
CREATE INDEX IF NOT EXISTS idx_slot_holds_holder ON slot_holds (org_id, holder_id);

ALTER TABLE slot_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slot_holds FROM PUBLIC, anon, authenticated;
