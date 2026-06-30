-- Widen commission_rate column from NUMERIC(4,3) to NUMERIC(5,4).
-- NUMERIC(4,3) allowed max 9.999; NUMERIC(5,4) allows 9.9999.
-- Both are sufficient for 0-1 decimal range (0%-100% commission),
-- but the extra digit prevents overflow from floating-point rounding at the edge.
ALTER TABLE staff
  ALTER COLUMN commission_rate TYPE NUMERIC(5,4);
