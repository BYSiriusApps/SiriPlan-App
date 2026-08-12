# Changelog

## 2026-08-11 — Native uygulama kabuğu cilası

Mobil panelin "web sitesi" değil "gerçek uygulama" gibi hissettirmesi için
düşük riskli, bağımlılıksız görsel/his cilası (App Store/Play Store
başvurusu öncesi). Fotoğraflı/marka renkli "vitrin" randevu sayfası (Pro
özelliği) ayrı bir işe ertelendi — kapsamı ve gerekçesi için bkz.
`C:\Users\OZGUN\.claude\plans\typed-wishing-peach.md`.

### Eklendi
- **Safe-area desteği**: `viewport.viewportFit: "cover"` (`src/app/layout.tsx`),
  `.safe-bottom` utility'si artık gerçekten tanımlı (`src/app/globals.css`,
  `MobileNav.tsx`'in zaten kullandığı ama no-op olan class), alt "+ Randevu"
  FAB'ı da `env(safe-area-inset-bottom)` hesaba katıyor
  (`src/app/dashboard/page.tsx`) — iPhone home indicator'ın altında kalmıyor.
- **Sayfa geçiş animasyonu**: `src/components/dashboard/RouteTransition.tsx`
  (yeni, kütüphanesiz — `usePathname()` key'iyle remount tetikleyip
  `.animate-route-fade` CSS keyframe'ini oynatır), `dashboard/layout.tsx`'te
  `{children}` bunun içine alındı.
- **InstallPwaCard native uygulamada gizlendi**: `SiriPlanApp` UA işaretçisi
  görülürse "Ana Ekrana Ekle" PWA kartı hiç render edilmiyor (zaten mağaza
  üzerinden kurulu bir uygulamada anlamsız/kafa karıştırıcı olurdu).

### Değiştirildi
- `public/manifest.json`: `theme_color`/`background_color` `#0a1c4a` (lacivert)
  → `#e11d48` (gül kurusu) — `layout.tsx` viewport themeColor'ı, `mask-icon` ve
  `msapplication-TileColor` ile artık tutarlı, tek marka rengi.

### Ertelendi (ayrı iş, plan dosyasında belgeli)
- Maskable Android ikonu — yeni, iç %80 güvenli alana sıkıştırılmış bir görsel
  asseti gerektiriyor, mağaza incelemesini engellemiyor.
- Pro/Business vitrin randevu sayfası (hizmet fotoğrafı + marka rengi temalı
  `/r/[slug]`) — migration + storage bucket + RLS + panel + public sayfa
  değişikliği gerektiren gerçek bir özellik, teslim baskısı altında yapılmadı.

## 2026-08-10 — Mobil uygulama (App Store / Google Play) mağaza uyumluluğu

Native mobil uygulama (WebView tabanlı iOS/Android sarmalayıcı) mağaza incelemesinden
%0 mağaza komisyonuyla geçebilmesi için panelden tüm fiyat/satın alma arayüzü
kaldırıldı; mevcut veritabanı, backend ve web davranışı değiştirilmedi.

### Eklendi
- **Mobil uygulama tespiti** (`src/lib/mobile-app-shared.ts`, `src/lib/mobile-app.ts`):
  native kabuğun User-Agent'ına eklemesi gereken `SiriPlanApp` işaretçisine göre
  her istekte (ilk yükleme dahil) sunucu ve istemci tarafında tutarlı tespit.
  **Native uygulama tarafında yapılması gereken:** WebView'ın User-Agent'ına
  `SiriPlanApp` string'ini eklemek (iOS WKWebView: `applicationNameForUserAgent`,
  Android WebView: `setUserAgentString`).
- **Deneme sonu bilgilendirme ekranı** (`src/components/dashboard/MobileTrialEndedScreen.tsx`):
  deneme süresi dolan/ödemesi başarısız olan işletmeler mobil uygulamada panel
  yerine fiyat veya ödeme linki içermeyen tam ekran bir bilgilendirme görür;
  yalnızca telefon (`tel:`) ve e-posta (`mailto:`) ile destek iletişimi sunulur.
  Web'deki mevcut "banner + salt-okunur panel" davranışı değişmedi.
- **Platform SMS gönderici** (`src/lib/sms.ts` → `sendPlatformSms`): org'ların
  kendi müşteri SMS ayarlarından bağımsız, `PLATFORM_SMS_PROVIDER` /
  `PLATFORM_SMS_USERNAME` / `PLATFORM_SMS_PASSWORD` / `PLATFORM_SMS_SENDER_ID`
  env değişkenleriyle platform bildirimleri gönderir.
- **Deneme süresi hatırlatma e-postası** (`src/lib/email/send.ts` → `sendTrialEndingEmail`).
- **Trial hatırlatma cron'u** (`src/app/api/cron/trial-reminder/route.ts`, `vercel.json`
  içine `0 10 * * *` girişi): deneme süresi bitimine 2 gün kala ve bittiği gün,
  işletme sahibine otomatik e-posta + SMS gönderir. Mesajlar `siriplan.com/auth/plan-sec`
  adresine yönlendirir — yükseltme akışı uygulama içinde değil web üzerinde.
- **Migration** `supabase/migrations/20260810_trial_reminder_tracking.sql`:
  `organizations.trial_reminder_2d_sent_at` / `trial_reminder_0d_sent_at` — cron'un
  aynı işletmeye tekrar gönderim yapmasını engeller. **Supabase'e henüz uygulanmadı**,
  diğer bekleyen migration'larla birlikte SQL Editor'de elle çalıştırılmalı.

### Değiştirildi
- `src/app/dashboard/layout.tsx`: mobil uygulama içinde deneme/ödeme kilidi varsa
  panel yerine `MobileTrialEndedScreen` gösterilir.
- `src/app/dashboard/abonelik/page.tsx`: mobil uygulamada "Pro'ya Yükselt" ve
  "Stripe Müşteri Portalı" butonları kaldırılıp yerine destek e-postası CTA'sı kondu.
- `src/app/auth/plan-sec/page.tsx`: mobil uygulamada fiyat kartları ve "Satın Al"
  butonları hiç render edilmiyor; deneme aktifse yalnızca "Panele Git" (ücretsiz
  devam), deneme dolmuşsa yalnızca destek iletişimi gösteriliyor.

### Gerekli ortam değişkenleri (yeni)
- `PLATFORM_SMS_PROVIDER` (`netgsm` | `vatansms` | `iletimerkezi`)
- `PLATFORM_SMS_USERNAME`, `PLATFORM_SMS_PASSWORD`, `PLATFORM_SMS_SENDER_ID`
- `PLATFORM_SUPPORT_PHONE` (zaten `lib/wa-templates/send.ts` içinde kullanılıyordu,
  artık `MobileTrialEndedScreen`'de de fallback olarak kullanılıyor)
