# İYS — İleti Sınıflandırma Tablosu

**Amaç:** Siriplan üzerinden müşterilere giden her otomatik/toplu iletinin 6563 sayılı Kanun ve Ticari İletişim Yönetmeliği karşısındaki sınıfını tek yerde tutmak.
**Bakım:** Yeni bir bildirim türü eklendiğinde (anket, "sizi özledik", puan bildirimi vb.) bu tabloya işlenir ve sınıfı belirlenir. Sınıf "onaya tabi TEİ" ise gönderim kodu `marketing_consent` filtresi + ret dipnutu içermek zorundadır.
**Son güncelleme:** 2026-08-29
**İlgili:** [`IYS-UYUM-PLANI.md`](./IYS-UYUM-PLANI.md), [`IYS-HUKUKI-DAYANAK.md`](./IYS-HUKUKI-DAYANAK.md), [`IYS-KARAR-KAYDI.md`](./IYS-KARAR-KAYDI.md)

---

## Sınıflar

| Kısaltma | Anlam | Onay | İYS kaydı | Ret dipnotu |
|---|---|---|---|---|
| **İŞL** | İşlemsel bildirim (Yön. m.6/1–6/2), tanıtım içermez | Gerekmez | Gerekmez | Gerekmez (talep gelirse saygı) |
| **B2B** | Alıcı tacir/esnaf + kendi aboneliği (m.6/2–6/3) | Gerekmez | Gerekmez | Gerekmez |
| **TEİ** | Onaya tabi ticari elektronik ileti | **Açık rıza şart** | **Gönderen işletme yükümlü** | **Zorunlu** |
| **DIŞI** | Ticari elektronik ileti tanımına girmez | — | — | — |

---

## Tablo

| # | İleti | Kanal | Fiili gönderen | İçerik özeti | Sınıf | Kod yolu | Uyum durumu |
|---|---|---|---|---|---|---|---|
| 1 | Randevu onayı (`onay`) | WhatsApp — tek platform numarası (Meta *utility* şablon) | Siriplan WABA; içerikte `{salon}` | "…randevunuz oluşturulmuştur" | **İŞL** | `src/lib/wa-templates/*`, `DEFAULT_WA_TEMPLATE` | ✅ Tanıtım yok |
| 2 | Randevu hatırlatma (`hatirlatma`) | WhatsApp (platform no) + e-posta | Siriplan WABA / Siriplan e-posta; `{salon}` + `business_phone` | "…randevunuzu hatırlatmak isteriz" | **İŞL** | `migration 017` pg_cron → `/api/whatsapp/send-template`; `/api/cron/reminder` (e-posta) | ✅ |
| 3 | Randevu iptali (`iptal`) | WhatsApp (platform no) | Siriplan WABA; `{salon}` | "…randevunuz iptal edilmiştir" | **İŞL** | `DEFAULT_WA_CANCEL_TEMPLATE` | ✅ |
| 4 | Randevu güncelleme (`revize`) | WhatsApp (platform no) | Siriplan WABA; `{salon}` | "…randevunuz … güncellenmiştir" | **İŞL** | `DEFAULT_WA_REVIZE_TEMPLATE` | ✅ |
| 5 | Deneme/abonelik bildirimi | Platform SMS + e-posta | Siriplan → salon **sahibine** | "Deneme süreniz bitiyor" vb. | **B2B** | `/api/cron/trial-reminder`, `sendTrialEndingEmail`, `sendPlatformSms` | ✅ |
| 6 | Kampanya | SMS / WhatsApp — **salonun kendi hesabı** | **Salon** | Serbest metin — indirim, davet, tanıtım | **TEİ** | `src/lib/campaign-send.ts`, `campaign-segment.ts`, `/api/cron/campaigns` | ✅ `marketing_consent` filtresi + ret dipnotu + İYS beyanı (2026-08-29) |
| 7 | Doğum günü mesajı | WhatsApp + e-posta — **salonun kendi hesabı** | **Salon** | "Doğum günün kutlu olsun … %10 indirim … [link]" | **TEİ** | `/api/cron/birthday`, `sendBirthdayEmail`, `emailStrings().birthdayWhatsApp` | ✅ `marketing_consent` filtresi + ret dipnotu (2026-08-29) — önceden filtresizdi |
| 8 | Şifre sıfırlama / giriş e-postaları | E-posta | Siriplan | Kimlik doğrulama | **DIŞI** | `/api/auth/*` | ✅ |
| 9 | No-show işaretleme | — | — | Mesaj göndermez; randevu durumunu `gelmedi` yapar | **DIŞI** | `/api/cron/noshow` | ✅ |
| 10 | WhatsApp gelen mesaj otomatik/AI yanıtı | WhatsApp | Salon WABA | Müşterinin sorusuna cevap | **İŞL** (talep edilen iletişim, m.6/1) | `/api/webhooks/whatsapp` | ✅ + RET yakalama (2026-08-29) |

---

## Ret (opt-out) akışı — TEİ iletiler

- **Dipnot:** `src/lib/marketing-opt-out.ts` → `optOutFooter(channel, locale)`; kampanya ve doğum günü mesajlarına otomatik eklenir.
- **Yakalama (WhatsApp):** `/api/webhooks/whatsapp` gelen mesajda `isMarketingOptOut()` → `recordMarketingOptOut()` → `customers.marketing_consent=false` + `customer_consents` (given=false, captured_via=`opt_out_reply`) + teyit mesajı. AI/otomatik yanıta düşmez.
- **Yakalama (SMS):** Sağlayıcı (NetGSM/VatanSMS/İletimerkezi) İYS entegrasyonu "RET" yanıtını kendi tarafında işler ve numarayı ret listesine alır. Ayrıca panelden müşteri kartından `marketing_consent` elle kapatılabilir (`/dashboard/musteriler/[id]`). **Açık nokta:** sağlayıcıdan gelen SMS ret callback'ini Siriplan DB'sine yazan uç henüz yok — bkz. `IYS-UYUM-PLANI.md` gelecek işi.
- **Denetim görünümü:** `marketing_consent_audit` (migration `20260829_iys_marketing_opt_out.sql`).

---

## Anayasal kural

> **İŞL** sınıfı bir iletiye tanıtım/indirim/pazarlama ifadesi eklenirse ileti **TEİ**'ye döner:
> onay + İYS + ret dipnotu zorunlu hâle gelir. Bu yüzden işlemsel şablonların düzenlendiği
> ekranda (`/dashboard/ayarlar` → WhatsApp şablonları) `settingsPage.templatePromoWarning` uyarısı gösterilir.
