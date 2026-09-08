# İYS — Karar Kaydı

**Uyum takip maddesi:** 03 · Türkiye · İYS
**Karar tarihi:** 2026-08-29
**Karar veren:** Siriplan (kurucu) — danışman görüşü alınmadan, iç değerlendirmeyle
**İlgili belgeler:** [`IYS-UYUM-PLANI.md`](./IYS-UYUM-PLANI.md), [`IYS-HUKUKI-DAYANAK.md`](./IYS-HUKUKI-DAYANAK.md), [`IYS-ILETI-SINIFLANDIRMA.md`](./IYS-ILETI-SINIFLANDIRMA.md)

---

## Karar

**Siriplan (By Sirius Group AI and Technology Co. Ltd. — UK) İYS'ye üye OLMAYACAK.** Benimsenen model: **"işlemsel-yalnız platform"**.

1. **Platform kaynaklı mesajlar** (WhatsApp tek platform numarası + platform SMS) katı biçimde işlemseldir: randevu onay/hatırlatma/iptal/güncelleme ve abonelik bildirimleri. Bunlar Yönetmelik m.6 kapsamında onay ve İYS'den muaftır.
2. **Pazarlama özellikleri** (kampanya, doğum günü) salonun kendi SMS/WhatsApp hesabından gönderilir. Hukuken hizmet sağlayıcı ve İYS yükümlüsü salondur. Siriplan aracı teknik altyapı sağlar ve bunu sözleşme + ürün içi beyanla açıkça belirtir.
3. Salonların kendi İYS üyeliklerini yapması gerektiği ürün içinde belirtilir (kampanya oluşturma ekranındaki İYS beyan kutusu + iys.org.tr yönlendirmesi).

## Gerekçe

- Siriplan'ın kendi adına gönderdiği tek şey işlemsel randevu bildirimleridir (m.6 muaf).
- İYS üyeliği pratikte TR vergi kimlik numarası / MERSİS ve TR tüzel kişilik gerektirir; Siriplan yurt dışı tüzel kişidir.
- Pazarlama iletileri zaten salonun kendi kanallarından gider; TR SMS sağlayıcıları da salonlardan İYS üyeliği talep eder.

## Uygulanan teknik önlemler (2026-08-29)

| Önlem | Dosya |
|---|---|
| Doğum günü mesajı `marketing_consent = true` filtresi (önceden filtresizdi) | `src/app/api/cron/birthday/route.ts` |
| Kampanya + doğum günü iletilerine zorunlu ret dipnotu | `src/lib/marketing-opt-out.ts` → `optOutFooter()` |
| Gelen "RET" WhatsApp mesajının otomatik işlenmesi (onay geri çekme + teyit + denetim kaydı) | `src/app/api/webhooks/whatsapp/route.ts`, `recordMarketingOptOut()` |
| `customer_consents.captured_via` = `opt_out_reply` + `marketing_consent_audit` denetim görünümü | `supabase/migrations/20260829_iys_marketing_opt_out.sql` |
| Kampanya ekranında İYS beyan kutusu (zorunlu) | `src/app/dashboard/kampanyalar/yeni/page.tsx` |
| İşlemsel şablon düzenleme ekranında "tanıtım eklerseniz TEİ olur" uyarısı (4 dil) | `src/app/dashboard/ayarlar/page.tsx`, `messages/*.json` → `settingsPage.templatePromoWarning` |

**Önceden mevcut olup korunan:** `customer_consents` append-only denetim izi (migration 017), rezervasyon sihirbazında ayrı pazarlama onay kutusu, `consent_requests` link akışı, kampanya `marketing_consent` filtresi, müşteri kartından elle onay/ret.

## Artık riskler

| Risk | Kabul gerekçesi / azaltım |
|---|---|
| WhatsApp mesajı Siriplan numarasından gidiyor → düzenleyici Siriplan'ı "gönderen" sayabilir | Şablonlar Meta *utility* kategorisinde; içerikte hizmet sağlayıcı = salon adı; platform mesajlarına tanıtım eklenmiyor |
| Salon işlemsel şablona indirim metni ekler | Ayarlar ekranında uyarı var; kod tarafında sert engel yok — kabul edilen kalıntı risk |
| SMS ret callback'i Siriplan DB'sine yazılmıyor | SMS kampanyası ikincil kanal; sağlayıcı İYS entegrasyonu ret'i kendi tarafında işler; panelden elle kapatma var. Gelecek işi olarak `IYS-UYUM-PLANI.md`'de kayıtlı |

## Yeniden değerlendirme tetikleyicileri

1. Siriplan platform numarasından tanıtım/pazarlama göndermeye başlarsa.
2. İYS Entegratör iş modeli gündeme gelirse (pazarlama-hizmet-olarak satışı).
3. Siriplan Türkiye'de tüzel kişilik kurarsa.
4. BTK / Ticaret Bakanlığı şikâyeti veya İYS/Yönetmelik değişikliği olursa.
5. Yeni bir müşteriye dönük ileti türü eklenirse — önce `IYS-ILETI-SINIFLANDIRMA.md`'ye işlenir.

## Durum

Uyum takip listesi maddesi **03 · Türkiye · İYS → tamamlandı (8/8)**. Bu kayıt, danışman görüşü alınana kadar geçerli iç değerlendirmedir.
