-- ============================================================
-- Siriplan — Initial Schema
-- Multi-tenant beauty salon management SaaS
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ─── ORGANIZATIONS (one per salon / business) ────────────────
CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'kuafor',  -- kuafor|berber|guzellik|spa|nail|estetik|makyaj|tattoo|diyetisyen
  locale                TEXT NOT NULL DEFAULT 'tr',       -- salon's preferred language
  phone                 TEXT,
  email                 TEXT,
  address               TEXT,
  city                  TEXT,
  logo_url              TEXT,
  cover_url             TEXT,
  instagram_handle      TEXT,
  whatsapp_number       TEXT,
  working_hours_json    JSONB DEFAULT '{"mon":{"open":"09:00","close":"20:00"},"tue":{"open":"09:00","close":"20:00"},"wed":{"open":"09:00","close":"20:00"},"thu":{"open":"09:00","close":"20:00"},"fri":{"open":"09:00","close":"20:00"},"sat":{"open":"09:00","close":"20:00"},"sun":null}'::jsonb,
  -- Subscription
  plan                  TEXT NOT NULL DEFAULT 'trial',   -- trial|starter|pro|business
  subscription_status   TEXT NOT NULL DEFAULT 'active',  -- active|past_due|canceled|paused
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at         TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  -- Plan limits
  max_staff             INT DEFAULT 3,
  max_appointments_monthly INT DEFAULT 300,
  -- Feature flags (plan-gated)
  feature_ai            BOOLEAN DEFAULT FALSE,
  feature_campaigns     BOOLEAN DEFAULT FALSE,
  feature_gamification  BOOLEAN DEFAULT FALSE,
  feature_api           BOOLEAN DEFAULT FALSE,
  feature_whitelabel    BOOLEAN DEFAULT FALSE,
  -- Integrations
  wa_token              TEXT,
  wa_phone_number_id    TEXT,
  ig_page_access_token  TEXT,
  ig_page_id            TEXT,
  google_calendar_token JSONB,
  -- Metadata
  settings_json         JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORG MEMBERS (users belonging to an org) ─────────────────
CREATE TABLE org_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner',  -- owner|manager|staff
  staff_id   UUID,  -- linked staff record (set after staff created)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ─── STAFF ───────────────────────────────────────────────────
CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'Uzman',
  bio             TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  email           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  working_days    JSONB DEFAULT '[1,2,3,4,5,6]'::jsonb,  -- 0=Sun
  start_time      TEXT DEFAULT '09:00',
  end_time        TEXT DEFAULT '20:00',
  commission_rate NUMERIC(4,3) DEFAULT 0.40,
  display_order   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICES ────────────────────────────────────────────────
CREATE TABLE services (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  duration_minutes     INT NOT NULL DEFAULT 30,
  price                NUMERIC(10,2) NOT NULL,
  category_tag         TEXT DEFAULT 'genel',  -- sac|cilt|tirnak|kas|spa|lazer
  contributes_loyalty  BOOLEAN DEFAULT TRUE,
  is_active            BOOLEAN DEFAULT TRUE,
  display_order        INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STAFF SERVICES (many-to-many) ───────────────────────────
CREATE TABLE staff_services (
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- ─── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  birth_date       DATE,
  gender           TEXT,  -- kadin|erkek|diger
  notes            TEXT,
  tags             JSONB DEFAULT '[]'::jsonb,
  -- Loyalty
  loyalty_punches  INT DEFAULT 0,
  loyalty_redeems  INT DEFAULT 0,
  -- CRM Score (0-100, refreshed weekly by cron)
  score            INT DEFAULT 0,
  score_breakdown  JSONB DEFAULT '{}'::jsonb,
  -- Activity
  total_spend      NUMERIC(12,2) DEFAULT 0,
  visit_count      INT DEFAULT 0,
  last_visit_at    TIMESTAMPTZ,
  -- Referral
  referred_by_customer_id UUID REFERENCES customers(id),
  referral_count   INT DEFAULT 0,
  -- Source
  source           TEXT DEFAULT 'web',  -- web|whatsapp|instagram|walk-in|migration
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, phone)
);

