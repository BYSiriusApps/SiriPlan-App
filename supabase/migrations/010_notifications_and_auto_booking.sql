-- ============================================================
-- 010 — Notification channels + auto-booking support
-- ============================================================

-- ─── STAFF: bildirim kanalları ───────────────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number  TEXT;

-- ─── ORGANIZATIONS: salon bildirim + upsell flag ─────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS has_auto_booking BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── APPOINTMENTS: kaynak genişletme + oto-randevu alanları ──
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT FALSE;

-- source sütunu zaten TEXT — yeni değerlere izin vermek için ek
-- kısıtlama yok; API katmanında enum ile doğrulanıyor.

-- ─── APPOINTMENT REQUESTS (has_auto_booking=false ise) ────────
CREATE TABLE IF NOT EXISTS appointment_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- müşteri bilgileri (customer henüz kayıt edilmemiş olabilir)
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT,

  -- randevu detayları
  staff_id          UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id        UUID REFERENCES services(id) ON DELETE SET NULL,
  extra_services_json JSONB DEFAULT '[]'::jsonb,
  appointment_at    TIMESTAMPTZ NOT NULL,
  duration_minutes  INT,
  price             NUMERIC(10,2),
  note              TEXT,
  source            TEXT NOT NULL DEFAULT 'website',   -- website|whatsapp|instagram|manual

  -- durum
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),

  -- zaman damgaları
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS: appointment_requests ───────────────────────────────
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

-- Salon üyeleri kendi org'larının taleplerini görebilir/yönetebilir
CREATE POLICY "org_members_manage_requests" ON appointment_requests
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
    )
  );

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appt_requests_org_status
  ON appointment_requests(org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_staff
  ON appointments(assigned_staff_id);
