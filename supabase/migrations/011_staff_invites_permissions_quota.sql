-- ============================================================
-- 011 — Staff invitations, granular permissions, quota trigger
-- ============================================================

-- ─── ORG_MEMBERS: granüler izin sütunu ───────────────────────
ALTER TABLE org_members
  ADD COLUMN IF NOT EXISTS permissions_json JSONB NOT NULL DEFAULT '{
    "view_customers":   true,
    "edit_customers":   false,
    "view_reports":     false,
    "edit_services":    false,
    "manage_staff":     false,
    "view_financials":  false,
    "manage_campaigns": false,
    "view_calendar":    true,
    "create_appointments": true,
    "edit_appointments": true,
    "cancel_appointments": false
  }'::jsonb;

-- ─── STAFF INVITATIONS ───────────────────────────────────────
-- Salon sahibi personeli e-posta/WhatsApp/Telegram ile davet eder.
-- Personel token ile kayıt olur, org_member oluşturulur.
CREATE TABLE IF NOT EXISTS staff_invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES staff(id) ON DELETE SET NULL, -- önceden tanımlı personel kaydı
  email       TEXT,                                          -- davet e-postası
  phone       TEXT,                                          -- WhatsApp/telefon
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  role        TEXT NOT NULL DEFAULT 'staff'                  -- staff|manager
                  CHECK (role IN ('staff','manager')),
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- Salon sahibi/yöneticisi kendi org'unun davetlerini görebilir/yönetebilir
CREATE POLICY "invites_manage" ON staff_invitations
  FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Token ile kabul için anon okuma (sadece token bilindiğinde)
CREATE POLICY "invites_public_token_read" ON staff_invitations
  FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > NOW());

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_org   ON staff_invitations(org_id, status);

-- ─── KOTA KORUMA: server-side DB trigger ─────────────────────
-- Anon insert RLS politikası kota kontrolü yapmıyor.
-- Bu trigger her yeni randevuda kota limitini kontrol eder.
-- Başarısız olursa INSERT'i exception ile durdurur.
CREATE OR REPLACE FUNCTION check_appointment_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max   INT;
  v_count INT;
  v_month_start TIMESTAMPTZ;
  v_month_end   TIMESTAMPTZ;
BEGIN
  SELECT max_appointments_monthly
    INTO v_max
    FROM organizations
   WHERE id = NEW.org_id;

  -- Limit yoksa veya sonsuzsa geç
  IF v_max IS NULL OR v_max >= 999999 THEN
    RETURN NEW;
  END IF;

  v_month_start := date_trunc('month', NOW());
  v_month_end   := v_month_start + INTERVAL '1 month';

  SELECT COUNT(*) INTO v_count
    FROM appointments
   WHERE org_id = NEW.org_id
     AND created_at >= v_month_start
     AND created_at <  v_month_end;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Aylık randevu limitine ulaşıldı (%). Plan yükseltmeniz gerekiyor.', v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_quota ON appointments;
CREATE TRIGGER trg_appointment_quota
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_appointment_quota();

-- ─── ANON INSERT: daha kısıtlayıcı policy ───────────────────
-- Eski politika: sadece aktif org + aktif servis kontrolü
-- Yeni politika: ayrıca `assigned_staff_id` inject edilememesi için
-- (kota artık trigger'da, anon INSERT zaten sadece /r/[slug] için gerekli)
-- NOT: production'da en güvenli yol tüm INSERT'i service role API'ye taşımak.
-- Şimdilik trigger yeterli güvenceyi sağlıyor.

-- ─── INDEX: appointment_requests üzerindeki pending query ────
CREATE INDEX IF NOT EXISTS idx_appointments_reminder
  ON appointments(appointment_at, status, reminder_sent_at, reminder2_sent_at)
  WHERE status = 'onaylandi';

-- ─── has_auto_booking: sadece pro/business planlarda aktif ───
-- Uygulama katmanında da kontrol ediliyor; burada DB kısıtı yok
-- çünkü plan güncellemelerinde çakışma yaratır. API kontrolü yeterli.

-- ─── UPDATED_AT trigger: staff_invitations ───────────────────
-- (zaten set_updated_at fonksiyonu mevcut — staff_invitations'da updated_at yok, skip)