-- ─── APPOINTMENTS ────────────────────────────────────────────
CREATE TABLE appointments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id              UUID REFERENCES customers(id),
  customer_name            TEXT NOT NULL,
  customer_phone           TEXT NOT NULL,
  staff_id                 UUID NOT NULL REFERENCES staff(id),
  service_id               UUID NOT NULL REFERENCES services(id),
  appointment_at           TIMESTAMPTZ NOT NULL,
  duration_minutes         INT NOT NULL,
  price                    NUMERIC(10,2) NOT NULL,
  tip                      NUMERIC(10,2) DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'talep',  -- talep|onaylandi|tamamlandi|iptal|gelmedi
  source                   TEXT NOT NULL DEFAULT 'web',    -- web|whatsapp|instagram|telefon|yuzyuze
  note                     TEXT,
  internal_note            TEXT,
  payment_method           TEXT,  -- nakit|kart|online
  cancel_token             TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  cancel_reason            TEXT,
  -- Reminders
  reminder_sent_at         TIMESTAMPTZ,
  reminder2_sent_at        TIMESTAMPTZ,
  -- Loyalty
  loyalty_punch_added      BOOLEAN DEFAULT FALSE,
  -- Metadata
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LOYALTY REDEEMS ─────────────────────────────────────────
CREATE TABLE loyalty_redeems (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  appointment_id  UUID REFERENCES appointments(id),
  punches_used    INT DEFAULT 10,
  redeemed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WAITLIST ────────────────────────────────────────────────
CREATE TABLE waitlist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  service_id      UUID REFERENCES services(id),
  staff_id        UUID REFERENCES staff(id),
  preferred_dates JSONB DEFAULT '[]'::jsonb,
  status          TEXT DEFAULT 'waiting',  -- waiting|notified|booked|expired
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  notified_at     TIMESTAMPTZ
);

-- ─── CAMPAIGNS ───────────────────────────────────────────────
CREATE TABLE campaigns (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL,  -- birthday|inactive|custom
  message_template TEXT NOT NULL,
  channel          TEXT DEFAULT 'whatsapp',  -- whatsapp|sms|both
  segment_json     JSONB DEFAULT '{}'::jsonb,
  status           TEXT DEFAULT 'draft',  -- draft|scheduled|sending|sent|failed
  sent_count       INT DEFAULT 0,
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id),
  phone        TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',  -- pending|sent|delivered|failed
  error_msg    TEXT,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STAFF PERFORMANCE (Gamification) ───────────────────────
CREATE TABLE staff_performance_weekly (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  appointments_done   INT DEFAULT 0,
  total_revenue       NUMERIC(12,2) DEFAULT 0,
  no_show_count       INT DEFAULT 0,
  repeat_customers    INT DEFAULT 0,
  score               NUMERIC(10,2) DEFAULT 0,
  rank                INT DEFAULT 0,
  is_top              BOOLEAN DEFAULT FALSE,
  UNIQUE(org_id, staff_id, week_start)
);

CREATE TABLE staff_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  badge_type  TEXT NOT NULL,  -- superstar|speedmaster|customer_fav|rising_star
  badge_month DATE NOT NULL,
  awarded_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, staff_id, badge_type, badge_month)
);

-- ─── DATA IMPORTS ─────────────────────────────────────────────
CREATE TABLE data_imports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source       TEXT NOT NULL,  -- salonappy|arvengo|excel|csv
  status       TEXT DEFAULT 'pending',  -- pending|processing|done|failed
  file_url     TEXT,
  row_count    INT DEFAULT 0,
  error_log    TEXT,
  imported_by  UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (critical for 2000+ concurrent orgs)
