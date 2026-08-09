-- ============================================================
-- GÜVENLİK DÜZELTMESİ: staff_invitations anon RLS politikası
-- token'ı hiç kontrol etmiyordu — herkes anon key ile
-- `status=eq.pending` filtresiyle TÜM organizasyonlardaki bekleyen
-- davetleri (token, e-posta, telefon, rol, izinler dahil) doğrudan
-- Supabase REST API'sinden okuyabiliyordu. Token'ı ele geçiren biri
-- /api/staff/invite/accept ile istediği salona üye olabilirdi.
--
-- Düzeltme: anon SELECT politikası tamamen kaldırıldı. Token ile
-- davet okuma/kabul artık yalnızca sunucu tarafında admin (service
-- role) client ile yapılıyor — bkz. src/app/api/staff/invite/accept/route.ts.
-- Bu, public/cancel ve public/consent uçlarında zaten kullanılan
-- "rastgele token = yetki" desenini takip eder.
-- ============================================================

DROP POLICY IF EXISTS "invites_public_token_read" ON staff_invitations;
