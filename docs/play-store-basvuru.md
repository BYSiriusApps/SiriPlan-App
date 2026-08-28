# Google Play Store — Başvuru Notları (SiriPlan Android / TWA)

> Son güncelleme: 2026-08-28
> Ayrıntılı görsel rehber + kopyalanabilir mağaza metinleri: scratchpad `SiriPlan-PlayStore-Basvuru-Rehberi.pdf` (repoya konmadı — canlı demo şifreleri içerir).

## Uygulama kimliği

| Alan | Değer |
|---|---|
| Application ID | `com.siriplan.app` — **kesinleşti, değişmez** |
| Paketleme | PWABuilder → Android (Trusted Web Activity) |
| Host | siriplan.com |
| Start URL | `/dashboard` |
| Manifest | https://siriplan.com/manifest.json |
| Tema/arka plan | `#022058` |
| Kategori | Business · Ücretsiz · Reklam yok |
| Hesap türü | Kurumsal, kimlik doğrulandı → kapalı test zorunluluğu yok |

## Digital Asset Links

- Dosya: [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json) — tekil geçerli dizi, `package_name: com.siriplan.app` + iki SHA-256 (App signing key + Upload key).
- **Geçmiş hata:** iç içe dizi (`[[ ... ]]`) yüzünden geçersizdi → TWA'da adres çubuğu görünüyordu. Düzeltildi (commit `54e4ec5`), deploy edildi, canlıda doğrulandı.
- İmza anahtarı ileride değişirse parmak izlerini bu dosyada güncelle → commit/push → Vercel deploy.
- Değişiklik sonrası **test uygulamasını cihazdan kaldırıp yeniden kur** (Android doğrulama sonucunu kurulumda cache'ler).

## Abonelik / IAP uyumu

Abonelik yalnızca web'de (siriplan.com) bir işletme (B2B) hizmeti olarak satılır. Android uygulamasında satın alma yüzeyi, fiyat sayfası veya kayıt akışı **yoktur** — bunlar `src/proxy.ts` route kilidiyle engellenir ve giriş ekranına yönlenir. Bkz. `src/lib/subscription-lock.ts`, memory `app-store-iap-compliance`.

## İnceleme ekibi için demo giriş

- Giriş: https://siriplan.com/auth/giris
- **Sahip (tam yetki):** `sahip.demo@siriplan.com` / `Sahip!2026Demo`
- App access: "All functionality is restricted" + yukarıdaki bilgiyi gir.

## Reviewer notes (İngilizce — Play Console'a kopyala)

```
SiriPlan is a B2B SaaS appointment-management tool for hair salons, barbershops and beauty
businesses (staff scheduling, calendar, customer records, income/expense reporting).

Subscriptions are sold ONLY on our website (siriplan.com) as a business service and are NOT
offered through Google Play Billing. The Android app contains no in-app purchase and no payment
surface. Account creation and plan selection are intentionally unavailable inside the app and
redirect to the sign-in screen.

OPTIONAL THIRD-PARTY INTEGRATIONS (WhatsApp Business & SMS). The app has two optional messaging
integrations for appointment reminders and confirmations: (1) WhatsApp Business - each business
connects its own Meta WhatsApp Business account; (2) SMS provider - each business enters its own
SMS gateway API key. In the demo account these settings panels are intentionally left
unconfigured and appear empty. This is expected, not a defect: when no credentials are entered
the app simply does not send reminder/confirmation messages, and every other feature (booking,
calendar, staff, customers, reporting) works fully. These use the business's own third-party
accounts and involve no in-app purchase or payment.

Demo login (owner, full access): sahip.demo@siriplan.com / Sahip!2026Demo

The app is a Trusted Web Activity wrapper of our responsive web application. Package name
com.siriplan.app. Digital Asset Links are published at
https://siriplan.com/.well-known/assetlinks.json.
```

## Data safety

`/gizlilik` ve `/kvkk` ile tutarlı: Ad, e-posta, telefon, uygulama içi eylemler toplanıyor; amaç hesap yönetimi + uygulama işlevi; üçüncü tarafla paylaşım yok; aktarımda şifreleme var; kullanıcı silme talep edebilir (Ayarlar → "Hesabımı Sil").
WhatsApp/SMS entegrasyonları isteğe bağlı ve varsayılan kapalı — yalnızca işletme kendi hesabını bağlarsa müşteri ad+telefon o sağlayıcıya gider.

## Demo veri

`scripts/demo-refresh.mjs --apply` — randevuları çalıştırıldığı güne göre dinamik pencerede (geçmiş 4 gün + gelecek 9 gün) dağıtır, 17 test/bozuk müşteri adını normalleştirir (yalnızca `appointments.customer_name`, müşteri kaydına dokunmaz), `appointment_requests` satırını `pending` yapar. İnceleme uzarsa tekrar çalıştır.

## Kalan adımlar (Play Console'da)

- [ ] Feature graphic 1024×500 yükle (scratchpad `siriplan-feature-graphic-1024x500.png`)
- [ ] En az 2 telefon ekran görüntüsü
- [ ] Data safety formu
- [ ] İçerik derecelendirme (IARC) anketi
- [ ] App access + reviewer notes (yukarıdaki metin)
- [ ] Test uygulamasını yeniden kur → adres çubuğu yok / giriş çalışıyor / ödeme yüzeyi yok doğrula
- [ ] Production'a çıkar → Send for review
