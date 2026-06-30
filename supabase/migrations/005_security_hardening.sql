-- ── Security hardening: tighten public anon INSERT policies ─────────────────

-- Replace open INSERT with org-validated check
-- Anonymous users can only book into an active/trial org with a valid service
DROP POLICY IF EXISTS "public_appointments_insert" ON appointments;
CREATE POLICY "public_appointments_insert" ON appointments
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = appointments.org_id
        AND (o.subscription_status = 'active' OR o.trial_ends_at > NOW())
    )
    AND EXISTS (
      SELECT 1 FROM services s
      WHERE s.id = appointments.service_id
        AND s.org_id = appointments.org_id
        AND s.is_active = TRUE
    )
  );

-- Waitlist: only valid active org
DROP POLICY IF EXISTS "public_waitlist_insert" ON waitlist;
CREATE POLICY "public_waitlist_insert" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = waitlist.org_id
        AND (o.subscription_status = 'active' OR o.trial_ends_at > NOW())
    )
  );

-- Narrow anon appointment reads: only show future/today appointments (not full history)
DROP POLICY IF EXISTS "public_appointments_read" ON appointments;
CREATE POLICY "public_appointments_read" ON appointments
  FOR SELECT TO anon
  USING (
    status NOT IN ('iptal')
    AND appointment_at >= (NOW() - INTERVAL '1 day')
  );

-- Narrow anon staff reads: only active staff with org check via service
-- (keep simple — org_id is on staff table)
DROP POLICY IF EXISTS "public_staff_read" ON staff;
CREATE POLICY "public_staff_read" ON staff
  FOR SELECT TO anon
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = staff.org_id
        AND (o.subscription_status = 'active' OR o.trial_ends_at > NOW())
    )
  );
