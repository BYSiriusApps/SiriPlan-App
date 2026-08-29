# İzleme & Denetim Logu — SEC-08

**Sahip:** Özgün Üstüay
**Son güncelleme:** 2026-08-29

---

## 1. Mevcut durum

| Katman | Araç | Durum |
| --- | --- | --- |
| Uygulama denetim izi | `audit_logs` tablosu + `src/lib/audit.ts` | **Var** — kişisel-veri erişimi, randevu durum değişimi, veri export |
| CSP ihlal raporu | `/api/csp-report` | **Var** |
| Bot/spam gözlem | `src/lib/bot-guard.ts`, `tor-guard.ts` | **Var** |
| Web analytics | `@vercel/analytics`, `@vercel/speed-insights` | **Var** |
| Hata izleme (Sentry) | — | **YOK — kurulacak** |
| Uptime izleme | — | **YOK — kurulacak** |
| Log tabanlı uyarı | — | **YOK — kurulacak** |

## 2. `audit_logs` — ne kaydediliyor

`src/lib/audit.ts` üzerinden, service role ile (kullanıcı kendi izini silemez):

- `action` — serbest kod: `data_export`, `campaign_bulk_send`,
  `appointment_status_change`, …
- `org_id`, `user_id`, `table_name`, `record_id`
- `old_data` / `new_data` — değişimin özeti
- `ip_address` — INET (ayrıştırılamıyorsa null)
- `created_at`

`audit_logs` üzerinde yalnızca SELECT RLS policy'si var, INSERT yok — kayıtlar
değiştirilemez.

### Genişletilecek olaylar (yapılacak)
- [ ] Giriş başarılı / başarısız (şu an sadece `console.warn`).
- [ ] Personel yetki değişikliği (`/api/staff/[id]/permissions`).
- [ ] Müşteri kaydı silme / anonimleştirme.
- [ ] Abonelik / plan değişikliği.
- [ ] Admin panel işlemleri (`/api/admin/*`).

## 3. Sentry kurulumu (yapılacak)

- [ ] `@sentry/nextjs` ekle, DSN'i Vercel env'e koy (server + edge + client).
- [ ] `tracesSampleRate` düşük (0.1), `replaysOnErrorSampleRate` 1.0.
- [ ] PII maskeleme: telefon/e-posta gönderme; `beforeSend` ile temizle.
- [ ] Uyarı kuralı: yeni hata türü → e-posta / Telegram (`src/lib/telegram.ts` mevcut).

## 4. Uptime izleme (yapılacak)

- [ ] Harici uptime servisi (örn. cron tabanlı) `GET https://siriplan.com/` ve
      kritik uç `GET /r/sirius-demo-salon` — 5 dk aralık.
- [ ] `/api/health` uç noktası ekle: DB ping + sürüm + zaman.
- [ ] Alarm kanalı: Telegram + e-posta. RTO hedefiyle uyumlu (bkz. BACKUP-RECOVERY-PLAN).

## 5. Düzenli gözden geçirme

| Periyot | İş |
| --- | --- |
| Haftalık | `security` workflow sonucu, Dependabot PR'ları, npm audit |
| Aylık | `audit_logs` anomali taraması (toplu export, gece erişimi, çok sayıda silme) |
| Üç aylık | Erişim listesi (ACCESS-MANAGEMENT-POLICY §1), geri yükleme tatbikatı |
| Yıllık | Bağımsız sızma testi (SEC-06), politika belgelerinin tazelenmesi |
