-- 20261011 — Web Push abonelikleri (cihaz başına bir satır).
--
-- Bu migration TEKRAR ÇALIŞTIRILABİLİR (idempotent). Önce kod deploy edilebilir:
-- tablo yokken push gönderimi sessizce atlanır, mevcut Telegram/WhatsApp akışı değişmez.
--
-- GÜVENLİK: RLS açık, hiçbir politika yok ve anon/authenticated'dan tüm yetki
-- alınır — tabloya YALNIZCA service_role erişir (API uçları oturumu sunucuda
-- doğrular, user_id'yi istekten değil oturumdan alır). Endpoint + anahtarlar
-- bir bildirim gönderme yetkisi taşıdığı için istemciye asla okunmaz.
-- Hangi bildirimin kime gittiği gönderim anında org_members üyeliğinden çözülür;
-- tabloda org_id tutulmaz (kullanıcı başka işletmeye geçse/çıkarılsa bayat kalmaz).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint     TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_subscriptions FROM PUBLIC, anon, authenticated;
