# Olay Müdahale Planı (Incident Response Plan) — SEC-09

**Sahip:** Özgün Üstüay (kurucu / veri sorumlusu temsilcisi)
**Son güncelleme:** 2026-08-29
**Kapsam:** siriplan.com, `com.siriplan.app`, Supabase projesi, Vercel projesi (`siriplan`)

Bu plan bir güvenlik olayı (veri ihlali, yetkisiz erişim, servis kesintisi,
kötü amaçlı kod) sırasında izlenecek adımları ve yasal bildirim yükümlülüklerini
tanımlar. Yıl içinde en az bir kez masa-başı tatbikatı ile denenir.

---

## 1. Roller

| Rol | Kişi | Sorumluluk |
| --- | --- | --- |
| Olay Yöneticisi (IC) | Özgün Üstüay | Kararlar, iletişim, zaman çizelgesi |
| Teknik Müdahale | Özgün Üstüay | İzolasyon, kök-neden, düzeltme |
| Yasal / Uyum | BySirius Ltd (Companies House 17142392) danışmanı | ICO / KVKK / AB bildirim kararı |
| İletişim | Özgün Üstüay | Etkilenen işletmelere bildirim |

> Tek kişilik ekip gerçeği: yedek irtibat olarak info@bysirius.com izlenir ve
> kritik olayda harici hukuk danışmanı devreye alınır.

## 2. Şiddet seviyeleri

| Seviye | Tanım | Örnek | Hedef ilk müdahale |
| --- | --- | --- | --- |
| SEV-1 | Aktif veri sızıntısı veya tüm sistem erişilemez | Çapraz-kiracı veri okuması, DB dump | 1 saat |
| SEV-2 | Sınırlı yetkisiz erişim, tek kiracı etkisi | Bir salonun hesabı ele geçirildi | 4 saat |
| SEV-3 | Potansiyel açık, aktif istismar yok | Dependabot critical, sızdırılan test sırrı | 24 saat |

## 3. Müdahale akışı

### 3.1 Tespit
Kaynaklar: Sentry uyarısı, uptime alarmı, `audit_logs` anomali, müşteri bildirimi,
security.txt üzerinden gelen rapor, GitHub secret scanning uyarısı.

### 3.2 Sınıflandır & kaydet
- Olay kaydını aç: `docs/security/incidents/YYYY-MM-DD-kisa-ad.md` (özel not).
- Zaman çizelgesini UTC olarak tut. Her adımı, kim yaptığını ve kanıtı yaz.

### 3.3 Kontrol altına al (containment)
- Şüpheli oturumları geçersiz kıl: Supabase → Auth → ilgili kullanıcı → "Sign out".
- Gerekirse tüm oturumları düşür: `auth.users` JWT secret rotasyonu (son çare).
- Sızmış sır varsa **hemen rotasyon** (bkz. `docs/security/ACCESS-MANAGEMENT-POLICY.md`
  §Sır envanteri) ve Vercel env güncelle → yeniden dağıt.
- Kötü amaçlı dağıtımı geri al: Vercel → Deployments → son iyi sürüme "Promote".
- Gerekirse bakım moduna al (maintenance page).

### 3.4 Kök-neden & kanıt
- İlgili `audit_logs`, Vercel logs, Supabase logs, Postgres `pg_stat_statements`
  çıktısını dışa aktar ve olay kaydına iliştir.
- Etki kapsamını belirle: hangi org_id'ler, hangi tablolar, kaç kayıt, hangi
  kişisel veri kategorileri (isim, telefon, e-posta, randevu geçmişi).

### 3.5 Düzelt & doğrula
- Yamanın PR'ı olay kaydına linklenir.
- `npm run security:all -- --base=https://siriplan.com` yeşil dönmeli.
- İlgili migration için `scripts/security/rls-audit.sql` tekrar koşulur.

### 3.6 Kapat & öğren
- Olaydan sonra 5 iş günü içinde post-mortem (suçsuz dil).
- Aksiyon maddeleri `docs/GELISTIRME-LISTESI.md` veya teknik güvenlik
  checklist'ine eklenir.

## 4. Yasal bildirim yükümlülükleri

### 4.1 UK GDPR / ICO (BySirius Ltd veri sorumlusu)
- **Süre:** Farkına vardıktan sonra **72 saat** içinde ICO'ya bildir — "kişilerin
  hak ve özgürlükleri için risk" varsa.
- **Yüksek risk** varsa etkilenen kişilere de gecikmeksizin bildir.
- Kanal: https://ico.org.uk/for-organisations/report-a-breach/
- Şablon: `docs/security/templates/ico-breach-notification.md`

### 4.2 KVKK (Türkiye'deki işleme faaliyeti için)
- **Süre:** İhlali öğrendikten sonra **en kısa sürede, 72 saati aşmadan** Kurul'a bildir.
- İlgili kişilere makul en kısa sürede bildir.
- Kanal: KVKK "Veri İhlali Bildirim Formu" (kvkk.gov.tr).
- Şablon: `docs/security/templates/kvkk-veri-ihlali-bildirimi.md`

### 4.3 AB GDPR (AB'de yerleşik işletme müşterileri varsa)
- İlgili lider denetim otoritesine 72 saat içinde bildirim.
- Şablon: `docs/security/templates/eu-gdpr-breach-notification.md`

### 4.4 İşletme (kiracı) müşterilerine bildirim
Kiracılarımız kendi müşterilerine karşı veri sorumlusu; onları KVKK/GDPR
yükümlülüklerini yerine getirebilmeleri için **gecikmeksizin** bilgilendiririz:
ne oldu, hangi veriler, ne zaman, ne yaptık, ne yapmaları gerekir.
Şablon: `docs/security/templates/tenant-breach-notice.md`

## 5. İletişim numaraları / kanalları

| Servis | Panel | Acil |
| --- | --- | --- |
| Vercel | vercel.com/dashboard | support@vercel.com |
| Supabase | supabase.com/dashboard → project `siriplan` | support@supabase.io |
| Stripe | dashboard.stripe.com | Radar / support |
| Meta (WhatsApp) | business.facebook.com | App dashboard |
| Alan adı / DNS | (registrar) | — |

## 6. Şablonlar

`docs/security/templates/` altında tutulur (bu PR ile iskelet oluşturuldu):
- `ico-breach-notification.md`
- `kvkk-veri-ihlali-bildirimi.md`
- `eu-gdpr-breach-notification.md`
- `tenant-breach-notice.md`
