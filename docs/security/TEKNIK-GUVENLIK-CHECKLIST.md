# 06 · Teknik Güvenlik — Takip Listesi (SEC-01 … SEC-10)

**Son güncelleme:** 2026-08-29
**İlke:** Ana yapı, işleyiş ve app (TWA) paketi bozulmadan; değişiklikler yalnızca
eklemeli (yeni dosya / config / doküman).

Durum anahtarı: ✅ tamam · 🟡 devam ediyor / kısmen · ⬜ yapılacak (kod-dışı / ops)

---

## Özet tablo

| # | Konu | Durum | Bu turda yapılan |
| --- | --- | --- | --- |
| SEC-01 | Sır rotasyonu | ⬜ | Sır envanteri + rotasyon periyodu belgelendi (ACCESS-MANAGEMENT §2) — rotasyonun kendisi harici panel işi |
| SEC-02 | Panelde 2FA/MFA | ⬜ | Kapsam notu eklendi — kod değişikliği ayrı iş (risk: oturum akışı) |
| SEC-03 | İzolasyon testi CI'da | 🟡 | Workflow taslağı (`docs/security/ci-workflow-security.yml`) + `npm run security:*` scriptleri; taslağın `.github/workflows/`'a elle eklenmesi + GitHub secret/var kurulumu bekliyor |
| SEC-04 | Rate limiting + WAF + bot | 🟡 | Rate limit + bot-guard + tor-guard zaten var; Turnstile anahtarları + WAF katmanı bekliyor |
| SEC-05 | Bağımlılık & sır taraması | 🟡 | `.github/dependabot.yml` + CI'da `npm audit` kapısı eklendi; GitHub secret scanning/push protection panelden açılacak |
| SEC-06 | Sızma testi + ifşa politikası | 🟡 | `SECURITY.md` + `/.well-known/security.txt` + `/guvenlik` sayfası var; yıllık bağımsız pentest bekliyor |
| SEC-07 | Yedek & kurtarma tatbikatı | 🟡 | `BACKUP-RECOVERY-PLAN.md` (RPO/RTO tanımlı); Supabase PITR + tatbikat bekliyor |
| SEC-08 | İzleme + denetim logu | 🟡 | `audit_logs` + CSP-report var; `MONITORING-AND-AUDIT.md` yol haritası; Sentry + uptime bekliyor |
| SEC-09 | Olay müdahale planı | ✅ | `INCIDENT-RESPONSE-PLAN.md` + ICO/KVKK/AB + kiracı bildirim şablonları yazıldı |
| SEC-10 | Erişim yönetimi | ✅ | `ACCESS-MANAGEMENT-POLICY.md` — en az yetki, erişim tablosu, onboarding/offboarding checklist, prod log |

---

## SEC-01 · Sır rotasyonu — ⬜ (harici)

`META_APP_SECRET` ve 1 adet kiracı `sms_password` rotasyonu bekliyor.

- [x] Tüm sırların envanteri + saklama yeri + rotasyon periyodu belgelendi →
      [ACCESS-MANAGEMENT-POLICY.md §2](ACCESS-MANAGEMENT-POLICY.md)
- [ ] `META_APP_SECRET` → Meta App Dashboard'dan yeni değer, Vercel env güncelle, redeploy
- [ ] İlgili kiracının `sms_password` değerini yenile (Supabase `organizations`)
- [ ] Rotasyon tarihini ACCESS-MANAGEMENT-POLICY §2 tablosuna işle

> Kod tarafında yapılacak bir şey yok — panel/dashboard işlemi.

## SEC-02 · Panelde 2FA/MFA — ⬜

- [ ] Supabase MFA (TOTP) enrollment akışı — `/dashboard/ayarlar/guvenlik` altında
- [ ] Oturum süresi politikası: "Beni hatırla" işaretsizken kısa ömür (login route'ta
      `persistSession` zaten var — süre ayarı eklenecek)
- [ ] Şüpheli giriş uyarısı: yeni cihaz/IP'den girişte e-posta (audit_logs login olayına bağlı)

> **Neden bu turda değil:** giriş/oturum akışına dokunuyor; regresyon riski yüksek,
> ayrı PR + canlı doğrulama gerekir.

## SEC-03 · İzolasyon testi CI'da — 🟡

- [x] Workflow taslağı hazır: [`docs/security/ci-workflow-security.yml`](ci-workflow-security.yml)
      — `static` job her PR/push'ta (lint + i18n + npm audit), `isolation` job
      canlıya karşı `tenant-isolation` + `permissions-audit` (haftalık + elle)
- [ ] **Taslağı `.github/workflows/security.yml` olarak ekle** — push eden token'da
      `workflow` scope'u yok; dosyayı GitHub web arayüzünden veya `workflow` scope'lu
      bir PAT ile ekleyin (içerik `ci-workflow-security.yml` ile birebir)
- [x] `package.json` scriptleri: `security:isolation`, `security:permissions`, `security:csp`, `security:all`
- [ ] GitHub repo → **Secrets:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] GitHub repo → **Variables:** `SECURITY_TESTS_ENABLED=1`
- [ ] `main` branch protection'a `security / static` job'ını zorunlu kıl

## SEC-04 · Rate limiting + WAF + bot koruması — 🟡

- [x] Rate limit altyapısı: `src/lib/rate-limit.ts` (sliding window, bağımlılıksız)
- [x] Uygulanan uçlar: `login`, `contact`, `public/appointment`, `public/cancel`,
      `availability`, `quick-register`, `dashboard-chat`, `chat`, `whatsapp webhook`,
      `staff/invite/register`, `public/salon`, `public/consent`, `public/customer-language`
