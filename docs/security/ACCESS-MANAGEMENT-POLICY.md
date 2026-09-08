# Erişim Yönetimi Politikası — SEC-10

**Sahip:** Özgün Üstüay
**Son güncelleme:** 2026-08-29
**İlke:** En az yetki (least privilege). Bir erişim, iş için gerekli olduğu
sürece verilir; gerekliliği bitince iptal edilir.

---

## 1. Üretim sistemleri ve erişim sahipleri

| Sistem | Erişim | Kimde | 2FA | Not |
| --- | --- | --- | --- | --- |
| Vercel (`siriplan`) | Owner | Özgün Üstüay | Zorunlu | Deploy + env |
| Supabase (`siriplan`) | Owner | Özgün Üstüay | Zorunlu | DB + service role + auth |
| GitHub (repo) | Admin | Özgün Üstüay | Zorunlu | Branch protection `main` |
| Stripe | Owner | Özgün Üstüay | Zorunlu | Canlı anahtarlar |
| Meta / WhatsApp Business | Admin | Özgün Üstüay | Zorunlu | App secret |
| Resend (e-posta) | Owner | Özgün Üstüay | Zorunlu | SMTP + API |
| Alan adı / DNS registrar | Owner | Özgün Üstüay | Zorunlu | — |

> Şu an tek operatör var. Ekip büyüdüğünde: rol-bazlı erişim, ayrı personel
> hesapları (paylaşılan giriş YOK), ve aşağıdaki onboarding/offboarding
> checklist'leri uygulanır.

## 2. Sır (secret) envanteri

| Sır | Nerede saklanır | Rotasyon periyodu | Son rotasyon |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (encrypted) | Yıllık / olayda | — |
| `SUPABASE_JWT_SECRET` | Supabase yönetir | Olayda (tüm oturumları düşürür) | — |
| `STRIPE_SECRET_KEY` | Vercel env | Yıllık / olayda | — |
| `STRIPE_WEBHOOK_SECRET` | Vercel env | Endpoint değişiminde | — |
| `RESEND_API_KEY` | Vercel env | Yıllık | — |
| `META_APP_SECRET` | Vercel env | **BEKLEYEN — SEC-01** | — |
| `sms_password` (kiracı bazlı) | Supabase `organizations` | **1 kayıt rotasyon bekliyor — SEC-01** | — |
| `CRON_SECRET` | Vercel env | Yıllık | — |
| `TURNSTILE_SECRET_KEY` | Vercel env | Anahtar alınınca | Bekliyor |

Kurallar:
- Sır asla repoya, log'a, hata mesajına, `NEXT_PUBLIC_*` değişkenine girmez.
- `.env.local` `.gitignore`'da; `.env.local.example` yalnızca anahtar adları.
- GitHub secret scanning + push protection açık (bkz. §5).

## 3. Onboarding checklist (yeni operatör)

- [ ] Kişisel hesap oluştur (paylaşılan giriş yok), güçlü parola + 2FA zorunlu.
- [ ] Yalnızca role uygun minimum yetki ver.
- [ ] Erişim verilenleri bu belgenin §1 tablosuna işle (tarih + veren kişi).
- [ ] Güvenlik brifingi: bu belge + olay müdahale planı + KVKK/GDPR temel.
- [ ] Parola yöneticisi kullanımı zorunlu.

## 4. Offboarding checklist (ayrılan çalışan) — 24 saat içinde

- [ ] Supabase üye erişimi kaldır.
- [ ] Vercel üye erişimi kaldır.
- [ ] GitHub collaborator / org üyeliği kaldır, aktif token'ları iptal et.
- [ ] Stripe / Meta / Resend / registrar erişimi kaldır.
- [ ] Kişinin bildiği tüm paylaşılan sırları rotasyona sok (§2 tablosu).
- [ ] Supabase Auth: kişiye ait aktif oturumları düşür.
- [ ] Google Workspace / e-posta grubu üyeliğini kaldır.
- [ ] §1 tablosunu güncelle (erişim kaldırıldı + tarih).

## 5. Üretim erişiminin loglanması

- **Vercel:** dağıtım ve env değişiklikleri Vercel Activity log'unda (Team → Activity).
- **Supabase:** SQL editör ve auth işlemleri proje log'larında; `audit_logs`
  tablosu uygulama içi kişisel-veri erişimini kaydeder (bkz.
  `docs/security/MONITORING-AND-AUDIT.md`).
- **GitHub:** repo Audit log (Settings → Logs); `main`'e doğrudan push kapalı,
  her değişiklik PR + CI'dan geçer.
- **Kontrol periyodu:** üç ayda bir erişim listesi (§1) ve log anomalileri gözden geçirilir.

## 6. GitHub repo sertleştirme

- [ ] `main` branch protection: PR zorunlu, `security / static` job zorunlu, force-push kapalı.
- [ ] Secret scanning + push protection açık.
- [ ] Dependabot alerts + security updates açık (`.github/dependabot.yml`).
- [ ] Actions: yalnızca bu repo + doğrulanmış action'lar; `GITHUB_TOKEN` varsayılan read-only.
