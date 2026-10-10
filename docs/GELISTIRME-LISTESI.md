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
- `eslint` 9→10: **YAPILACAK İŞ DEĞİL, sadece hatırlatma notu** — bizim tarafımızda
  yapacak bir şey yok, aksiyon alınmayacak. `eslint-config-next`'in bağladığı
  `eslint-plugin-react` eslint 10'un yeni eklenti API'siyle uyumsuz
  (`context.getFilename is not a function`) — `npm run lint` tamamen çöküyor
  (`next build`/`tsc` etkilenmiyor, sadece lint aracı). Kök neden bizim kodumuzda
  değil: **Vercel/Next.js ekibinin `eslint-config-next`'i eslint 10 uyumlu yeni bir
  sürümle güncellemesi gerekiyor.** O sürüm çıkana kadar Dependabot'un bu PR'ı
  düzenli açması beklenen davranış — her seferinde reddedilebilir. Bu not sadece
  "yarın tekrar karşımıza çıkarsa neden olduğunu hatırlayalım" diye tutuluyor.

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

**Durum: TAMAMLANDI VE MAIN'DE (18 Eyl 2026).** `feat/geo-locale-prefix-urls` merge
commit `7978c9a` ile main'e geçmiş (`git merge-base --is-ancestor` ile 24 Eyl'de
teyit edildi). `fix/geo-ai-search-visibility` de aynı şekilde main'in atası.

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

**Kalan (kod dışı):** GSC'de yeni sitemap gönderilip birkaç hafta "duplicate/canonical"
uyarısı geri gelmiyor mu izlenmeli.

---

## 3. ✅ Web push bildirimleri — TAMAMLANDI (10 Eki 2026)

Canlıda; masaüstü Chrome ve Android uygulaması (TWA) gerçek cihazda doğrulandı, yeni AAB gerekmedi. Owner/yönetici tüm bildirimleri, personel yalnızca kendine atananları alır. Dosyalar: `src/lib/web-push.ts`, `src/app/api/push/subscribe`, `public/sw.js`, `PushToggle`, `PushPrompt`, `notify.ts`.
**Kalan (isteğe bağlı):** iOS (Safari Ana Ekran PWA veya APNs) sonraki faz; eski personele WhatsApp numarası otomatik atanmadı.

---

## 4. ✅ "Yeni Saat Öner" — TAMAMLANDI (22 Eyl 2026; 1 Eki 2026 canlıda yeniden doğrulandı)

Öneri → müşteri linki (`/oneri/[token]`) → kabul → randevu onaylandı akışı canlıda uçtan uca
test edildi, çalışıyor. Kalan iş yok.

---

## 5. ✅ Personel/sahip WhatsApp bildirimi — TAMAMLANDI (28 Eyl 2026)

**Sonuç (28 Eyl 2026):** Aşağıdaki 3 Türkçe + 10 İngilizce şablon (toplam 13)
Meta tarafından onaylandı, kullanıcı teyit etti. `internal-registry.ts` /
`wa-templates/registry.ts`'deki `metaName`/`metaNameEn` alanları zaten dolu
olduğu için ek bir deploy gerekmedi — onay anında devreye girdi. Aşağıdaki
geçmiş bölüm referans amaçlı bırakıldı.

**Kalan:** Yok.

---

**Durum (22 Eyl 2026, geçmiş):** Kod tamam, `main`'de. Meta Business Manager'da yeni bir
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