- [x] Bot guard: `src/lib/bot-guard.ts` (honeypot + timing + disposable email + link spam)
- [x] Tor exit-node guard: `src/lib/tor-guard.ts`
- [x] Turnstile entegrasyon kodu: `src/lib/turnstile.ts`
- [ ] Turnstile canlı anahtarları (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) — bkz. [[contact-form-defense]]
- [ ] Kenar WAF / bot yönetimi: Cloudflare proxy veya Vercel Firewall kuralları
      (login, `/api/contact`, `/r/[slug]` için hız + ülke/ASN kuralları)
- [ ] Kalıcı rate-limit deposu (Upstash Redis / Vercel KV) — trafik büyürse; `hit()` gövdesi değişir, çağıran kod değişmez

## SEC-05 · Bağımlılık & sır taraması — 🟡

- [x] `.github/dependabot.yml` — haftalık npm + github-actions, minor/patch gruplu
- [x] CI'da `npm audit --audit-level=high` kapısı + tam rapor (bilgi amaçlı)
- [ ] GitHub → Settings → Code security: **Dependabot alerts** + **security updates** aç
- [ ] GitHub → **Secret scanning** + **push protection** aç
- [ ] İlk `npm audit` çıktısını temizle (yüksek/kritik varsa)

## SEC-06 · Sızma testi + ifşa politikası — 🟡

- [x] `/.well-known/security.txt` (Contact, Expires, Policy, Canonical, Preferred-Languages)
- [x] `/guvenlik` sorumlu ifşa sayfası (rapor kanalı, kurallar, safe harbor)
- [x] `SECURITY.md` (repo kökü, GitHub standardı) — kapsam tablosu + iç referanslar
- [ ] Yıllık bağımsız sızma testi (harici firma) — sözleşme + rapor arşivi
- [ ] Otomatik DAST taraması (örn. OWASP ZAP baseline) CI'a opsiyonel job olarak

## SEC-07 · Yedek & kurtarma tatbikatı — 🟡

- [x] `BACKUP-RECOVERY-PLAN.md` — RPO/RTO matrisi, yedek envanteri, kurtarma prosedürleri
- [ ] Supabase PITR planını etkinleştir (Pro add-on)
- [ ] Haftalık şifreli `pg_dump` (repo-dışı kopya) — `scripts/security/db-backup.sh`
- [ ] İlk geri yükleme tatbikatı + süre kaydı (üç ayda bir tekrar)

## SEC-08 · İzleme + denetim logu — 🟡

- [x] `audit_logs` tablosu + `src/lib/audit.ts` (kişisel-veri erişimi, randevu durum, export)
- [x] `/api/csp-report` CSP ihlal toplama
- [x] `MONITORING-AND-AUDIT.md` — mevcut durum + Sentry/uptime yol haritası
- [ ] Sentry (`@sentry/nextjs`) — PII maskeli, uyarı kanalı Telegram
- [ ] Uptime izleme + `/api/health` uç noktası
- [ ] `audit_logs` olay kapsamını genişlet: login (başarılı/başarısız), yetki değişimi,
      müşteri silme, plan değişimi, admin işlemleri

## SEC-09 · Olay müdahale planı — ✅

- [x] `INCIDENT-RESPONSE-PLAN.md` — roller, şiddet seviyeleri, containment→post-mortem akışı
- [x] Yasal bildirim: ICO (72s), KVKK (72s), AB GDPR (72s) yükümlülükleri + kanallar
- [x] Şablonlar: `templates/ico-breach-notification.md`, `kvkk-veri-ihlali-bildirimi.md`,
      `eu-gdpr-breach-notification.md`, `tenant-breach-notice.md`
- [ ] (İzleyen) İlk masa-başı tatbikatı — planın kendisi hazır

## SEC-10 · Erişim yönetimi — ✅

- [x] `ACCESS-MANAGEMENT-POLICY.md` — en az yetki ilkesi
- [x] Üretim sistemleri erişim tablosu (kim, hangi rol, 2FA)
- [x] Sır envanteri + rotasyon periyotları
- [x] Onboarding + offboarding (24 saat) checklist'leri
- [x] Üretim erişiminin loglanması (Vercel / Supabase / GitHub audit log) + üç aylık gözden geçirme
- [x] GitHub repo sertleştirme maddeleri (branch protection, secret scanning, Dependabot)

---

## Bu turda değişen dosyalar

```
+ .github/dependabot.yml
+ docs/security/ci-workflow-security.yml   (→ elle .github/workflows/security.yml olarak eklenecek)
+ SECURITY.md
+ docs/security/INCIDENT-RESPONSE-PLAN.md
+ docs/security/ACCESS-MANAGEMENT-POLICY.md
+ docs/security/BACKUP-RECOVERY-PLAN.md
+ docs/security/MONITORING-AND-AUDIT.md
+ docs/security/TEKNIK-GUVENLIK-CHECKLIST.md
+ docs/security/templates/ico-breach-notification.md
+ docs/security/templates/kvkk-veri-ihlali-bildirimi.md
+ docs/security/templates/eu-gdpr-breach-notification.md
+ docs/security/templates/tenant-breach-notice.md
~ package.json         (yalnızca "scripts" — security:* eklendi)
```

Uygulama kodu, `next.config.ts`, `src/proxy.ts`, CSP, TWA/manifest, migration'lar
**değişmedi**. App paketi ve işleyiş etkilenmez.
