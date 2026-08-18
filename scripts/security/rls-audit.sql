-- ============================================================
-- M2 — RLS / ÇOK KİRACILI İZOLASYON DENETİMİ
--
-- Supabase → SQL Editor'a yapıştırıp çalıştırın. HİÇBİR ŞEYİ DEĞİŞTİRMEZ,
-- yalnızca okur. Her bloğun beklenen sonucu başlığında yazıyor.
--
-- Bu dosya "20260817_public_data_lockdown.sql sonrası durum gerçekten
-- kilitli mi?" sorusunun veritabanı tarafındaki cevabıdır. HTTP tarafındaki
-- cevabı için: node scripts/security/tenant-isolation.mjs
-- ============================================================


-- ── 1) RLS HİÇ AÇILMAMIŞ TABLOLAR ───────────────────────────
-- BEKLENEN: 0 satır.
-- Buradaki her satır, authenticated rolüne sahip HERKESİN (yani platformdaki
-- her salon çalışanının) o tablonun TAMAMINI okuyabildiği anlamına gelir.
select
  c.relname as tablo,
  'RLS KAPALI — tüm kiracılar birbirinin verisini görür' as bulgu
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;


-- ── 2) RLS AÇIK AMA TEK BİR POLICY'Sİ OLMAYAN TABLOLAR ──────
-- BEKLENEN: bilinçli olarak "yalnızca service_role erişsin" denen tablolar.
-- Beklenmeyen bir tablo çıkarsa panelde o veri hiç görünmüyor demektir
-- (veya yalnızca service_role uçlarından geçiyordur — o uçların org_id'yi
--  oturumdan aldığını doğrulayın).
select
  c.relname as tablo,
  'RLS açık, policy yok — sadece service_role erişebilir' as bulgu
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
order by c.relname;


-- ── 3) anon ROLÜNDE KALAN TABLO AYRICALIKLARI ───────────────
-- BEKLENEN: 0 satır.
-- anon anahtarı tarayıcıdaki JS paketinin içinde yazar — herkese açıktır.
-- Burada çıkan her satır, o anahtarı eline geçiren herkesin PostgREST'e
-- doğrudan gidip o tabloya erişebileceği anlamına gelir.
select
  table_name as tablo,
  string_agg(privilege_type, ', ' order by privilege_type) as ayricaliklar
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
group by table_name
order by table_name;


-- ── 4) anon / public ROLÜNE AÇIK POLICY'LER ─────────────────
-- BEKLENEN: 0 satır.
-- (3) numaralı GRANT kaldırılmış olsa bile burada bir policy durması,
-- ileride yanlışlıkla GRANT geri verildiğinde verinin anında açılması
-- demektir. Kemer + askı: ikisi de temiz olmalı.
select
  p.polname   as policy_adi,
  c.relname   as tablo,
  case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                when 'w' then 'UPDATE' when 'd' then 'DELETE'
                else 'ALL' end as islem,
  pg_get_expr(p.polqual, p.polrelid) as using_ifadesi
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and (
    p.polroles = '{0}'::oid[]                              -- PUBLIC (tüm roller)
    or 'anon' = any (select rolname from pg_roles where oid = any (p.polroles))
  )
order by c.relname, p.polname;


-- ── 5) org_id FİLTRESİ İÇERMEYEN POLICY'LER ─────────────────
-- BEKLENEN: yalnızca kasıtlı istisnalar (ör. platform_admins'in
-- "user_id = auth.uid()" policy'si, org_members'ın kendi üyeliğini okuması).
-- Kiracıya ait bir tabloda is_org_member/org_id geçmeyen bir policy
-- ÇAPRAZ-KİRACI SIZINTISIDIR.
select
  c.relname as tablo,
  p.polname as policy_adi,
  coalesce(pg_get_expr(p.polqual, p.polrelid), '(yok)') as using_ifadesi,
  coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '(yok)') as with_check_ifadesi
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and coalesce(pg_get_expr(p.polqual, p.polrelid), '')
        !~ '(is_org_member|org_id|auth\.uid)'
order by c.relname, p.polname;


-- ── 6) INSERT/UPDATE POLICY'LERİNDE EKSİK WITH CHECK ────────
-- BEKLENEN: 0 satır.
-- USING var ama WITH CHECK yoksa: kiracı KENDİ satırını okuyabilir ama
-- BAŞKA bir org_id yazabilir (satırı komşu salona "taşıyabilir").
select
  c.relname as tablo,
  p.polname as policy_adi,
  'INSERT/UPDATE policy''sinde WITH CHECK yok' as bulgu
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and p.polcmd in ('a', 'w', '*')
  and p.polwithcheck is null
order by c.relname;


-- ── 7) anon'un ÇAĞIRABİLECEĞİ SECURITY DEFINER FONKSİYONLAR ─
-- BEKLENEN: liste kısa ve hepsi kasıtlı olmalı.
-- SECURITY DEFINER fonksiyon RLS'i atlar; anon'a EXECUTE verilmişse
-- tablo kilitli olsa bile veri bu fonksiyon üzerinden dışarı çıkabilir.
select
  p.proname as fonksiyon,
  pg_get_function_identity_arguments(p.oid) as parametreler,
  case when p.prosecdef then 'SECURITY DEFINER' else 'invoker' end as mod
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by p.proname;


-- ── 8) KİRACI TABLOLARINDA org_id KOLONU EKSİK Mİ? ──────────
-- BEKLENEN: 0 satır (staff_services gibi, üst tablosu üzerinden
-- kapsanan ara tablolar hariç — onlar policy'de EXISTS ile bağlanır).
select
  c.relname as tablo,
  'org_id kolonu yok — izolasyon üst tablo üzerinden kurulmalı' as bulgu
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1 from information_schema.columns col
    where col.table_schema = 'public'
      and col.table_name = c.relname
      and col.column_name = 'org_id'
  )
order by c.relname;