**Durum (24 Eyl 2026):** 3 şablon da Graph API üzerinden WABA'ya (`1295808672630869`)
submit edildi, üçü de Meta incelemesinde **PENDING**:
- `personel_yeni_randevu` → template id `1441158747883677`
- `personel_yeni_talep` → template id `3149481118576768`
- ~~`personel_kritik_stok` → template id `1857261352301818`~~ (30 Eyl: Meta'dan silindi, kayıt defterinde `null`)

İlk denemede `personel_yeni_randevu` "değişken/kelime oranı" hatasıyla,
`personel_yeni_talep` ise "değişken başta/sonda olamaz" hatasıyla reddedildi —
aşağıdaki gövde metinleri bu ikisi düzeltilerek submit edilen NİHAİ halidir.
Meta onaylayınca `internal-registry.ts`'deki ilgili `metaName`'i doldurmak
yeterli (başka kod değişikliği gerekmez, parametre SAYISI/SIRASI değişmedi):

1. **`personel_yeni_randevu`** — {{1}} işletme adı, {{2}} müşteri adı, {{3}} hizmet,
   {{4}} personel, {{5}} tarih, {{6}} saat:
   > ✅ Randevu onaylandı — {{1}}
   > Müşteri: {{2}} · Hizmet: {{3}} · Personel: {{4}}
   > Tarih: {{5}}, saat: {{6}}. Detaylar için panele bakabilirsiniz.

2. **`personel_yeni_talep`** — aynı 6 parametre:
   > 📋 Yeni talep geldi — {{1}}
   > Müşteri: {{2}} · Hizmet: {{3}} · Personel: {{4}}
   > Tarih: {{5}}, saat: {{6}}. Onayınızı bekliyor, panelden yanıtlayabilirsiniz.

3. **`personel_kritik_stok`** — {{1}} işletme adı, {{2}} ürün adı, {{3}} kalan
   miktar, {{4}} birim (ilk denemede sorunsuz onaya gitti, değişmedi):
   > ⚠️ {{1}} — Kritik stok uyarısı.
   > {{2}}: kalan {{3}} {{4}}. Stok girişi yapmayı unutmayın.

Not: Meta boş parametreyi, satır başına/sonuna değişken konmasını ve düşük
kelime/değişken oranını reddeder (bkz. `wa-templates/send.ts` içindeki
(#131009) notu) — gövde metinleri submit edilirken bu haliyle kullanılmalı.

**İlgili dosya:** `src/lib/notify.ts`, `src/lib/wa-templates/internal-registry.ts`,
`src/lib/wa-templates/internal-send.ts`, `src/app/dashboard/ayarlar/page.tsx`,
`src/app/dashboard/personel/[id]/page.tsx`.

### ⏳ YAPILACAK — Meta şablon onay kontrolü

Yukarıdaki 3 Türkçe + aşağıdaki 10 İngilizce şablon (toplam 13) hâlâ **PENDING**.
Meta genelde birkaç dakika–birkaç saat içinde karar veriyor. Kontrol için:
Meta Business Manager → WhatsApp Yöneticisi → Mesaj Şablonları (WABA
`1295808672630869`) — durum REJECTED çıkarsa ret sebebini oku, gövdeyi
düzeltip yeniden submit et (yukarıdaki #131009/#132000/2388293/2388299 notlarına
bak). Kod tarafında BAŞKA HİÇBİR ŞEY YAPMAYA GEREK YOK: `metaName`/`metaNameEn`
alanları zaten dolduruldu, onaylanan şablon bir sonraki gönderimde otomatik
devreye girer (yeniden deploy gerekmez, `dispatch()`/`sendPurposeTemplate()`
Meta'dan başarılı yanıt aldığı an o şablonu kullanmaya başlar).

**Durum (24 Eyl 2026, 2. tur) — İngilizce (global) şablonlar + dil bazlı seçim:**
Türkçe dışındaki müşteri/personel/sahip bildirimleri için 10 İngilizce şablon
daha aynı WABA'ya submit edildi, hepsi **PENDING**:

Müşteriye giden (7):
- `appointment_confirmation_1` (id `1062687706615795`) — `onay_sicak` EN karşılığı
- `appointment_confirmation_2` (id `1874471050216442`) — `onay_v2` EN karşılığı
- `appointment_cancelled` (id `3538845326275252`) — `iptal_sicak` EN karşılığı
- `appointment_rescheduled` (id `1121391944178693`) — `revize_sicak` EN karşılığı
  (TR'deki statik URL butonunun gerçek hedefi bilinmediği için BUTONSUZ submit
  edildi, gövde/parametreler birebir aynı)
- `appointment_reminder_1` (id `4490847197911305`) — `hatirlatma_sicak`/`hatirlatma_v1` EN karşılığı
- `appointment_reminder_2` (id `1528315672436824`) — `hatirlatma_v2` EN karşılığı
- `new_time_proposal` (id `2491180671391819`) — `oneri_sicak` EN karşılığı, TR'deki
  ile birebir aynı dinamik URL butonu (`https://siriplan.com/oneri/{{1}}`)

Personel/sahibe giden (3 — yukarıdaki maddenin İngilizcesi):
- `staff_new_appointment` (id `1717573342682155`) — `personel_yeni_randevu` EN
- `staff_new_request` (id `1494018265912278`) — `personel_yeni_talep` EN
- ~~`staff_low_stock_alert` (id `1134593909213895`)~~ — 30 Eyl: Meta'dan silindi, `personel_kritik_stok` ile birlikte

**Dil seçimi nasıl çalışıyor:**
- Müşteri tarafı (`wa-templates/send.ts`): gönderim anında `customers` tablosundan
  `org_id` + telefonla `preferred_language` okunur (bkz. müşteri detay sayfasındaki
  dil seçici / `/api/public/customer-language`). `"en"` ise ve `metaNameEn` doluysa
  önce İngilizce denenir; Meta reddeder/onaysızsa (PENDING) **otomatik olarak
  Türkçe'ye düşülür** — hiçbir müşteri mesajsız kalmaz, davranış hiçbir zaman kırılmaz.
- Personel/sahip tarafı (`notify.ts` → `internal-send.ts`): kişinin kendi
  `staff.preferred_language`'ı (Hesabım sayfasından seçtiği panel dili) okunur,
  aynı EN → TR → serbest metin (3 kademeli) düşüş sırası uygulanır.
- Yalnızca `tr`/`en` destekleniyor; `ru`/`ar` panel dili seçili kullanıcılar/
  müşteriler şimdilik Türkçe şablon alır (WA şablonu yok, yalnızca bu iki dil
  için Meta'ya submit edildi).

**Doğrulama notu:** Bu oturumda ortamda `node_modules` beklenmedik şekilde boşaldı
(muhtemelen bulut senkron istemcisi node_modules'ü "dehydrate" etti — bkz. proje
notlarındaki "yavaş dosya sistemi" sorunuyla aynı kök neden) — `tsc`/`eslint`
çalıştırılamadı, yalnızca dikkatli elle kod incelemesiyle doğrulandı. `npm install`
sonrası (veya bulut senkronu tamamlanınca) `npx tsc --noEmit` + `npm run lint`
ile bir kez daha doğrulanmalı.

**İlgili dosya (2. tur):** `src/lib/wa-templates/registry.ts`,
`src/lib/wa-templates/send.ts`, `src/lib/wa-templates/internal-registry.ts`,
`src/lib/wa-templates/internal-send.ts`, `src/lib/notify.ts`.

---

## 6. Yasal metinler / künye — gözden geçirilecek kalan kalemler

**Durum (23 Eyl 2026):** `feat/legal-hardening-site-audit` **main'e merge + deploy edildi**
(merge commit `1f8f04b`, 8 Eyl 2026 — bkz. [[legal-compliance-posture]]). PR'ın kendi GitHub
linkleri (`pull/new/...`, `compare/main...feat/...`) artık boş görünür çünkü dal main'in
ATASI durumunda — bu normal, "merge edilmemiş" anlamına gelmez.

Merge ile eklenenler: Kullanım Koşulları'na garanti reddi/üçüncü taraf/AI/mücbir sebep/
tazminat/iade maddeleri, gizlilik+KVKK'da alt-işleyen kategorileri + yurt dışı aktarım
açıklaması, footer künyesi (Companies House No. 17142392 + 🇬🇧), "Çerez ayarları" linki,
`/guvenlik` + `/.well-known/security.txt`, sadeleştirilmiş `public/llms.txt`.

**Bilinçli eklenmeyip AÇIK bırakılanlar** (danışman + entity kararı gerektirdiği için):

1. **Kayıtlı tam sokak adresi** — footer'da yalnızca "İngiltere ve Galler'de kayıtlı ·
   Companies House No. 17142392" var, açık adres yok (kullanıcıda da yoktu).
2. **`/iletisim` sayfası hâlâ "Türkiye" diyor**, footer ise UK diyor — tutarsızlık sürüyor.
   Şirketin fiilen Türkiye'den yönetilmesinden doğan vergi ikameti/entity kararı (bkz.
   uyum listesi "ST" bölümü) netleşmeden bilinçli olarak dokunulmadı.
3. **bysirius.com (ayrı repo)** — çerez rıza bandı ve Çerez Politikası sayfası hâlâ yok.
   Bu repodaki PR kapsamı dışında, o kod tabanında elle yapılmalı.
4. **Müşteri DPA (Veri İşleme Sözleşmesi) linki** — işletme müşterilerine sunulacak ayrı
   sözleşme hâlâ eklenmedi.
5. **AB Erişilebilirlik beyanı** sayfası hâlâ yok.
6. **Tam GDPR/UK GDPR hak bölümleri, CCPA, AB temsilcisi (Art. 27) beyanı** — hukuk
   danışmanı olmadan bilinçli eklenmedi (yanlış/eksik metin yeni yükümlülük doğurabilir).
7. **Kullanıcı eklenen garanti reddi / tazminat maddelerini fiilen okuyup onaylamadı** —
   danışmansız yayınlandığı için ilk fırsatta gözden geçirilmeli.

**Takip listesi (canlı, işaretlenebilir):**
https://claude.ai/code/artifact/9ca22e6c-44d4-4d44-8f5d-ea73b1baebbd — yukarıdaki kalemler
bölüm 11 (Web Sitesi Uyum Denetimi) ve ST bölümünde "Yapılacak" olarak duruyor.

---

## 7. Plan yükseltme (mevcut abone) — çift ücretlendirme fix'i

**Durum: TAMAMLANDI, Stripe TEST MODU'nda uçtan uca doğrulandı (24 Eyl 2026).**
Yıllık Starter ödeyen bir kullanıcı Pro'ya "Yükselt" derse eskiden ikinci bir
Checkout Session açılıp **çift ücretlendirme** oluyordu (kullanıcı bunu fark edip
sordu). Düzeltme: mevcut aboneliği `stripe.subscriptions.update(...)` ile
prorasyonla güncelleyen yeni bir uç eklendi.

**24 Eyl — testte bulunan ve DÜZELTİLEN ayrı bir bug (bu fix'ten eski, projenin
ilk commit'inden beri vardı):** `checkout.session.completed` handler'ı
`session.subscription_data.metadata` okuyordu — bu alan yalnızca Session
OLUŞTURULURKEN gönderilen bir istek parametresi, gerçek webhook payload'ında
hiç yok. Sonuç: `organizations.stripe_subscription_id` hiçbir gerçek müşteri
için hiç yazılmıyordu. Bu da bugünkü fix'in dayandığı iki şeyi sessizce
etkisiz bırakıyordu: "Pro'ya Yükselt" butonu (`stripe_subscription_id` şartı)
ve `/api/stripe/checkout`'taki 409 çift-abonelik koruması. Düzeltme: org artık
dosyadaki diğer handler'larla aynı desenle `session.customer` üzerinden
bulunuyor. Commit `fc1bd14`. **Canlıda da aynı sorun olabilir** — mevcut
Starter abonelerin DB'de `stripe_subscription_id` dolu mu diye kontrol
edilmesi önerilir (deploy sonrası yeni event'ler doğru yazacak, ama eski
kayıtlar için `stripe events resend` ile geriye dönük doldurma gerekebilir).

**Test sonucu (Stripe test modu, `sirius-demo-nail-art-studio` org'u):**
checkout ile test kartıyla (4242...) Starter satın alındı → webhook
`stripe_subscription_id`'yi doğru yazdı (fix sonrası) → `/api/stripe/change-plan`
ile Pro'ya yükseltme çağrıldı → Stripe'ta **tek** abonelik güncellendi (yeni
abonelik AÇILMADI), `billing_reason: "subscription_update"` tek bir prorasyon
faturası kesildi, DB'de `plan` doğru şekilde "pro" oldu. Test sonunda oluşan
test-mode abonelikler iptal edildi, org kendi `customer.subscription.deleted`
webhook akışıyla otomatik "trial"a döndü.

**Değişen/eklenen dosyalar:**
- `src/app/api/stripe/change-plan/route.ts` (yeni) — mevcut aboneliğin fiyat kalemini
  günceller, `proration_behavior: "always_invoice"` + `payment_behavior:
  "error_if_incomplete"` (ödeme başarısızsa plan değişmez).
- `src/app/api/stripe/checkout/route.ts` — zaten aktif aboneliği olan org için 409
  (çift abonelik açılmasının API seviyesinde önlenmesi).
- `src/app/api/webhooks/stripe/route.ts` — plan tespiti artık `metadata.plan`
  bulunamazsa Stripe fiyat ID'sinden de yapılabiliyor (`planFromPriceId`).
- `src/lib/stripe/apply-plan.ts` (yeni, webhook + change-plan ortak mantığı).
- `src/components/dashboard/UpgradeToProButton.tsx` (yeni) + `abonelik/page.tsx`.

**⚠️ Kritik ön koşul — test ASLA canlı Stripe'a karşı yapılmamalı:**
Yerel `.env.local` şu an **`sk_live_...` (canlı) Stripe anahtarı ve canlı Price ID'lerle**
yapılandırılmış, ayrıca `NEXT_PUBLIC_SUPABASE_URL` de gerçek/canlı Supabase projesine
işaret ediyor (ayrı bir staging ortamı yok — proje zaten "demo test hesapları" ile canlı
DB üzerinde test ediyor, bkz. [[demo-test-accounts]]). Bu yüzden change-plan akışı
**olduğu gibi** yerelde denenirse gerçek bir abonelik güncellenir/faturalanır.

**Kullanılan yöntem (canlı .env.local'e hiç dokunulmadı):** `STRIPE_SECRET_KEY`/
`STRIPE_WEBHOOK_SECRET`/6 `STRIPE_PRICE_*` değişkenleri `.env.local`'in YANINA,
ayrı bir `.env.development.local` dosyasına yazıldı — Next.js'in yükleme sırasında
(`.env.development.local` → `.env.local` → ...) bu dosya yalnızca `npm run dev`
çalışırken canlı değerlerin önüne geçiyor, `.env.local` hiç değişmedi. Test
bitince dosya silindi.

**Kalan:** Yok — kod main'e push edilmeye hazır.

---

## 8. ✅ Barkod: uygulama içi kamera için yeni AAB — TAMAMLANDI (28 Eyl 2026)

Sürüm 3 (1.0.0.3, CAMERA+RECORD_AUDIO izinli) Play Console'da %100 rollout'ta,
"Yayınlandı". Kamera izni kurulu TWA'da soruluyor, barkod tarama uygulama
içinde çalışıyor (kullanıcı test cihazında doğruladı). Data safety formu
içerik olarak değişmedi, kullanıcı tarih güncellensin diye değişiklik
yapmadan yeniden gönderdi. Detay: `docs/play-store/aab-camera-todo.md`,
memory `play-store-submission-state`.

**Kalan:** Yok.

---

## 9. ✅ Panel geçiş/yükleme performansı — TAMAMLANDI (Faz 1-5 uygulandı; 8 Eki 2026 doğrulandı)

**Durum (25 Eyl 2026):** Mobilde "açılışta yavaşlık + geç güncelleme + geçişlerde
yavaşlama" şikayeti araştırıldı (3 paralel Explore ajanı + Next.js'in bu sürüme
özel resmi docs'u doğrulandı). Faz 1 (auth round-trip dedup:
`src/app/actions/dashboard-widgets.ts` + `shortcuts.ts` → `getSessionUser()`) ve
Faz 2 (LiveNotifications + UnifiedCalendar çift-refresh düzeltmesi, takvim
sayfasında debounce + tekilleştirme) uygulandı. Kalan fazlar aşağıda — istenirse
ayrı bir oturumda ele alınabilir.

**Faz 5.5 — Bekleme Listesi sayfası SSR'a taşındı (25 Eyl 2026, ikinci tur):**
Kullanıcı "bekleme listesi/bekleyen işler az önce takıldı, 3 sn'den geç açılıyor,
App Store ret sebebi olabilir" diye bildirdi. Kök neden bulundu:
`bekleme-listesi/page.tsx` tamamen client component'ti, mount olunca 6 ayrı API
ucuna (`/api/waitlist`, `/api/appointments`, `/api/appointment-requests`,
`/api/staff`, `/api/services`, `/api/org`) paralel istek atıyordu — her uç kendi
`auth.getUser()` (Supabase Auth ağ turu) + `getActiveMember()` (DB turu) çiftini
AYRI AYRI tekrarlıyordu (6 ayrı serverless çağrısı × 2 round-trip). Veriler boşken
bile mobilde bu yüzden "takılıyordu". Komşu sayfa `bekleyen-istekler` zaten doğru
desendeydi (server component + tek `Promise.all`) — aynı desen uygulandı:
- `bekleme-listesi/page.tsx` → server component'e çevrildi, tüm başlangıç verisi
  (waitlist/talep/appointment_requests + form dropdown'ları için personel/hizmet)
  `getSessionUser()`/`getActiveMember()` zaten `cache()`'li olduğundan EK ağ turu
  olmadan tek `Promise.all` ile çekiliyor.
- Yeni `bekleme-listesi/BeklemeListesiClient.tsx` — tüm onayla/reddet/öner/sil/
  kaydet mantığı BİREBİR korunarak (davranış hiç değişmedi) yalnızca başlangıç
  state'i prop'tan alıyor; aksiyon sonrası tazeleme (`fetchData`) client'ta
  aynen kaldı (yalnızca kullanıcı aksiyonuyla tetiklenir, ilk açılışı bloklamaz).
- Personel dropdown'u artık `select("*")` yerine yalnızca `id, full_name`
  seçiyor — maaş/prim gibi hassas kolonlar (staff rolünün asla görmemesi
  gereken alanlar) baştan sorguya hiç girmiyor, önceki `stripSalaryIfStaff`
  filtrelemesinden daha sıkı.
- `npx tsc --noEmit` + `npm run lint` temiz (0 hata, iki dosyada hiç uyarı yok).
- **Doğrulanmadı:** Gerçek mobil cihazda açılış süresi ölçümü — bulut senkronlu
  D: sürücüsü yüzünden `npm run dev` bu oturumda güvenilir çalışmayabiliyordu,
  kullanıcının kendi cihazında test etmesi önerilir.

**Faz 3 — ✅ TAMAMLANDI (6 Eki 2026): sekme arka plandan dönünce yenileme ("geç güncelleme" şikayeti):**
`src/components/dashboard/LiveNotifications.tsx`'e `visibilitychange`/`focus`
dinleyicisi eklenip sekme öne dönünce throttle'lı (~5-10sn) `router.refresh()`
tetiklenmesi — mobilde WebSocket kopması sonrası kaçırılan realtime olaylarını
telafi eder. Katmalı/additive, düşük risk.

**Faz 4 — ✅ TAMAMLANDI (dbcf204): QuickBookSheet + HelpAssistant code-splitting:**
`RandevularHeader.tsx`/`TakvimHeader.tsx`'teki `QuickBookSheet` (949 satır, her
zaman statik import + mount'ta gereksiz `/api/org` fetch'i) ve `layout.tsx`'teki
`HelpAssistant` (318 satır, mikrofon/Web Speech mantığı) `next/dynamic({ssr:false})`
ile code-split edilir — emsali `src/app/dashboard/stok/page.tsx:38-45`'teki
`BarcodeScanner`. Dikkat: QuickBookSheet'in trigger butonu bileşenin içinde
(`SheetTrigger`, satır ~547-552) — loading fallback'i aynı boyutta statik bir
buton iskeleti olmalı, yoksa CLS/sıçrama olur.

**Faz 5 — ✅ TAMAMLANDI (dbcf204): ayarlar/page.tsx çift `auth.getUser()` düzeltmesi:**
`src/lib/active-org-client.ts`'teki `getActiveMemberClient()`'a opsiyonel
`knownUserId` parametresi eklenip `ayarlar/page.tsx:244-247`'deki art arda 2
auth ağ isteği 1'e indirilir (tek çağıran nokta, geriye dönük uyumlu).

**Kapsam dışı bırakıldı (backlog'ta kalsın, ayrı değerlendirme gerekir):**
- `experimental.staleTimes` (`next.config.ts`) — app-wide blast radius (pazarlama +
  `/r/[slug]` herkese açık randevu linki + admin de etkilenir), `/r/[slug]`'de stale
  müsaitlik verisi yanlış-randevu riski taşır.
- `src/proxy.ts`'in kendi auth/membership sorguları — güvenlik kritik, ayrı
  execution context (Edge middleware), dokunmak yetkilendirme riski taşır.
- `dashboard/layout.tsx`'in 9 paralel sorgusu — zaten doğru paralelleştirilmiş,
  azaltmak (ör. overdue count'u DB-side RPC'ye taşımak) migration gerektirir.
- `randevular/page.tsx`'in upcoming→past sıralı sorgusu — gerçek veri bağımlılığı,
  ölçülmeden (p95 gecikme) dokunmak spekülatif.
- ColdStartSplash `warmStart`'ı sessionStorage'a taşımak + icon-mark.png (256x256,
  75KB) optimizasyonu — kozmetik, düşük öncelik.
- next/image'e geçiş (personel avatarı, org logosu) — küçük kazanım, düşük öncelik.

**İlgili:** [[panel-performance-architecture]] memory'si (21 Ağu bulgusu, hâlâ
geçerli mimari).

---

## 10. Müşteriler sayfası — tasarım taslağından alınmayanlar (30 Eyl 2026)

Kaynak: kullanıcının Stitch taslağı ("Müşteri Portföyü", `müşteri portföyü.html` +
`müş p.md` tasarım sistemi). `CustomerList.tsx` tema token'larıyla (primary/accent/
muted) yeniden renklendirildi; özet şeridi, hızlı filtre çipleri ve "Randevu Ver"
eklendi. Aşağıdakiler **veri/sorgu veya onay butonu gerektirdiği için bilerek
alınmadı** — panel tasarımı kademeli değişirken gözden geçirilecek:

- **Favori / atanan uzman** kartı: müşterinin en çok randevu aldığı personel
  (randevulardan türetilir; ek sorgu + org_id kapsamı gerekir).
- **Gelecek randevu** hücresi (tarih + hizmet): ek sorgu gerekir.
- **Kart içi "Onay Bekleyen Randevu" bandı + "Hemen Onayla / Randevuyu Onayla"**:
  onay butonu → mevcut onay API'sine bağlanmalı (CLAUDE.md: buton işlevi değişmemeli).
  Bekleyen İşler sayfasındaki akışla çakışmadan yapılmalı.
- **Üst "Onay Bekleyenler" çipi** ve üstteki pembe/turuncu uyarı şeritleri
  (yeni randevu onayı + kritik stok) — panelde zaten başka yerde var, tekrar mı?
- **VIP Platinum / Sadık Müşteri / Premium Üye** segment rozetleri: segment tanımı
  (harcama/ziyaret eşiği) ve "VIP Müşteriler" çipi için kural belirlenmeli.
- **Ziyaret sıklığı etiketi** ("21 günde bir", "Düzenli") ve "Aylık ort. harcama".
- **Ödeme yöntemi** alt yazısı (Kart / Nakit / QR) — müşteri bazında tutulmuyor.
- **Memnuniyet puanı** (5.0 / 4.8) — veri kaynağı yok (yorum/puan tablosu yok).
- **Kart içi açılır not çekmecesi** (more_vert → müşteri notu, işlem geçmişi özeti).
- **Kampanya/SMS rozeti** ("SMS • Kampanya Açık") telefonun yanında metinle.
- **Kaynak kanal** satırı ("Instagram DM kanalından geldi") — `customers.source` var,
  gösterimi eklenebilir (kolay).
- **QR/Barkod tara** butonu arama kutusunda.
- **Hızlı "Müşteri Ekle" modalı** (tam sayfa yerine) — mevcut `/musteriler/yeni` formu var.
- **Üstte başlık altı özet**: "118 kampanya onaylı" metni.
- Tasarım sistemi notu: sabit marka renkleri (#C026D3/#7C3AED) yerine panel temaları
  (6 tema) token'ları kullanıldı; taslaktaki Plus Jakarta Sans fontu alınmadı.

---

## 11. Deneme bitimine 2 gün kala "tanıtım + sunum" SMS'i (4 Eki 2026) — KARAR BEKLİYOR

**Durum:** Netgsm hattı alındı. Altyapı kodda zaten var, yeni cron gerekmiyor:
- `src/lib/sms.ts` → `sendPlatformSms()` (Netgsm destekli; env: `PLATFORM_SMS_PROVIDER=netgsm`,
  `PLATFORM_SMS_USERNAME`, `PLATFORM_SMS_PASSWORD`, `PLATFORM_SMS_SENDER_ID` — Vercel'e girilmeli,
  girilmezse SMS sessizce atlanır).
- `src/app/api/cron/trial-reminder/route.ts` (`vercel.json`: her gün 10:00 UTC) — bitime 2 gün kala
  ve bittiği gün e-posta + SMS atıyor; şu an SMS metni çok kısa, sunum/özellik bilgisi yok.

**Yapılacak (kullanıcı onaylayınca):** 2 gün kala SMS metnini zenginleştirmek (bitiş günü SMS'i kısa kalır).

**Karar bekleyen:** SMS'teki sunum linki. Mevcut sunumlar herkese açık adreste değil:
1. `/api/docs/presentation` → girişli kullanıcıya özel (SMS'ten açılmaz).
2. `docs/musteri-sunumu/musteri-sunumu.html` + `SiriPlan-Musteri-Sunumu.pdf` → public yayınlanmamış.
Seçenekler: (a) musteri-sunumu.html'i herkese açık `/sunum` sayfası yapmak (önerilen),
(b) mevcut `siriplan.com/ozellikler` sayfasına yönlendirmek, (c) PDF'i `public/` altına koymak.

**Taslak SMS (≈ 2 SMS / ~300 karakter, Türkçe karakter kullanmadan tek SMS'e yakın):**
```
SiriPlan: "{salon}" icin ucretsiz denemeniz 2 gun sonra bitiyor.
Ozellikler ve sunum: siriplan.com/sunum
Abonelik: siriplan.com/auth/plan-sec (bilgileriniz silinmez)
Destek: WhatsApp 0535 503 26 34
```
**Açık riskler / dikkat:**
- `toLocalPhone` yalnızca TR numaralarını (+90) doğru işler; yabancı numaralı kayıtlara
  Netgsm'den gönderim yapılmamalı (numara filtresi eklenecek).
- Türkçe karakter içeren SMS Netgsm'de 70 karakterlik parçalara bölünür (ücret artar) → ASCII yazım.
- Ticari ileti sayılma riski: bu bir işlem/hizmet bilgilendirmesi (deneme bitimi) olarak yazılmalı;
  pazarlama ağırlıklı metin İYS izni gerektirebilir (bkz. `docs/legal/IYS-UYUM-PLANI.md`).
- Netgsm başlık (SENDER_ID) onayı: `SIRIPLAN` başlığı Netgsm panelinde onaylı olmalı.
- Locale: kayıtlı `organizations.locale` EN/RU/AR ise TR SMS gitmemeli (ya da o dillerde metin).

---

## 12. App Store: İngilizce yerelleştirme + AB trader (DSA) bilgisi (5 Eki 2026) — YAPILACAK

**Bağlam:** iOS uygulaması (SiriusPlan, Apple ID 6815322807, bundle `com.siriplan.app`) 3 Eki'de onaylandı ve
yayında; doğrudan linkle (`https://apps.apple.com/app/id6815322807`) açılıyor/indiriliyor. Aramada çıkmaması
indeks gecikmesi (1-3 gün). Ana dil Turkish; mağaza sayfasında İngilizce yerelleştirme YOK.

**12.1 İngilizce (en-US/en-GB) yerelleştirme ekle** — App Store Connect → Distribution → sürüm sayfası →
dil seçici (Turkish ▾) → English ekle:
- Ad / alt başlık / açıklama / anahtar kelimeler / promosyon metni / "What's New" / destek ve pazarlama URL'leri.
- Ekran görüntülerini İngilizce yerelleştirmede de yüklemek (şu an promo mockup'lar Türkçe).
- Ad, alt başlık ve anahtar kelime değişiklikleri YENİ SÜRÜM gerektirir (App Information'daki bilgi kutusu).
- Gerekirse RU/AR için de aynı mantık (uygulama zaten TR/EN/RU/AR destekliyor).

**12.2 AB trader (Digital Services Act) bilgisi** — App Store Connect → Business (veya Apps üstündeki uyarı)
→ trader status:
- Trader olarak beyan edilecek: adres, telefon, e-posta AB ürün sayfasında HERKESE AÇIK görünür
  (UK Ltd 17142392 künyesiyle tutarlı olmalı; kişisel adres yerine şirket/iş adresi tercih edilmeli).
- Beyan verilmezse uygulama yalnızca AB ülkelerinde dağıtılmaz; TR/diğer ülkeler etkilenmez.
- Hazır olunana kadar AB ülkeleri Pricing and Availability'den çıkarılabilir; hazır olunca trader girilip AB eklenir.
- Patent başvurusu / site AB uyumu Apple'ın şartı DEĞİL (yalnızca trader beyanı); site hukuki gözden geçirme
  kalemleri §6'da.

## 11. Açık notlar (4 Eki 2026)

- **Paketle kapanan randevu geri alınıp normal ödemeyle tamamlanırsa fiyat 0 kalıyor** (tasarım gerekir:
  geri açınca fiyat hizmet fiyatına dönsün mü, yoksa tamamlarken sorulsun mu?).
  _8 Eki 2026 kod kontrolü:_ `appointments/[id]/complete/route.ts` yalnızca paket kullanılınca `price: 0` yazıyor;
  normal ödemeyle tamamlarken ya da geri açarken fiyatı hizmet fiyatına döndüren kod bulunamadı → HÂLÂ AÇIK
  görünüyor (canlıda denenip teyit edilirse kapatılabilir).

Tamamlananlar (4 Eki 2026): RU/AR WhatsApp şablonları satır aralıklı `_2` sürümüne geçti ve Arapça
parametre yön izolasyonu eklendi; `/api/import` hizmet içe aktarma düzeltildi; boşluklu/+90'lı telefonla giriş çalışıyor.

## 13. App Store yayın sonrası takip (4 Eki 2026)
- [ ] Mağaza sayfası: `https://apps.apple.com/tr/app/id6815322807` açılıyor mu, aramada "SiriusPlan" çıkıyor mu (yayılma 24 saate kadar sürebilir). Çıkmazsa App Store Connect sürüm durumu + bağlantı ile bak.
- [ ] Agreements: Business → Agreements → "Free Apps" = Active mi (ücretsiz uygulama için banka/vergi gerekmez).
- [ ] AB ülkeleri (27) için DSA trader beyanı — bkz. §12 (App Store + Google Play).
- [ ] Uygulamanın mağaza dili "English" görünüyor (PWABuilder varsayılanı); zorunlu değil, istenirse Info.plist dil ayarı sonra düzeltilir.
- [ ] ASC uygulama listesindeki küçük ikon eski görünüyor (önbellek); mağaza sayfasında yeni ikon doğrulandı.
- [ ] Kalan küçük işler: bkz. §11.

### §12 ek notu — App Store Connect ekranı (4 Eki 2026)
- Business sayfasında kırmızı uyarı duruyor: AB'de görünmek için DSA trader beyanı gerekli ("Complete Compliance Requirements"). Yapılana kadar 27 AB ülkesinde uygulama görünmez; diğer ülkeler etkilenmez.
- Free Apps Agreement = Active (22 Eyl 2026 – 22 Eyl 2027), yenileme tarihini takip et.
- Paid Apps Agreement = New: imzalama (uygulama içi satın alma yok, abonelik web'den). "Edit Legal Entity" uyarısı da buna bağlı.
- Beyanda şirket e-postası/telefonu kullan (kişisel numara değil); bilgiler AB'de herkese açık gösterilir.
- Google Play Console'da aynı DSA trader beyanı ve AB görünürlüğü ayrıca kontrol edilecek.

- **CI güvenlik kapısı (npm audit) — PR #92 bekliyor** (4 Eki 2026): `braces` (≤3.0.3, GHSA-vfj7-8cjw-p6xm)
  için düzeltilmiş sürüm henüz yok; zincir yalnızca geliştirme/lint aracında (eslint-config-next → fast-glob →
  micromatch → braces), canlıya giren paketlerde 0 uyarı. Bu yüzden `security.yml` main'de ikiye bölündü
  (production `--omit=dev` sıkı/engelleyici, dev araçları yalnızca uyarı). **Yama çıkınca:** Dependabot'un
  `braces` PR'ını merge et, sonra PR #92'yi (eski tek sıkı kapı) merge et.

### §11 güncelleme (6 Eki 2026) — altyapı HAZIR, SMS bilgileri + test kaldı
**Kodda yapıldı** (`src/app/api/cron/trial-reminder/route.ts`, commit'siz, dal `perf/faz3-rozet-tazeleme`):
- 2 gün kala SMS metni zenginleştirildi (`buildTwoDaySms`: deneme bitiyor + özellik/sunum linki +
  abonelik linki `/auth/plan-sec` + "verileriniz silinmez" + WhatsApp destek no). ASCII (Türkçe karaktersiz).
- Yalnızca TR cep numaralarına (`isTurkishMobile`) ve `organizations.locale = tr` olan salonlara gider.
- Bitiş günü SMS'i kısa kaldı (değişmedi). E-posta akışı değişmedi.
- Sunum linki geçici olarak `/ozellikler` (`SUNUM_PATH` sabiti) — karar verilince tek satır değişecek.

**Yarın (kullanıcı):** Vercel env'e `PLATFORM_SMS_PROVIDER=netgsm`, `PLATFORM_SMS_USERNAME`,
`PLATFORM_SMS_PASSWORD`, `PLATFORM_SMS_SENDER_ID` (Netgsm'de onaylı başlık) gir + redeploy.
**Sonra TEST EDİLECEK:**
1. Test salonu: `trial_ends_at = now()+2 gün`, `trial_reminder_2d_sent_at = null`, `plan='trial'`,
   `locale='tr'`, telefon = kendi TR cep numaran.
2. Cron'u elle çağır: `GET /api/cron/trial-reminder` (Authorization: Bearer CRON_SECRET).
3. Kontrol: SMS geldi mi, kaç parça (Netgsm raporu), gönderici adı, link tıklanıyor mu;
   `trial_reminder_2d_sent_at` doluyor mu; yabancı numara/EN salon için SMS gitmedi mi.
4. Netgsm hatasında sessiz yutuluyor (catch {}) — gerekirse yanıt kodu loglanmalı.
5. Bilinen: SMS atlansa bile `trial_reminder_2d_sent_at` damgası atılıyor (hat bağlanmadan çalışırsa
   o gün SMS kaçar) — env girilmeden cron'un o gün çalışmaması için hattı bağlayana kadar dikkat.

### §11 güncelleme (7 Eki 2026) — sunum sayfası + ödeme linki eklendi
- Herkese açık sunum: `public/sunum.html` (+ `public/sunum/*.png`) → `siriplan.com/sunum.html`.
  `docs/musteri-sunumu/musteri-sunumu.html`'den türetildi: eski ekran görüntüsü adları güncel dosyalara
  eşlendi, mobil ölçekleme + noindex eklendi, fiyat slaytı güncel 4 plana (Mini ₺399 / Starter ₺1.199 /
  Pro ₺1.699 / Business ₺4.699) çevrildi, son slayt "Plan seç & abone ol" butonu (`/auth/plan-sec`).
  Dosya uzantılı yollar `proxy.ts` matcher'ı dışında → proxy'ye dokunulmadı. Fiyatlar değişirse HTML elle güncellenmeli.
- SMS metni (2 gün kala, ~242 karakter, 2 parça): ödeme/abonelik linki açıkça belirtildi, `https://` kısaltıldı;
  bitiş günü SMS'i de "Odeme/abonelik baslatmak icin" ifadesine çevrildi.
- Not: fiyat güncellemesi (Mini planı) başka dalda (`feat/mini-plan-fiyatlar`); sunumdaki fiyatlar o dal main'e
  girince tutarlı olur.

---

## 12. Communication Service (SMS + WhatsApp merkezi altyapı) — PLAN HAZIR, karar bekliyor (8 Eki 2026)
Tam plan: [docs/iletisim-altyapisi-plani.md](iletisim-altyapisi-plani.md) (mimari, veri modeli, politika kuralları,
faz faz yol haritası, sağlayıcı soru listesi, §11 karar soruları). Kod henüz yazılmadı.
Not: §11'deki trial SMS'inde URL var — yurtdışı sağlayıcıdan gidecekse URL'siz hâle getirilmeli (planın §4.8'i).

---

## 13. Notlar / durum özeti (8 Eki 2026)

- **WA hatırlatma süreleri (2 saat + 1 gün):** kod + migration'lar `20261008_wa_reminder_2h_1d_default.sql` ve
  `20261009_wa_reminder_skip_short_notice.sql` canlıda ÇALIŞTIRILDI (kullanıcı teyidi). Ayarlar'da hatırlatma
  kutuları artık çoklu seçim; 1 gün önce hatırlatması, randevu hatırlatma anına 12 saatten az kala alındıysa gitmez
  (WA ve e-posta cron'u aynı kural). Mevcut tüm salonlar {2,24}'e alındı.
- **Kampanya MARKETING WhatsApp şablonları:** Meta'da onaylı ve koda eklenmiş/aktif durumda; ANCAK şu an salonun
  değil başka bir WABA/numaraya bağlı. İleride doğru numaraya (kendi WABA'sına) bağlanmalı — şimdilik bilerek
  bu şekilde bırakıldı.
- **Açık PR'lar bekliyor (bilerek):** #92 (npm audit sıkı kapı — `braces` yaması çıkınca) ve #71 (eslint 10 Dependabot).
- **Kontrol edilip kapatılanlar:** blog/haftalik-2-personel-prim (PR #81 main'de), takvim ay görünümü + customer_id
  stash'i (main'de zaten var; stash eski/gereksiz), Panel performans §9 (Faz 1-5 tamam), kayıt sayfası telefon/seçici
  genişliği (PR #116 main'de).

## 14. Notlar (9 Eki 2026)

- **TAMAMLANDI — fiyat güncellemesi (PR #120 main'de):** Business ₺4.699/ay, ₺46.238/yıl (Stripe'ta güncellendi);
  kart altındaki tasarruf parantezi kaldırıldı; "1 yıl sabit fiyat garantisi" satırı eklendi. Tüm site/doküman
  metinlerindeki eski Business fiyatı (₺4.752 / ₺46.760) temizlendi.
- **TAMAMLANDI — SMS kontörü:** `20261010_sms_credits.sql` migration'ı canlıda ÇALIŞTIRILDI (kullanıcı teyidi).
- **TAMAMLANDI — SMS paketi müşteri kaydı (güvenlik incelemesi, 9 Eki):** `api/stripe/sms-pack/route.ts` içinde
  `stripe_customer_id` yazımı artık admin client ile yapılıyor (yetki kontrolü owner/manager önceden var). Satın alma
  mobilde zaten kapalı (buton `!mobileApp` + API `isMobileApp()` 403).
- **TAMAMLANDI — Stripe plan geçişi testi (9 Eki 2026):** test modunda 31 geçiş (Mini/Starter/Pro/Business, aylık
  TRY+USD, yıllık, zincir) 31/31 başarılı; önizleme tutarı = tahsil edilen tutar. `STRIPE_PRICE_*` değerleri
  doğrulandı (kullanıcı teyidi). Yerel `tsc`'deki 4 Stripe tip hatası (billing_cycle_anchor, payment_method_types)
  yalnızca SDK v23 tip uyuşmazlığı — API düz `"now"` biçimini kabul ediyor, `{type:"now"}` biçimini REDDEDİYOR;
  bu yüzden kod bilerek değiştirilmedi (`ignoreBuildErrors: true`). Stripe `apiVersion` yükseltilirse yeniden test et.
- **YAPILACAK — Stripe webhook + DB uçtan uca testi:** plan geçişinde webhook (`customer.subscription.updated`),
  `applyPlanToOrg` ile organizations.plan yazımı ve panelde/abonelik sayfasında plan gösterimi canlıda uçtan uca
  denenmedi. Yöntem: Stripe CLI ile yerel webhook'u TEST moduna bağla (`stripe listen`), test org'unda yükselt/düşür,
  DB + ekranı kontrol et. (Canlı anahtarla deneme YAPMA — bkz. §7.)


## 15. Mesafeli satış paketi (10 Eki 2026) — kodda HAZIR, hukuki/idari teyit BEKLİYOR

**Eklenenler:** `/mesafeli-satis-sozlesmesi`, `/on-bilgilendirme-formu`, `/iade-iptal-politikasi` (TR esas, EN çeviri; RU/AR İngilizce + "Türkçe esastır" notu; metinler `src/lib/legal/distance-sales.ts`, satıcı bilgileri `src/lib/legal/seller.ts`). Footer + sitemap + llms.txt bağlantıları. Ödeme öncesi İKİ zorunlu onay kutusu (`PurchaseConsent`): (1) sözleşme+ön bilgilendirme+iade politikası, (2) hizmetin hemen başlaması / cayma hakkı kaybı. Uygulandığı yerler: `/auth/plan-sec`, `/auth/kayit` (satın alma niyetli), SMS paketi, ek paketler. Sunucu da zorunlu tutar (`CONSENT_REQUIRED` 400) ve onayı Stripe metadata (`consent_version`, `consent_at`) + `audit_logs` (`consent.distance_sales`: sürüm, zaman, IP, tarayıcı, plan, session id) olarak kaydeder. Migration gerekmez. Kullanım Koşulları madde 4'e yeni belgelere atıf eklendi. `CONSENT_VERSION` metin değişince artırılmalı.

**Yurt dışı satıcı + KDV (madde 5) — kullanıcı teyidi 10 Eki:** fiyatlar KDV DAHİL (Stripe price'ta tax behavior = inclusive), Türkiye'de vergi temsilcisi YOK; metin buna göre ("vergi dahil, ek vergi tahsil edilmez; Stripe makbuzu Türkiye e-faturasının yerine geçmez; alıcının kendi ülkesindeki ek yükümlülükleri alıcıya ait"). Kayıtlı adres bysirius.com/iletisim'den alındı (71-75 Shelton Street, Covent Garden, London WC2H 9JQ); İstanbul (Kağıthane) irtibat ofisi yalnızca ilçe olarak belirtildi. Stripe Dashboard support e-postası info@ yapıldı (kullanıcı).

**Açık:**
- Stripe Tax: price'larda "inclusive" seçili ama Türkiye'de vergi kaydı/temsilci olmadığı için fiilen KDV'nin kime ödendiği muhasebeci tarafından netleştirilmeli (metin bunu iddia etmiyor, yalnızca "vergi dahil" diyor).
- Mevcut aktif abone yok (kullanıcı teyidi: yalnızca kendi test/demo hesapları) — geriye dönük onay gerekmez. Plan yükseltmede (`change-plan`) yeni onay kutusu YOK (ilk satın almada alınan onay geçerli kabul edildi).
- Tüketici hakem heyeti/mahkeme parasal sınırları metne yazılmadı (her yıl değişir); cayma bildirimi muhatabı info@.
- Avukat incelemesi ileride yapılacak: cayma istisnası (anında ifa) ifadesi, sorumluluk sınırı, tüketici/ticari ayrımı, UK Ltd ile Türk tüketicisine satış yapısı.

## 16. Ek paketler (AI Asistan, Ek Şube) ve AI model katmanı (10 Eki 2026)

**Canlıda (PR #144, #145, #148, #150):** yalnızca **aylık** satılıyor — AI Asistan 2.500 TL / 49 USD / 45 EUR, Ek Şube 1.000 TL / 24 USD / 20 EUR (env: `STRIPE_PRICE_AIASSISTANT`, `STRIPE_PRICE_BRANCH`). Plan aboneliğinden ayrı Stripe aboneliği; durum `org_addons`, şubeler `org_branches`. Canlı webhook `customer.subscription.created` dahil 5 olayı dinliyor (10 Eki'de doğrulandı).

**Karar — satın alma yüzeyi:** Fiyatlar sayfasında yalnızca "Bilgi Al" formu (satın al butonu YOK). Satın alma yalnızca web panelinde `/dashboard/abonelik` → "Ek Paketler" alanında; yalnızca ödenen Starter/Pro/Business aboneleri alabilir (abone olmayan satın alamaz). Native uygulamada (App Store/Play) hiçbir satın alma yüzeyi/fiyat/şube açma formu yok. Şube hesabında plan işlemleri yerine "Ana işletmeye geç ve planı yönet" düğmesi (web).

**Bilinçli olarak yapılmayanlar (AKSİYON ALINMAYACAK — kullanıcı kararı):**
- Yıllık fiyat: AI Asistan ve Ek Şube için Stripe'ta yıllık Price yok (aksiyon alınmayacak). `STRIPE_PRICE_AI_ANNUAL` / `STRIPE_PRICE_BRANCH_ANNUAL` boş kaldıkça yıllık buton görünmez; ileride istenirse Stripe'ta yıllık Price + env yeterli (etiket aylık×12 gösterir; indirim istenirse `AddonsPanel.tsx` + `pricing.ts`).
- AI için aylık yanıt sınırı (~1.000) YOK (aksiyon alınmayacak; gerekirse admin panelinden elle yönetilir). Ölçüm: ~320 giriş + ~70 çıkış token/yanıt; 10.000 mesaj/ay ≈ $2,8 (Gemini 3.5 Flash-Lite).
- Admin panelinden elle plan değişimi `feature_ai`'yi doğrudan yazar ve AI paketini ezebilir (aksiyon alınmayacak; elle düzeltilir).

**Açık (ileride):**
- Sohbet botu fiyat özeti (`pricingSummaryForAssistant`) ek paketleri içermiyor.
- Gerçek satın alma uçtan uca (Checkout → webhook → paket etkinleşmesi) denenmedi; anahtar canlı mod, önce Stripe test modu (bkz. §7).
- **AI model katmanı (PR #149):** `gemini-2.0-flash` Google'da kapandığı için AI yanıt / site sohbet botu / sesli randevu düşmüştü; artık `src/lib/llm.ts`: `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → (anahtar varsa) Claude `claude-haiku-5-5`. Model adları env ile değişir (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `CLAUDE_FALLBACK_MODEL`). **Claude yedeği için `ANTHROPIC_API_KEY` hem `.env.local` hem Vercel'e girilecek** (Gemini için ek anahtar yok). Girmeden ÖNCE gizlilik metni + App Store/Play veri beyanlarına Anthropic (alt işleyici) eklenmeli; girince bir kez canlı test et (Claude yolu yalnızca sahte fetch ile doğrulandı).

**Canlı kontrol listesi (10 Eki 2026 — deploy sonrası, kullanıcı yapacak):**
- [ ] **AI cevabı:** Business ya da AI Asistan paketli (feature_ai açık) bir işletmenin WhatsApp veya Instagram hattına test mesajı at. Beklenen: gerçek AI yanıtı gelir (sabit "Ekibimiz size dönecek" mesajı DEĞİL). Gelmezse Vercel loglarında `[llm] Gemini ... HTTP` satırlarına bak; `GEMINI_MODEL` env ile model değiştirilebilir (PR #149, `src/lib/llm.ts`).
- [ ] **Şube hesabı:** Ek Şube hakkı olan bir hesapta şubeyi aç, şubedeyken `/dashboard/abonelik` sayfasını web'de aç. Beklenen: plan/ödeme düğmeleri yok, "Ana işletmeye geç ve planı yönet" düğmesi var ve tıklayınca ana işletmeye geçip abonelik sayfası açılır (PR #150). Native uygulamada bu düğme/satın alma yüzeyi görünmemeli.
- [ ] **Deneme hesabında Pro önizlemesi:** Stripe 14 günlük denemedeki (trialing) bir Starter/Mini hesabında Pro'ya yükseltme önizlemesini aç. Beklenen: tutar hatasız gelir ("Tutar hesaplanamadı" çıkmaz); yükseltince plan değişir, ücret deneme sonunda alınır (PR #148). Denemede olmayan (ödeyen) hesapta önizleme eskisi gibi çalışmalı.


## 17. Yapay zeka sağlayıcıları, Business denemesi ve açık testler (10 Eki 2026)

**Yapıldı:** Gizlilik Politikası §5 ve KVKK aktarım metni (TR/EN/RU/AR) artık yapay zeka sağlayıcılarını (Google Gemini; yedek: Anthropic Claude) ve hangi verinin gittiğini söylüyor (PR #164). Entegrasyon kartı adı "OpenAI / Claude AI" → "Gemini / Claude AI". `ANTHROPIC_API_KEY` oluşturuldu (SiriPlan, Default workspace, **30.09.2027'de biter** — takvime yaz) ve `.env.local` + Vercel'e girildi. Business'ta 14 günlük Stripe denemesi YOK (karar: AI asistan kurulup Instagram/WhatsApp'a bağlanıyor); `api/stripe/checkout` artık Business için `trial_period_days` vermiyor, site metinleri zaten yalnızca Mini/Starter/Pro diyor.

**TEST EDİLECEK:**
- [x] **Claude yedeği gerçek anahtarla — TAMAM (10 Eki 2026, yerel test):** normal çağrıda Gemini 200 yanıtladı; Gemini model adları bozulunca (404, 404) çağrı `api.anthropic.com` 200 ile Claude'dan geldi. Canlı ayarlara/env'e dokunulmadı. (Eski not:) Anthropic Console'da kredi **$0** — önce $5–10 yükle. Sonra `GEMINI_MODEL` ve `GEMINI_FALLBACK_MODEL` env'ini geçici olarak var olmayan bir adla ayarlayıp (ya da yerelde) bir AI yanıtı/site sohbet botu denemesi yap; yanıtın Claude'dan geldiğini doğrula, sonra env'i geri al. Şu ana kadar yalnızca sahte fetch ile doğrulandı.
- [ ] **Gemini ücretli faturalama:** anahtar ücretsiz katmanda değil, faturalama hesabına bağlı olmalı (girdilerin model geliştirmede kullanılmaması için).
- [ ] **Stripe webhook + ek paket uçtan uca (test modu):** `stripe listen`, `STRIPE_WEBHOOK_SECRET`; plan yükselt/düşür + AI Asistan/Ek Şube satın alma; DB (`organizations.plan`, `org_addons`, `org_branches`) + abonelik ekranı kontrol. Business checkout'ta artık deneme olmadığını da bu testte doğrula (Stripe oturumunda "trial" görünmemeli).

**MAĞAZALAR İÇİN KONTROL EDİLECEK (ayrı sohbet, yeni build GEREKMEZ):**
- [ ] App Store Connect → App Privacy: sohbet/mesaj içeriği ve ses üçüncü taraf AI sağlayıcılara gidiyor; "User Content" (Other User Content) verisi toplanıyor ve üçüncü tarafla paylaşılıyor olarak işaretli mi? Gemini için zaten doğruysa Claude yedeği ek değişiklik gerektirmez.
- [ ] Google Play → Data safety: "Messages" ve "Audio" verilerinin üçüncü taraflarla paylaşıldığı beyan edilmiş mi? Aynı mantık.
- [ ] Mağaza gizlilik URL'si siriplan.com/gizlilik (güncellendi) — başka yerde kopya gizlilik metni varsa (store listing, e-posta imzası) orayı da güncelle.
