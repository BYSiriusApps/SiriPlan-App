-- ============================================================
-- SIRIPLAN — Hizmetlerin online randevu sayfasında gizlenebilmesi
-- Tarih: 2026-07-31
-- Supabase SQL Editor'da çalıştırılmalı
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS is_bookable_online BOOLEAN NOT NULL DEFAULT TRUE;

NOTIFY pgrst, 'reload schema';
