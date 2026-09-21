-- ============================================================
-- 20260918 — Online randevu otomatik onayı: ilk kayıtta KAPALI
--
-- Bu dosyayı Supabase Dashboard → SQL Editor'e yapıştırıp ÇALIŞTIRMANIZ
-- yeterlidir. İdempotenttir.
--
-- Gerekçe: çoğu işletme sahibi internet/sosyal medyadan gelen randevuların
-- kod tarafında otomatik onaylanmasını istemiyor. 20260909_auto_booking_all_plans.sql
-- ile kolon varsayılanı true yapılmıştı; bu dosya SADECE yeni kayıtların
-- varsayılanını false'a döndürür. Kayıt akışındaki INSERT'ler artık
-- has_auto_booking:false'u zaten açıkça gönderiyor (bkz. quick-register ve
-- auth/callback route'ları) — bu ALTER, o alanı göndermeyen olası başka
-- insert yolları için bir güvenlik ağıdır.
--
-- Mevcut (zaten kayıtlı) işletmelere DOKUNULMUYOR — onlar 09 Eylül'de
-- bilinçli olarak "açık" durumuna geçirildi ve orada kalır. Değişen sadece
-- BUNDAN SONRA oluşturulacak yeni organizasyonların varsayılanı.
-- ============================================================

ALTER TABLE organizations ALTER COLUMN has_auto_booking SET DEFAULT false;

NOTIFY pgrst, 'reload schema';
