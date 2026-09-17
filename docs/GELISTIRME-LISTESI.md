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

**Durum: TAMAMLANDI VE CANLIDA DOĞRULANDI (17 Eyl 2026).**
17 Eyl'de yabancı (RU) locale'li gerçek bir test hesabıyla doğrulandı: o ana kadar
Supabase'in tek şablonu her kullanıcıya Türkçe gidiyordu (backlog tetikleyicisi
gerçekleşti — bkz. [[password-reset-email-flow]]). Aynı oturumda çözüm de yazıldı:

- `src/app/api/auth/email-hook/route.ts` — Supabase "Send Email" Auth Hook hedefi.
  Standard Webhooks HMAC imzasını (`webhook-id/-timestamp/-signature`, replay
  koruması) doğrular, `user.user_metadata.locale`'e göre 4 dilde (tr/en/ru/ar)
  şablon seçip Resend'den gönderir. `recovery/signup/invite/email_change` action
  tiplerini kapsar — şu an uygulamada gerçekten tetiklenen tek akış `recovery`
  (signup `email_confirm:true` ile anında onaylandığı için Supabase e-postası hiç
  göndermiyor; diğer ikisi de kodda yok, ileriye dönük hazır).
- `src/lib/email/auth-i18n.ts` — metin tablosu (`src/lib/email/i18n.ts` deseniyle
  aynı yapı), mevcut canlı "Şifre sıfırlama" şablonunun lacivert/altın markasını
  4 dile taşıyor (aynı buton/link/süre metinleri, sadece dil farklı).
- Secret yoksa route her isteği 503 ile reddediyor — Dashboard'da kurulmadan
  risksiz/etkisiz, mevcut TR-only akışı bozmaz.
- Kullanıcı Supabase Dashboard'da hook'u kurdu (HTTPS →
  `https://siriplan.com/api/auth/email-hook`) + secret'ı Vercel'e ekledi;
  `main`'e merge + deploy edildi.
- **Canlıda uçtan uca doğrulandı:** `locale=ar` test kullanıcısına gerçek şifre
  sıfırlama tetiklendi, Resend'de Arapça konu satırıyla
  ("SiriPlan — رابط إعادة تعيين كلمة المرور") teslim edildiği görüldü, test
  kullanıcı silindi. (Aynı oturumda ru + en de ayrıca doğrulanmıştı.)

**İlgili dosya:** `docs/supabase-auth-emails.md` (mevcut TR-only Dashboard kurulumu
+ yeni "Seçenek B" bölümü), `src/lib/email/i18n.ts` (referans i18n deseni).

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
