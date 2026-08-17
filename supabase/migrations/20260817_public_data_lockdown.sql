-- ============================================================
-- GÜVENLİK: herkese açık (anon) veri erişiminin kapatılması
--
-- SORUN (kritik):
-- Supabase'in "anon" anahtarı tanımı gereği herkese açıktır — tarayıcıya inen
-- JavaScript paketinin içinde yazar. 001_initial_schema.sql, herkese açık
-- randevu sayfasını çalıştırmak için bu role geniş SELECT/INSERT policy'leri
-- vermişti. Sonuç olarak anahtarı eline geçiren HERKES doğrudan PostgREST'e
-- (https://<proje>.supabase.co/rest/v1/...) istek atarak şunları yapabiliyordu:
--
--   1) organizations tablosunu okumak → PLATFORMDAKİ TÜM SALONLARIN
--      wa_token (WhatsApp Cloud API erişim jetonu), ig_page_access_token,
--      sms_password, google_calendar_token, stripe_customer_id değerleri.
--      Bu jetonlarla salonların adına müşterilerine mesaj gönderilebilirdi.
--      (Aynı veri /r/[slug] randevu sayfasının ağ yanıtında da gidiyordu:
--       istemci `organizations.select("*")` yapıyordu.)
--
--   2) appointments tablosunu okumak → tüm salonların gelecek randevuları:
--      müşteri adı, telefonu, e-postası, notu ve cancel_token. Token ile
--      başkalarının randevusu iptal edilebilirdi. (KVKK açısından da ağır.)
--
--   3) staff tablosunu okumak → tüm personelin telefonu, e-postası,
--      prim oranı (commission_rate) ve maaşı.
--
--   4) appointments/waitlist tablosuna DOĞRUDAN INSERT → uygulamadaki hız
--      sınırı, honeypot ve bot kontrollerinin tamamını atlayarak sınırsız
--      sahte randevu/bekleme kaydı yaratmak.
--
-- ÇÖZÜM:
-- Herkese açık randevu sayfasının ihtiyaç duyduğu tüm veri artık sunucu
-- tarafındaki /api/public/salon, /api/availability ve /api/appointments
-- uçlarından, service role ile ve KOLON BEYAZ LİSTESİYLE servis ediliyor.
-- Dolayısıyla anon rolünün bu tablolara doğrudan erişmesine hiç gerek yok.
--
-- Bu dosya iki katmanlı çalışır (kemer + askı):
--   A) anon policy'leri kaldırılır (satır bazlı erişim yok),
--   B) anon'un tablo SELECT/INSERT ayrıcalıkları geri alınır (kolon bazlı
--      erişim de yok). Böylece ileride yanlışlıkla bir policy geri eklense
--      bile veri sızmaz; ayrıca tabloya yeni eklenen bir "sır" kolonu
--      otomatik olarak kapalı gelir (fail-closed).
--
-- PANEL ETKİSİ: YOK. Panel "authenticated" rolüyle çalışır; buradaki hiçbir
-- REVOKE/DROP authenticated veya service_role'ü etkilemez. Randevu linki
-- (/r/[slug]) ve takvim, yukarıdaki sunucu uçları üzerinden çalışmaya devam
-- eder.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- A) anon policy'lerini kaldır
-- ─────────────────────────────────────────────────────────────

-- Müşteri PII + cancel_token sızıntısı. Müsaitlik hesabı artık service role ile
-- yapılıyor (/api/availability), anon'un randevu okumasına gerek yok.
DROP POLICY IF EXISTS "public_appointments_read" ON appointments;

-- Uygulama seviyesindeki bot/hız korumalarını tamamen atlatan doğrudan yazma
-- yolu. Randevu oluşturma artık yalnızca /api/appointments üzerinden.
DROP POLICY IF EXISTS "public_appointments_insert" ON appointments;
DROP POLICY IF EXISTS "public_waitlist_insert"    ON waitlist;

-- Entegrasyon sırları (wa_token, sms_password, ig_page_access_token…) ve
-- personel iletişim/ücret bilgileri.
DROP POLICY IF EXISTS "public_org_read"   ON organizations;
DROP POLICY IF EXISTS "public_staff_read" ON staff;

-- Hassas olmayan katalog verisi de artık sunucudan servis ediliyor;
-- tutarlılık için anon erişimi tamamen kapatılıyor.
DROP POLICY IF EXISTS "public_services_read"                ON services;
DROP POLICY IF EXISTS "public_staff_services_read"          ON staff_services;
DROP POLICY IF EXISTS "public_staff_time_off_read"          ON staff_time_off;
DROP POLICY IF EXISTS "public_service_categories_read"      ON service_categories;
DROP POLICY IF EXISTS "public_service_category_photos_read" ON service_category_photos;

-- ─────────────────────────────────────────────────────────────
-- B) anon'un tablo ayrıcalıklarını geri al
--    (policy olmasa bile GRANT'in kendisi kalmasın; ileride eklenecek bir
--     policy tek başına veriyi açamasın)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations', 'staff', 'services', 'staff_services',
    'appointments', 'waitlist', 'customers', 'customer_consents',
    'staff_time_off', 'service_categories', 'service_category_photos',
    'appointment_requests', 'consent_requests', 'staff_invitations',
    'campaigns', 'campaign_logs', 'audit_logs', 'org_members'
  ]
  LOOP
    -- Tablo bu ortamda henüz yoksa (migration sırası) sessizce atla.
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- C) Bot kayıtları için kalıcı sayaç: kayıt IP'si
--    (bkz. src/app/api/auth/quick-register/route.ts — bellekteki hız sınırı
--     serverless örnekleri arasında paylaşılmaz, bu kolon paylaşılır)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS signup_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_org_signup_ip_created
  ON organizations (signup_ip, created_at DESC)
  WHERE signup_ip IS NOT NULL;

-- Anonim randevu akışındaki "aynı telefondan son 24 saatte kaç randevu"
-- kontrolünü indekssiz tablo taramasına düşmekten korur.
CREATE INDEX IF NOT EXISTS idx_appt_org_phone_created
  ON appointments (org_id, customer_phone, created_at DESC);

NOTIFY pgrst, 'reload schema';
