-- Personel/sahip bazlı bildirim kanalı tercihi (Telegram/WhatsApp aç-kapa).
-- Salon (org) düzeyindeki tercih için YENİ KOLON GEREKMEDİ — organizations
-- zaten esnek bir `settings_json` kolonuna sahip; notify.ts oradaki
-- `notify_channel_telegram` / `notify_channel_whatsapp` anahtarlarını okuyor
-- (mevcut wa_notify_onay/iptal/revize deseniyle aynı: anahtar yoksa AÇIK).
--
-- Staff tablosunda eşdeğer esnek bir kolon yoktu, bu yüzden burada eklendi.
-- Varsayılan boş obje '{}' = "hiçbir kanal kapatılmamış" = hepsi açık — bu
-- yüzden mevcut kayıtlar için ayrıca bir UPDATE gerekmiyor, davranış otomatik
-- "başta hepsi açık" olacak şekilde başlıyor.
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS notify_channels_json JSONB NOT NULL DEFAULT '{}'::jsonb;
