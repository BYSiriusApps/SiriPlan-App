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

**17 Eyl 2026:** `next-intl` 3.26.5 → 4.14.5 yükseltildi (edfebf0), 2 moderate advisory kapandı.
Yukarıdaki "next-intl 4.x kırıcı geçiş" maddesi artık geçersiz.

**18 Eyl 2026:** `META_APP_SECRET` eklendi (ilk kurulum, rotasyon değil — daha önce hiç
tanımlı değildi, bu yüzden gelen WhatsApp webhook'ları fail-closed sessizce işlenmiyordu).
`sms_password` rotasyonu **N/A**: hiçbir kiracıda dolu değil. Bu değişiklik şu an
`feat/randevu-yeni-saat-oneri` dalında — main'e o dal merge olunca checklist'e yansıyacak
(bkz. aşağıdaki madde 4). `.github/workflows/security.yml` de main'de zaten var (6f8abd6/
e2fe467); GitHub Secrets/Variables + branch koruma kuralının fiilen kurulu olup olmadığı
`gh` yetkisi olmadan bu oturumdan doğrulanamadı.

**18 Eyl 2026 — Dependabot toplu güncelleme (PR #24, main'e merge edildi):** 5 açık PR'dan 3'ü
alındı — `next` 16.3.5, `react`/`react-dom` 19.3, `date-fns` 3→4, `resend` 4→6, `radix-ui`/
`@base-ui/react`/`@supabase/ssr`/`@supabase/supabase-js`/`playwright`/`eslint-config-next`
bumps. `npm install` + `tsc --noEmit` + `npm run lint` (0 error) + `npm run build` temiz.

2 tanesi **DIŞARIDA BIRAKILDI** (ayrı kod işi gerektiriyor):
- `lucide-react` 0.460→1.x: v1 marka ikonlarını (Instagram/Facebook/Linkedin) tamamen
  kaldırmış. 3 canlı dosyada kırıyor: `src/app/dashboard/ayarlar/page.tsx`,
  `src/app/dashboard/bekleyen-istekler/BekleyenIsteklerClient.tsx`, müşteriye dönük
  `src/app/r/[slug]/SalonBits.tsx`. Önce bu 3 ikon için alternatif (inline SVG veya başka
  paket) bulunmalı, sonra sürüm yükseltilebilir.
- `eslint` 9→10: `eslint-config-next`'in bağladığı `eslint-plugin-react` ile kırılıyor
  (`context.getFilename is not a function`) — `npm run lint` tamamen çöküyor. Tetikleyici:
  `eslint-config-next` bu API'yi destekleyen bir sürüm yayınlayınca tekrar denenmeli.

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

## 3. Web push bildirimleri (gerçek tarayıcı/telefon push'u — panel KAPALIYKEN de gelir)

**Durum (22 Eyl 2026):** Hâlâ başlanmadı. Bunun YERİNE aynı gün, panel AÇIKKEN
sesli+canlı uyarı kısmı ayrı bir iş olarak TAMAMLANDI: `LiveNotifications`
bileşeni (Supabase realtime ile `appointments`/`appointment_requests` INSERT
dinler → `notification-sound.ts` ile iki tonlu ses çalar + `sonner` toast
gösterir + sekme arka plandaysa `Notification` API ile OS bildirimi de dener +
`router.refresh()` ile üstteki şeritleri/rozetleri canlı günceller). Sidebar/
mobil menüde ses aç-kapa zil ikonu (`NotificationSoundToggle`) eklendi.
Bu, kullanıcı panel/sekme AÇIKKEN sesi kaçırma sorununu çözer; panel tamamen
KAPALIYKEN (uygulama arka planda/kapalı) bildirim almak hâlâ aşağıdaki gerçek
Web Push kurulumunu gerektiriyor — bu madde o yüzden hâlâ açık.

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

**İlgili dosya (bugün tamamlanan ses/canlı kısım):** `src/components/dashboard/LiveNotifications.tsx`,
`src/components/dashboard/NotificationSoundToggle.tsx`, `src/lib/notification-sound.ts`,
`src/app/dashboard/layout.tsx`, `src/components/dashboard/Sidebar.tsx`,
`src/components/dashboard/MobileSideMenu.tsx`. Gerçek Web Push kurulacağında
`public/sw.js`, `public/manifest.json`, `src/lib/notify.ts` de buna eklenecek.

---

## 4. "Yeni Saat Öner" özelliğinin devreye alınması

**Durum (18 Eyl 2026):** Kod tamamlandı, `feat/randevu-yeni-saat-oneri` dalında
(origin'e push edildi). `main`'e MERGE EDİLMEDİ — henüz Meta şablon onayı yok.

**Kalan adımlar (sırayla):**
1. Meta Business Manager'da `randevu_yeni_saat_onerisi_1` şablonu onaylanmalı
   (Türkçe, 4 gövde param + dinamik URL buton — submit edildi, onay bekleniyor;
   ilk deneme `randevu_yeni_saat_onerisi` adıyla yanlışlıkla İngilizce gönderilip
   silinemediği için `_1` suffix'iyle tekrar gönderildi).
2. `supabase/migrations/20260918_appointment_reschedule_proposal.sql` Supabase SQL
   Editor'e yapıştırılıp çalıştırılmalı (bkz. [[migration-apply-state]]).
3. Meta onayı + migration tamamlanınca `feat/randevu-yeni-saat-oneri` dalı `main`'e
   merge edilmeli.
4. Gerçek bir test randevusuyla uçtan uca doğrulama: panel → Yeni Saat Öner →
   WhatsApp mesajı → müşteri `/oneri/[token]` linki → Kabul Et/Reddet → panelde
   doğru sonuç + Telegram/WA bildirimi.

**İlgili dosya:** [[yeni-saat-oner-reschedule-proposal-sept18]] (memory),
`src/lib/wa-templates/registry.ts`, `src/lib/appointment-requests/approve.ts`,
`src/app/api/public/appointment-proposal/route.ts`, `src/app/oneri/[token]/page.tsx`.

---

## 5. Personel/sahip WhatsApp bildirimi — güvenilir hale getirme (Meta şablon onayı bekleniyor)

**Durum (22 Eyl 2026):** Kod tamam, `main`'de. Meta Business Manager'da yeni bir
şablon submit edilip ONAYLANANA kadar devreye girmez — o ana kadar sistem eski
davranışıyla (serbest metin, yalnızca son 24 saatte yazışılmışsa teslim olur)
çalışmaya devam eder, hiçbir şey KIRILMADI.

**Neden gerekliydi:** `notify.ts` zaten personele/sahibe (org.whatsapp_number /
staff.whatsapp_number doluysa) WhatsApp bildirimi göndermeyi DENİYORDU ama
`sendWhatsAppMessage` (whatsapp-notify.ts) serbest metin API'si kullanıyordu —
Meta kuralı gereği bu yalnızca alıcı işletmenin WhatsApp numarasına SON 24 SAAT
içinde yazmışsa teslim olur. Personel/sahip genelde kendi numarasına yazmaz,
bu yüzden bildirim büyük ihtimalle SESSİZCE hiç gitmiyordu — müşteri şablonları
(onay/iptal/hatırlatma, wa-templates/registry.ts) gibi 24 saat kısıtına takılmayan
bir ŞABLON yolu yoktu.

**Yapılanlar:**
- `src/lib/wa-templates/internal-registry.ts`: personel bildirimleri için ayrı,
  müşteri şablon sisteminden (Ayarlar sayfasındaki stil seçicilerden) bağımsız
  bir kayıt defteri — `yeni_randevu`, `yeni_talep`, `kritik_stok` amaçları.
  `metaName` alanları şimdilik `null` (Meta'da henüz onaylı şablon yok).
- `src/lib/wa-templates/internal-send.ts`: `sendInternalTemplate()` — `metaName`
  doluysa Meta'ya şablon mesajı gönderir, boşsa/başarısız olursa `false` döner.
- `src/lib/notify.ts`: `dispatch()`/`dispatchWhatsApp()` artık önce şablonu
  dener, o başarısız olursa (onaysız/yanıt reddi) otomatik olarak eski serbest
  metne düşer — hiçbir çağıran taraf değişmedi, davranış yalnızca ŞABLON
  onaylanınca iyileşir.
- Ayarlar → Genel ve Personel detay sayfalarındaki WhatsApp numarası alanlarına
  "yalnızca son 24 saatte yazışılmışsa teslim olur, Telegram'ı da bağlayın"
  uyarısı eklendi (4 dilde) — kullanıcı artık neden bazen bildirim gelmediğini
  anlayabiliyor.
- **(22 Eyl, ikinci tur) Kanal aç-kapa kutucukları:** Kullanıcı artık her kanalı
  (Telegram/WhatsApp) ayrı ayrı, kimliği SİLMEDEN geçici kapatabiliyor —
  "numarayı sildirmeden bildirimi durdur" ihtiyacı. `staff.notify_channels_json`
  (yeni migration `20260922_notify_channel_prefs.sql`, varsayılan `{}` = hepsi
  açık) + org tarafında YENİ KOLON gerekmedi, mevcut `settings_json`'a
  `notify_channel_telegram`/`notify_channel_whatsapp` anahtarları eklendi (aynı
  `wa_notify_onay` deseni: anahtar yoksa/true ise açık, yalnızca `false` kapatır).
  `notify.ts` her recipient için bu tercihi okuyup `dispatch()`'te filtreliyor.
  UI: Personel detay sayfasında Telegram/WhatsApp inputlarının altında kutucuk;
  Ayarlar → Entegrasyonlar'da aynısı + "Uygulama İçi Bildirim" (bu cihazın ses
  tercihi, `lib/notification-sound.ts`) + "Telefon Bildirimi — Yakında" (devre
  dışı, Faz 3 Web Push gelince aktifleşecek) satırları.

**Kalan tek adım — Meta Business Manager'da şablon submit etmek:**
Aşağıdaki 3 şablonu (Türkçe, "Utility" kategorisi) submit edip onaylanmasını
beklemek, sonra `internal-registry.ts`'deki ilgili `metaName`'i doldurmak yeterli
(başka kod değişikliği gerekmez):

1. **`personel_yeni_randevu`** — {{1}} işletme adı, {{2}} müşteri adı, {{3}} hizmet,
   {{4}} personel, {{5}} tarih, {{6}} saat:
   > ✅ {{1}} — Yeni randevu onaylandı.
   > Müşteri: {{2}} · Hizmet: {{3}} · Personel: {{4}}
   > {{5}} {{6}}

2. **`personel_yeni_talep`** — aynı 6 parametre:
   > 📋 {{1}} — Yeni randevu talebi geldi, onayınızı bekliyor.
   > Müşteri: {{2}} · Hizmet: {{3}} · Personel: {{4}}
   > {{5}} {{6}}

3. **`personel_kritik_stok`** — {{1}} işletme adı, {{2}} ürün adı, {{3}} kalan
   miktar, {{4}} birim:
   > ⚠️ {{1}} — Kritik stok uyarısı.
   > {{2}}: kalan {{3}} {{4}}. Stok girişi yapmayı unutmayın.

Not: Meta boş parametreyi ve satır başına 4+ ardışık boşluğu reddeder (bkz.
`wa-templates/send.ts` içindeki (#131009) notu) — gövde metinleri submit
edilirken bu haliyle (tek satır aralıklı) kullanılmalı.

**İlgili dosya:** `src/lib/notify.ts`, `src/lib/wa-templates/internal-registry.ts`,
`src/lib/wa-templates/internal-send.ts`, `src/app/dashboard/ayarlar/page.tsx`,
`src/app/dashboard/personel/[id]/page.tsx`.
