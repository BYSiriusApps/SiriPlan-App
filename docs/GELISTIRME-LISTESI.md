# Geliştirme Listesi (Backlog)

Ertelenmiş işler. "Geliştirme listesinde ne var?" diye sorulduğunda buradan hatırlat.

---

## 0. Teknik güvenlik — kalan işler (SEC-01..SEC-10)

**Durum (9 Eyl 2026):** SEC-09 (olay müdahale) + SEC-10 (erişim yönetimi) ✅ tamam.
GitHub Dependabot/Secret/Push protection açıldı. Kalan maddelerin tam listesi ve
öncelik sırası: **`docs/security/TEKNIK-GUVENLIK-CHECKLIST.md` → "⏳ KALAN İŞLER"**.

Öne çıkan (ücretsiz, kod-dışı):
- ~~`META_APP_SECRET` + kiracı `sms_password` rotasyonu~~ **TAMAMLANDI (18 Eyl 2026)**:
  `META_APP_SECRET` Vercel + local env'e eklendi (ilk kurulum, önceden hiç yoktu — WA webhook
  işleme artık aktif olmalı, uçtan uca test bekliyor); `sms_password` hiçbir kiracıda kullanılmadığı
  için N/A.
- Cloudflare Turnstile anahtarları (ücretsiz) → Vercel env.
- Supabase günlük yedek kontrolü.
- ~~CI workflow dosyası + Actions secret/variable + main branch ruleset~~ **TAMAMLANDI
  (18 Eyl 2026)**: `.github/workflows/security.yml` main'de (commit `6f8abd6`), Secrets
  (`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`) + Variable (`SECURITY_TESTS_ENABLED=1`) eklendi,
  `main` ruleset'i Active + `static` check zorunlu.

**11 Eyl 2026:** Dependabot açıklarının tamamı (next kritik RCE, xlsx prototype pollution vb.)
temizlendi + panel görsel yüklemesi sunucu API + sharp yeniden kodlamaya taşındı. **Kalan tek
açık:** `next-intl` 3.26.x → 4.x. İki moderate advisory (open-redirect + `experimental.messages.
precompile` prototype pollution — precompile projede kullanılmıyor). 4.x **kırıcı geçiş**:
ayrı PR + tam i18n regresyon testi gerekir. Tetikleyici: acil değil; başka bir next-intl işi
açıldığında birlikte yapılır.

**Migration durumu:** `20260911_upload_hardening_storage.sql` uygulandı (kullanıcı beyanı 11
Eyl, canlı sorguyla 17 Eyl doğrulandı — bkz. migration-apply-state). Bekleyen migration yok.

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

**Durum (18 Eyl 2026):** Mimari karar verildi — (b) locale-prefixli URL'lere geçildi
(`fix/geo-ai-search-visibility` sonrası bekleyen tek karar buydu). Dal:
`feat/geo-locale-prefix-urls`, henüz main'e merge/PR edilmedi, kullanıcı onayı bekliyor.

**Ne yapıldı:**
- `src/app/(marketing)` → `src/app/[locale]/(marketing)` taşındı; dashboard/admin/api/
  auth/r/randevu/onay dokunulmadan, önek'siz kaldı (next-intl `as-needed` prefix,
  varsayılan tr önek almıyor).
- `src/proxy.ts`: pazarlama yolları için next-intl `createMiddleware(routing)` çağrılıyor;
  ilk ziyarette (cookie yok, URL'de önek yok) IP-ülke/hesap tercihini bilen mevcut zincir
  next-intl'i çağırmadan ÖNCE `NEXT_LOCALE` çerezini seçiyor (`lib/i18n/resolve-locale.ts`)
  — next-intl'in kendi Accept-Language tahminine hiç düşülmüyor. Bilinen arama/AI
  crawler'ları (Googlebot/Bingbot/GPTBot/ClaudeBot/PerplexityBot/…) İSTİSNA: hiçbir zaman
  locale'e göre yönlendirilmezler, her zaman çıplak (tr) URL'i görürler — aksi halde ABD
  IP'li bir crawler `/fiyatlar`'dan `/en/fiyatlar`'a düşer ve GSC'nin 17 Eylül'de
  düzelttiği "hangi URL asıl" karışıklığı geri gelirdi.
- `src/i18n/request.ts`: `requestLocale` doluysa (marketing) onu kullanır, boşsa
  (dashboard/auth/vb.) eski cookie/hesap/IP zincirine düşer — tek config, dallanma.
- 17 sayfanın `alternates.canonical`'ı `src/lib/seo/alternates.ts`'teki `buildAlternates()`
  ile self-referencing canonical + 4 dil + x-default hreflang'e genişletildi.
- `src/app/sitemap.ts`: her sayfa × 4 locale = ayrı URL, her biri `alternates.languages`
  ile tam hreflang kümesini taşıyor.
- `src/components/marketing/Navbar.tsx`: dil değiştirici artık cookie yazıp
  `router.refresh()` yerine `next-intl/navigation`'dan (`src/i18n/navigation.ts`,
  yeni) `router.replace(pathname, {locale})` ile gerçek URL'e gidiyor.
