# Geliştirme Listesi (Backlog)

Ertelenmiş işler. "Geliştirme listesinde ne var?" diye sorulduğunda buradan hatırlat.

---

## 0. Teknik güvenlik — kalan işler (SEC-01..SEC-10)

**Durum (9 Eyl 2026):** SEC-09 (olay müdahale) + SEC-10 (erişim yönetimi) ✅ tamam.
GitHub Dependabot/Secret/Push protection açıldı. Kalan maddelerin tam listesi ve
öncelik sırası: **`docs/security/TEKNIK-GUVENLIK-CHECKLIST.md` → "⏳ KALAN İŞLER"**.

Öne çıkan (ücretsiz, kod-dışı):
- `META_APP_SECRET` + 1 kiracı `sms_password` rotasyonu (en riskli açık, aylardır bekliyor).
- Cloudflare Turnstile anahtarları (ücretsiz) → Vercel env.
- Supabase günlük yedek kontrolü.
- CI workflow dosyası (`.github/workflows/security.yml`) + Actions secret/variable.

**11 Eyl 2026:** Dependabot açıklarının tamamı (next kritik RCE, xlsx prototype pollution vb.)
temizlendi + panel görsel yüklemesi sunucu API + sharp yeniden kodlamaya taşındı. **Kalan tek
açık:** `next-intl` 3.26.x → 4.x. İki moderate advisory (open-redirect + `experimental.messages.
precompile` prototype pollution — precompile projede kullanılmıyor). 4.x **kırıcı geçiş**:
ayrı PR + tam i18n regresyon testi gerekir. Tetikleyici: acil değil; başka bir next-intl işi
açıldığında birlikte yapılır.

**Migration bekliyor:** `20260911_upload_hardening_storage.sql` — kod deploy'undan SONRA
SQL Editor'e (SVG mime kaldırma + Storage doğrudan-yazım politikalarını düşürme).

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

---

## 2. AI arama motorlarında görünürlük (GEO)

**Durum:** Denetim + ilk teknik düzeltmeler yapıldı (17 Eyl 2026, dal
`fix/geo-ai-search-visibility` — sitemap'e `/guvenlik` + `/hesap-silme` eklendi,
robots.ts'e CCBot izni eklendi). PR açılmayı bekliyor.
**Tetikleyici:** Kullanıcı "sonra bakacağım" dedi — plan hazır, karar/uygulama bekliyor.

**Zaten sağlam olan temel:** robots.ts (GPTBot/ClaudeBot/PerplexityBot/Google-Extended/
anthropic-ai/cohere-ai/CCBot açık), `public/llms.txt`, Organization+SoftwareApplication+
WebSite+FAQPage JSON-LD, her sayfada canonical tag (edf59cd).

**Bekleyen mimari karar:** Site locale'i URL'e göre değil çerez/IP'ye göre belirliyor
(`src/i18n/request.ts`) — `/fiyatlar` TR/EN/RU/AR için aynı URL. Bu doğru hreflang
eklemeyi engelliyor; AI crawler'lar (çerezsiz, genelde ABD IP'li) siteyi hep aynı dil
sürümünde görüyor. İki seçenek: (a) mevcut yapıyı koru — TR pazarı için yeterli, ya da
(b) locale-prefixli URL'lere geç (`/en/fiyatlar` vb.) — orta-büyük mimari değişiklik,
sadece uluslararası AI arama görünürlüğü hedefleniyorsa gerekli.

**Asıl kaldıraç (kod dışı):** AI motorları çoğunlukla üçüncü taraf atıflara güveniyor.
Yazılım dizin siteleri (Capterra, GetApp), Google Business Profile, müşteri referansları
(AggregateRating JSON-LD için girdi), sektörel forum/topluluk mention'ları, karşılaştırma
içerikli blog yazıları öncelikli.

**Maliyet:** Teknik kısım küçük (yapıldı). Off-site/içerik kısmı sürekli bir çaba,
kod değil.
**İlgili dosya:** [GEO görünürlük planı (doküman)](https://claude.ai/artifact/EZ3rskRP1B2t3ArKWXA6c3),
`src/app/robots.ts`, `src/app/sitemap.ts`, `src/i18n/request.ts`, `src/app/(marketing)/sss/page.tsx`.
