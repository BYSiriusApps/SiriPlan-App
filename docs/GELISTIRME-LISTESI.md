# Geliştirme Listesi (Backlog)

Ertelenmiş işler. "Geliştirme listesinde ne var?" diye sorulduğunda buradan hatırlat.

---

## 1. Supabase Auth e-postaları çok dilli olsun

**Durum:** Ertelendi (28 Ağu 2026) — şu an uygulama pratikte TR-only.
**Tetikleyici:** İlk yabancı (EN/AR/RU) kullanıcı onboard edildiğinde yapılmalı.

**Sorun:** Supabase'de her e-posta türü için TEK şablon var, dile göre varyant yok.
Şu anki "Reset Password" şablonu Türkçe sabit → yabancı kullanıcı şifre sıfırlama,
kayıt doğrulama vb. e-postalarını Türkçe alır.

**Çözüm (Send Email Auth Hook):**
- Supabase → Authentication → Auth Hooks → "Send Email hook" →
  `https://siriplan.com/api/auth/email-hook` adresini göster (HMAC secret ile).
- Yeni route `src/app/api/auth/email-hook/route.ts`:
  - Gelen payload'dan `email_action_type`, `token_hash`, `user` al, HMAC doğrula.
  - `user.user_metadata.locale` oku (kayıtta zaten set ediliyor —
    `src/app/auth/callback/route.ts` içindeki `meta.locale`).
  - `src/lib/email/i18n.ts` tarzında bir "auth e-postaları metin tablosu" ekle
    (recovery / signup confirm / invite / email change), `src/lib/email/send.ts`
    içindeki `baseLayout` ile render et, Resend'den gönder.
  - Recovery linki: `${SITE_URL}/auth/yeni-sifre?token_hash=<hash>&type=recovery`
    (bu sayfa token'ı zaten kendisi doğruluyor — bkz. commit 5e9a635).
- Sonuç: tüm auth e-postaları kullanıcının dilinde, markalı, `noreply@siriplan.com`.
  Supabase dashboard şablonu tamamen devre dışı kalır.

**Maliyet:** ~1 route dosyası + auth metin tablosu. Orta.
**İlgili dosya:** `docs/supabase-auth-emails.md` (mevcut TR-only kurulum),
`src/lib/email/i18n.ts` (referans i18n deseni).