- Doğrulandı: `next build` + `tsc --noEmit` + lint (yeni hata yok) + `npm run i18n:audit`
  temiz + manuel curl testleri (crawler bypass, native app route kilidi hem çıplak hem
  `/en/...` yollarda çalışıyor, `/dashboard`/`/auth`/`/r`/`/randevu`/`/onay` tamamen
  etkilenmedi, bilinmeyen tek segmentli yol hâlâ 404 — next-intl'in "[locale] catch-all
  gibi davranabilir" uyarısına karşı `[locale]/layout.tsx`'te `notFound()` güvenlik ağı
  eklendi).

**Kalan (kod dışı):** dal main'e merge edilmeli; sonrasında GSC'de yeni sitemap
gönderilip birkaç hafta "duplicate/canonical" uyarısı geri gelmiyor mu izlenmeli.

---

## 3. Web push bildirimleri (gerçek tarayıcı/telefon push'u)

**Durum (18 Eyl 2026):** Planlandı, henüz başlanmadı — [[yeni-saat-oner]] özelliği
sırasında kullanıcı "web push'u da sonra kuracağız" dedi, bu turun kapsamı dışında
tutuldu (bkz. o özelliğin kararı: bu turda sadece mevcut Telegram+WhatsApp kanalları).

**Mevcut durum:** `public/sw.js` sadece PWA kurulabilirlik kriteri için var, `push`
event listener'ı yok. VAPID/`web-push` paketi, `Notification`/`PushManager` kullanımı
hiçbir yerde yok. Native tarafta da (Android TWA, PWABuilder ile üretiliyor — bu
repoda `android/` kaynak kodu yok) FCM entegrasyonu yok.

**Neden işe yarar:** Android TWA gerçek Chrome sekmesi çalıştırdığı için Web Push API
(VAPID) teorik olarak native uygulamada da (Chrome'un kendi bildirim sistemi
üzerinden) çalışır — ayrı bir Firebase/FCM kurulumuna gerek kalmadan.

**Kapsam (kurulacaklarsa):**
- VAPID anahtar çifti üretimi + `web-push` (veya eşdeğeri) paketinin eklenmesi.
- `public/sw.js`'e `push` + `notificationclick` event listener'ı.
- İzin isteme UI'ı (panelde "Bildirimlere izin ver" — muhtemelen Ayarlar sayfası).
- `push_subscriptions` tablosu (kullanıcı/org bazlı, çoklu cihaz desteği).
- `src/lib/notify.ts`'e üçüncü bir `dispatch` kanalı (Telegram + WhatsApp'ın yanına).
- Test: gerçek bir cihazda (Android TWA + masaüstü Chrome) bildirim gelip
  tıklanınca doğru sayfaya (`/dashboard/bekleyen-istekler` vb.) gittiğini doğrulamak.

**Asıl kaldıraç (kod dışı, değişmedi):** AI motorları çoğunlukla üçüncü taraf atıflara
güveniyor. Yazılım dizin siteleri (Capterra, GetApp), Google Business Profile, müşteri
referansları (AggregateRating JSON-LD için girdi), sektörel forum/topluluk mention'ları,
karşılaştırma içerikli blog yazıları öncelikli.

**İlgili dosya:** [GEO görünürlük planı (doküman)](https://claude.ai/artifact/EZ3rskRP1B2t3ArKWXA6c3),
`src/proxy.ts`, `src/i18n/request.ts`, `src/i18n/routing.ts`, `src/i18n/navigation.ts`,
`src/lib/i18n/resolve-locale.ts`, `src/lib/seo/alternates.ts`, `src/app/sitemap.ts`.
