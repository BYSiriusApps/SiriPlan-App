-- ============================================================
-- SIRIPLAN — Personelin kendi profilini düzenlemesi (/dashboard/hesabim)
-- Tarih: 2026-09-09
-- Supabase SQL Editor'da çalıştırılmalı (idempotent)
--
-- Personel kaydına isteğe bağlı bir adres alanı. Ad/telefon/dil zaten
-- vardı (staff.full_name, staff.phone, staff.preferred_language — 009).
-- Güncelleme /api/account/profile üzerinden service role ile yapılır ve
-- yalnızca çağıranın KENDİ staff satırına dokunur — RLS değişmiyor.
-- ============================================================

ALTER TABLE staff ADD COLUMN IF NOT EXISTS address text;

NOTIFY pgrst, 'reload schema';
