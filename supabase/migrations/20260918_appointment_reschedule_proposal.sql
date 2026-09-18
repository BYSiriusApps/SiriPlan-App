-- "Yeni Saat Öner" (reschedule counter-offer) akışı için appointments ve
-- appointment_requests tablolarına aynı öneri deseni eklenir. İşletme bir
-- talebe/randevuya yeni saat önerdiğinde ana appointment_at/status kolonlarına
-- DOKUNULMAZ — öneri ayrı proposed_* alanlarında tutulur, müşteri linkten
-- kabul/red edince ilgili API bu alanlara bakarak kararı uygular. Müşteri
-- reddederse (kullanıcı kararı) talep silinmez/otomatik iptal olmaz, sadece
-- proposed_status='rejected' olur — işletme tekrar öneri sunabilir.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS proposed_appointment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposed_response_token TEXT,
  ADD COLUMN IF NOT EXISTS proposed_status TEXT NOT NULL DEFAULT 'none'
    CHECK (proposed_status IN ('none', 'pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS proposed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE appointment_requests
  ADD COLUMN IF NOT EXISTS proposed_appointment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposed_response_token TEXT,
  ADD COLUMN IF NOT EXISTS proposed_status TEXT NOT NULL DEFAULT 'none'
    CHECK (proposed_status IN ('none', 'pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS proposed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Müşterinin public /oneri/[token] sayfasında kullandığı token — cancel_token
-- ile aynı 32 haneli hex desenini kullanır ama ayrı bir alan (her randevu için
-- değil, yalnızca öneri yapıldığında dolar).
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_proposed_token
  ON appointments (proposed_response_token) WHERE proposed_response_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_requests_proposed_token
  ON appointment_requests (proposed_response_token) WHERE proposed_response_token IS NOT NULL;
