-- Add per-staff language preference.
-- NULL means "no preference" (inherit org locale or browser language).
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;
