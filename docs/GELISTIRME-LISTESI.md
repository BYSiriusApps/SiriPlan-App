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

**Durum: TAMAMLANDI VE CANLIDA AKTİF (22 Eyl 2026).** `feat/randevu-yeni-saat-oneri`
main'e merge edildi (PR #38), migration canlıda çalıştırıldı, Meta şablonu onaylı.
Aynı gün bir isim uyuşmazlığı bugı bulunup düzeltildi (PR #44, commit `9ebca3b`):
`registry.ts`'teki `metaName` `randevu_yeni_saat_onerisi_1` idi, Meta'daki gerçek
API adı sonunda fazladan alt çizgi taşıyordu (`..._1_`) — tek karakterlik fark
yüzünden WA müşteriye hiç gitmiyordu (panel kırılmıyordu). Düzeltme merge edildi
(`fix/yeni-saat-oneri-mobile-i18n`, PR #40), uçtan uca doğrulandı: panelden tıkla →
müşteriye gerçek WA gider → `/oneri/[token]` linkinden Kabul Et/Reddet → panel
güncellenir + Telegram/WA bildirimi gider.

**Kalan:** Yok.

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

**Durum (24 Eyl 2026):** 3 şablon da Graph API üzerinden WABA'ya (`1295808672630869`)
submit edildi, üçü de Meta incelemesinde **PENDING**:
- `personel_yeni_randevu` → template id `1441158747883677`
- `personel_yeni_talep` → template id `3149481118576768`
- `personel_kritik_stok` → template id `1857261352301818`

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
- `staff_low_stock_alert` (id `1134593909213895`) — `personel_kritik_stok` EN

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

## 8. ⏳ Barkod: uygulama içi kamera için yeni AAB

**Durum:** Barkodla ürün satışı (11 Eyl 2026) web'de canlı. Kamerayla tarama
**mobil tarayıcıda** çalışır; kurulu Play Store uygulaması (TWA) içinde `getUserMedia`
`android.permission.CAMERA` bildirilmediği için reddedilir → tarayıcı otomatik
**elle barkod girişi** moduna düşer (satış yine çalışır).

**Yapılacak (kamera uygulamada da çalışsın):**
- PWABuilder / Bubblewrap projesinde CAMERA iznini aç (`"features": { "cameraPermission": true }`
  veya `bubblewrap update --manifest` sonrası `AndroidManifest`'e `<uses-permission android:name="android.permission.CAMERA"/>`).
- Yeni **AAB üret** → Play Console → yeni sürüm.
- Play Console → **Data safety** formu: kamera kullanımı = "yalnızca cihazda, barkod
  tarama; toplanmaz/paylaşılmaz" gerekçesi.
- Test cihazında uygulamayı yeniden kur, `/dashboard/stok` → "Barkodla Sat" →
  kamera izni sorulmalı ve tarama çalışmalı.

**Not:** Bu AAB değişikliği yapılana kadar mağaza sürümü sağlam — özellik elle
girişle tam kullanılabilir. `assetlinks.json` / imza etkilenmez.
**İlgili:** `docs/play-store/aab-camera-todo.md`, `next.config.ts`
(`PERMISSIONS_POLICY_DASHBOARD` = `camera=(self)`), `src/components/dashboard/BarcodeScanner.tsx`.