-- ============================================================
CREATE INDEX idx_appointments_org_date    ON appointments(org_id, appointment_at);
CREATE INDEX idx_appointments_staff       ON appointments(staff_id, appointment_at);
CREATE INDEX idx_appointments_status      ON appointments(org_id, status);
CREATE INDEX idx_appointments_customer    ON appointments(customer_id);
CREATE INDEX idx_customers_org_phone      ON customers(org_id, phone);
CREATE INDEX idx_customers_score          ON customers(org_id, score DESC);
CREATE INDEX idx_customers_last_visit     ON customers(org_id, last_visit_at);
CREATE INDEX idx_staff_org               ON staff(org_id);
CREATE INDEX idx_services_org            ON services(org_id);
CREATE INDEX idx_campaigns_org           ON campaigns(org_id);
CREATE INDEX idx_org_members_user        ON org_members(user_id);
CREATE INDEX idx_org_slug                ON organizations(slug);

-- Full-text search on customer names
CREATE INDEX idx_customers_name_trgm ON customers USING gin(full_name gin_trgm_ops);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redeems         ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist                ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns               ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;

-- Helper function: get the org_id for the current auth user
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Organizations: user can only see their own org
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id = get_my_org_id());
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (id = get_my_org_id());

-- Org members: members of same org
CREATE POLICY "members_select" ON org_members FOR SELECT
  USING (org_id = get_my_org_id());
CREATE POLICY "members_insert" ON org_members FOR INSERT
  WITH CHECK (org_id = get_my_org_id());

-- Generic org-scoped policy macro (repeat for each table)
-- Staff
CREATE POLICY "staff_all" ON staff FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Services
CREATE POLICY "services_all" ON services FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Staff services (join via staff)
CREATE POLICY "staff_services_all" ON staff_services FOR ALL
  USING (EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND s.org_id = get_my_org_id()));
-- Customers
CREATE POLICY "customers_all" ON customers FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Appointments
CREATE POLICY "appointments_all" ON appointments FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Loyalty redeems
CREATE POLICY "loyalty_all" ON loyalty_redeems FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Waitlist
CREATE POLICY "waitlist_all" ON waitlist FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Campaigns
CREATE POLICY "campaigns_all" ON campaigns FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "campaign_logs_all" ON campaign_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.org_id = get_my_org_id()));
-- Staff performance
CREATE POLICY "perf_all" ON staff_performance_weekly FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "badges_all" ON staff_badges FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Data imports
CREATE POLICY "imports_all" ON data_imports FOR ALL
  USING (org_id = get_my_org_id()) WITH CHECK (org_id = get_my_org_id());
-- Audit logs
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (org_id = get_my_org_id());

-- ============================================================
-- PUBLIC BOOKING: allow anon reads for slug-based salon info
-- ============================================================
CREATE POLICY "public_org_read" ON organizations FOR SELECT TO anon
  USING (subscription_status = 'active' OR trial_ends_at > NOW());
CREATE POLICY "public_staff_read" ON staff FOR SELECT TO anon
  USING (is_active = TRUE);
CREATE POLICY "public_services_read" ON services FOR SELECT TO anon
  USING (is_active = TRUE);
CREATE POLICY "public_staff_services_read" ON staff_services FOR SELECT TO anon
  USING (TRUE);
CREATE POLICY "public_appointments_read" ON appointments FOR SELECT TO anon
  USING (status NOT IN ('iptal'));
-- anon can INSERT appointments (public booking)
CREATE POLICY "public_appointments_insert" ON appointments FOR INSERT TO anon
  WITH CHECK (TRUE);
-- anon can INSERT to waitlist
CREATE POLICY "public_waitlist_insert" ON waitlist FOR INSERT TO anon
  WITH CHECK (TRUE);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_orgs_updated    BEFORE UPDATE ON organizations    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appts_updated   BEFORE UPDATE ON appointments     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cust_updated    BEFORE UPDATE ON customers        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
