# Güvenlik Politikası

RandevuPro / Siriplan (siriplan.com) güvenlik açığı bildirimi.

## Bir açık buldunuz mu?

- **E-posta:** info@bysirius.com
- **Makine-okunur:** https://siriplan.com/.well-known/security.txt
- **Tam politika & safe harbor:** https://siriplan.com/guvenlik

Lütfen açığı kamuya açıklamadan önce bize 90 gün süre tanıyın. İyi niyetli
araştırmacılara karşı yasal işlem başlatmıyoruz (bkz. /guvenlik → safe harbor).

## Kapsam

| Kapsamda | Kapsam dışı |
| --- | --- |
| siriplan.com ve alt yolları | Üçüncü taraf servisler (Supabase, Vercel, Stripe, Meta) |
| `com.siriplan.app` Android (TWA) | Sosyal mühendislik, fiziksel saldırı |
| Genel API uçları (`/api/public/*`) | Otomatik tarayıcı gürültüsü, hız-sınırı tetikleme |

## Desteklenen sürümler

Yalnızca canlı üretim dağıtımı (`main` dalı) desteklenir.

## İç referanslar

- Olay müdahale planı: [docs/security/INCIDENT-RESPONSE-PLAN.md](docs/security/INCIDENT-RESPONSE-PLAN.md)
- Erişim yönetimi: [docs/security/ACCESS-MANAGEMENT-POLICY.md](docs/security/ACCESS-MANAGEMENT-POLICY.md)
- Yedek & kurtarma: [docs/security/BACKUP-RECOVERY-PLAN.md](docs/security/BACKUP-RECOVERY-PLAN.md)
- İzleme & denetim: [docs/security/MONITORING-AND-AUDIT.md](docs/security/MONITORING-AND-AUDIT.md)
- Teknik güvenlik takip listesi: [docs/security/TEKNIK-GUVENLIK-CHECKLIST.md](docs/security/TEKNIK-GUVENLIK-CHECKLIST.md)
