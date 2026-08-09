# Changelog

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
