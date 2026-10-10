-- 20261014 — iOS uygulaması (FCM + APNs) cihaz token'ları (cihaz başına bir satır).
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent). Önce kod deploy edilebilir:
-- tablo yokken FCM gönderimi sessizce atlanır; Web Push/Telegram/WhatsApp akışı değişmez.
--
-- GÜVENLİK: push_subscriptions ile aynı model — RLS açık, politika yok, anon/authenticated'dan
-- tüm yetki alınır; tabloya YALNIZCA service_role erişir. user_id istekten değil
-- oturumdan gelir. Hangi bildirimin kime gittiği gönderim anında org_members
-- üyeliğinden çözülür (org_id burada tutulmaz: kullanıcı işletme değiştirse/çıkarılsa
-- kayıt bayat kalmaz ve başka kiracıya bildirim gitmez). FCM token'ı bildirim
-- gönderme yetkisi taşıdığı için istemciye asla okunmaz.

CREATE TABLE IF NOT EXISTS push_device_tokens (
  token        TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios')),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user ON push_device_tokens (user_id);

ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_device_tokens FROM PUBLIC, anon, authenticated;
