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

- Dosya: [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json) — tekil geçerli dizi, `package_name: com.siriplan.app`.
- **Doğru parmak izinin tek kaynağı:** Play Console → Test edin ve yayınlayın → Kurulum → **Uygulama bütünlüğü → Uygulama imzalama**. O sayfa doğru `assetlinks.json` içeriğini hazır üretir. Elle tahmin etme.
- **Geçmiş hata 1:** iç içe dizi (`[[ ... ]]`) → geçersiz JSON (commit `54e4ec5`).
- **Geçmiş hata 2 (9 Eyl):** `e62ba07`'de girilen iki parmak izi (`42:0D:B1...`, `D9:51:28...`) Play App Signing anahtarıyla eşleşmiyordu → DAL doğrulaması başarısız, TWA "Running in Chrome" adres çubuklu sekme olarak açılıyordu. Play Console'un verdiği gerçek App Signing SHA-256 (`7C:A5:3C:5A:...:36:EC:E7`) ile düzeltildi (commit `cbc13a4`).
- İmza anahtarı ileride değişirse veya bir yükleme anahtarı (sideload testi için) eklenmesi gerekirse: parmak izini Play Console'dan al → bu dosyaya ekle → commit/push → Vercel deploy.
- Değişiklik sonrası: `https://siriplan.com/.well-known/assetlinks.json` + Google DAL API ile doğrula, sonra **uygulamayı kaldır → Chrome önbelleğini temizle → telefonu yeniden başlat → Play'den tekrar kur** (Android doğrulama sonucunu kurulumda cache'ler).
- **Yeni AAB gerekmez** — bu bir web dosyası.

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

## Mağaza girişi metinleri (tr-TR — Play Console'a kopyala)

**Uygulama adı:** `SiriPlan`

**Kısa açıklama (76/80):**
```
Kuaför, berber ve güzellik salonları için akıllı randevu ve işletme yönetimi
```

**Tam açıklama:** tam metin scratchpad `play-store-magaza-metinleri.md` içinde. Özet yapı: giriş paragrafı + "B2B, abonelik yalnızca web'de" notu + Öne Çıkan Özellikler + İsteğe Bağlı Entegrasyonlar (WhatsApp/SMS varsayılan kapalı) + Kimler İçin + Gizlilik linkleri (/gizlilik, /kvkk, /hesap-silme) + iletişim: `info@bysirius.com`.

**Simge:** `public/icons/icon-play-512x512.png` · **Özellik grafiği:** `public/icons/feature-graphic-1024x500.png` · **Ekran görüntüleri:** `docs/play-store/screenshots/` (8 adet, 1080×1920, tr-TR, demo hesaptan).

Ekran görüntüsü başlıkları (Play'de opsiyonel):
1. Panel özeti  2. Çoklu personel takvimi  3. Randevu listesi & durum takibi  4. Sesli randevu oluşturma  5. WhatsApp/Instagram istekleri  6. Müşteri kayıtları & sadakat puanı  7. Ciro & analitik raporları  8. Otomatik kampanya modülü

Üretim komutları (yeniden çekmek gerekirse): scratchpad `screens_final.mjs` + `screens_fix.mjs` (Playwright, `NEXT_LOCALE=tr` çerezi + `sahip.demo@siriplan.com`).

## Data safety

`/gizlilik` ve `/kvkk` ile tutarlı: Ad, e-posta, telefon, uygulama içi eylemler toplanıyor; amaç hesap yönetimi + uygulama işlevi; üçüncü tarafla paylaşım yok; aktarımda şifreleme var; kullanıcı silme talep edebilir (Ayarlar → "Hesabımı Sil").
WhatsApp/SMS entegrasyonları isteğe bağlı ve varsayılan kapalı — yalnızca işletme kendi hesabını bağlarsa müşteri ad+telefon o sağlayıcıya gider.

## Demo veri

`scripts/demo-refresh.mjs --apply` — randevuları çalıştırıldığı güne göre dinamik pencerede (geçmiş 4 gün + gelecek 9 gün) dağıtır, 17 test/bozuk müşteri adını normalleştirir (yalnızca `appointments.customer_name`, müşteri kaydına dokunmaz), `appointment_requests` satırını `pending` yapar. İnceleme uzarsa tekrar çalıştır.

## Kalan adımlar (Play Console'da)

- [x] Feature graphic 1024×500 hazır (`public/icons/feature-graphic-1024x500.png`) → Play Console'a yükle
- [x] Telefon ekran görüntüleri hazır (`docs/play-store/screenshots/`, 8 adet) → Play Console'a yükle
- [x] Mağaza metinleri (ad / kısa / tam açıklama) hazır → yapıştır
- [ ] Data safety formu
- [ ] İçerik derecelendirme (IARC) anketi
- [ ] App access + reviewer notes (yukarıdaki metin)
- [ ] Test uygulamasını yeniden kur → adres çubuğu yok / giriş çalışıyor / ödeme yüzeyi yok doğrula
- [ ] Production'a çıkar → Send for review
