-- ============================================================
-- SIRIPLAN — Personel izin / işletme geneli kapalı gün tablosu
-- Tarih: 2026-07-31
-- Supabase SQL Editor'da çalıştırılmalı
--
-- staff_id NULL  → işletme geneli kapalı gün (resmi tatil vb.)
-- staff_id dolu  → sadece o personelin izni
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_time_off (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id   UUID REFERENCES staff(id) ON DELETE CASCADE,
  starts_on  DATE NOT NULL,
  ends_on    DATE NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_org_range
  ON staff_time_off(org_id, staff_id, starts_on, ends_on);

ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_time_off_all" ON staff_time_off;
CREATE POLICY "staff_time_off_all" ON staff_time_off FOR ALL
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- Public booking sayfası (/r/[slug]) ve /api/availability, izinli
-- tarihleri görüp slot üretmemesi için okuyabilmeli.
DROP POLICY IF EXISTS "public_staff_time_off_read" ON staff_time_off;
CREATE POLICY "public_staff_time_off_read" ON staff_time_off FOR SELECT TO anon
  USING (TRUE);

NOTIFY pgrst, 'reload schema';
