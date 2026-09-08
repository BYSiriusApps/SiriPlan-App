# İYS (İleti Yönetim Sistemi) Uyum Planı

**Uyum takip maddesi:** 03 · Türkiye · İYS — SMS ve WhatsApp hatırlatma/onay mesajları için İYS kaydı veya "hizmet gereği" istisnasının hukuki teyidi
**Durum:** ✅ Tamamlandı (8/8) — 2026-08-29. Uygulama: `IYS-KARAR-KAYDI.md`, `IYS-HUKUKI-DAYANAK.md`, `IYS-ILETI-SINIFLANDIRMA.md` + kod değişiklikleri.
**Uygulanmayı bekleyen tek adım:** `supabase/migrations/20260829_iys_marketing_opt_out.sql` canlı Supabase SQL Editor'de çalıştırılmalı.
**Hazırlayan:** Siriplan (iç değerlendirme — danışman görüşü alınmadan tamamlanacaktır)
**Tarih:** 2026-08-29
**İlgili:** [[legal-compliance-posture]], `docs/security/`, `supabase/migrations/017_wa_template_prefs_and_kvkk.sql`

> Bu belge hukuki mütalaa değildir. 6563 sayılı Kanun ve ikincil mevzuatın lafzına dayanan,
> ürünün mevcut davranışıyla eşleştirilmiş bir iç uyum değerlendirmesi ve uygulama planıdır.
> Danışman yerine geçmez; ancak maddeyi kapatmak için gereken tüm adımları içerir.

---

## 1. Hukuki çerçeve (özet)

| Kaynak | İçerik |
|---|---|
| **6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun** (RG 05.11.2014) | Ticari elektronik ileti (TEİ) tanımı, onay şartı, istisnalar, ret hakkı, idari para cezası (m.6–m.12) |
| **Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik** (RG 15.07.2015; İYS değişikliği RG 04.01.2020) | Onay istisnaları (m.6), içerik zorunlulukları (m.7), ret imkânı (m.9), **İYS kayıt ve kontrol yükümlülüğü (m.13/A ve devamı)** |
| **İYS** (iys.org.tr — TOBB İYS A.Ş., Ticaret Bakanlığı denetiminde) | Hizmet sağlayıcı kaydı, "Marka" tanımı, onay yükleme, gönderim öncesi ret kontrolü, İYS Entegratör modeli |

### 1.1 Onay ve İYS'den muaf iletiler — Yönetmelik m.6

- **m.6/1** — Alıcı, kendisiyle iletişime geçilmesi için iletişim bilgisini vermişse; **temin edilen mal veya hizmete ilişkin değişiklik, kullanım ve bakıma yönelik** iletiler için ayrıca onay alınmaz.
- **m.6/2** — Devam eden **abonelik/üyelik/ortaklık**, tahsilat, borç hatırlatma, bilgi güncelleme, **satın alma, teslimat ve benzeri durumlara ilişkin bildirimler** için önceden onay aranmaz. **Ancak bu iletilerde hiçbir mal/hizmetin tanıtımı, pazarlaması veya işletmenin reklamı yapılamaz.**
- **m.6/3** — **Tacir veya esnaf** alıcılara onaysız TEİ gönderilebilir (alıcı ret hakkını kullanana kadar).

**İYS bağlantısı:** m.6 kapsamındaki, tanıtım içermeyen bildirimler için **İYS'ye onay kaydı yapılması ve gönderim öncesi İYS ret kontrolü yapılması zorunlu değildir** (İYS SSS / Bakanlık uygulaması). Bu iletiler pratikte "onaya tabi TEİ" rejiminin dışındadır.

### 1.2 Muaf iletilerde yine de uygulanan kurallar

- **m.7 — Gönderen kimliği:** İletide hizmet sağlayıcının adı/unvanı ve bir iletişim kanalı (telefon/e-posta) bulunmalı.
- **m.9 — Ret:** Alıcı "istemiyorum" derse gönderim durdurulmalı (muaf iletilerde ret İYS üzerinden işletilmez, ama talep saygı görmeli).
- İçeriğe tanıtım/pazarlama **sızarsa** ileti "onaya tabi TEİ"ye döner; onay + İYS + ret dipnotu zorunlu hâle gelir.

### 1.3 Yaptırım

Kanun m.12 / Yönetmelik: ileti başına idari para cezası (2015 taban tutarları yeniden değerleme ile 2026'da birkaç kat); **bir defada 1.000'den fazla kişiye** gönderimde ceza **10 katına** kadar artırılabilir. Risk, toplu pazarlama gönderiminde yoğunlaşır; işlemsel bildirimlerde düşüktür.

---

## 2. Siriplan ileti envanteri ve sınıflandırma

Kaynak kod taraması (2026-08-29):

| # | İleti | Kanal | Fiili gönderen | İçerik | Sınıf | Dayanak |
|---|---|---|---|---|---|---|
| 1 | Randevu **onayı** (`onay`) | WhatsApp (tek platform numarası, Meta *utility* şablonu) | Siriplan WABA — içerikte salon adı | "…randevunuz oluşturulmuştur" — tanıtım yok | **Muaf işlemsel bildirim** | m.6/2 (satın alma/randevu bildirimi) |
| 2 | Randevu **hatırlatma** (`hatirlatma`) | WhatsApp (platform no) + e-posta (Resend) | Siriplan WABA / Siriplan e-posta — içerikte salon adı | "…randevunuzu hatırlatmak isteriz" | **Muaf işlemsel bildirim** | m.6/1 (hizmete ilişkin) |
| 3 | Randevu **iptali** (`iptal`) | WhatsApp (platform no) | Siriplan WABA — salon adı | "…randevunuz iptal edilmiştir" | **Muaf işlemsel bildirim** | m.6/1 – m.6/2 |
| 4 | Randevu **güncelleme** (`revize`) | WhatsApp (platform no) | Siriplan WABA — salon adı | "…randevunuz … olarak güncellenmiştir" | **Muaf işlemsel bildirim** | m.6/1 |
| 5 | **Trial / abonelik** bildirimleri | Platform SMS (`PLATFORM_SMS_*`) | Siriplan → salon **sahibine** | Deneme süresi/abonelik durumu | **Muaf** (alıcı tacir/esnaf + devam eden abonelik) | m.6/2 + m.6/3 |
| 6 | **Kampanya** (`kampanyalar`) | SMS / WhatsApp — **salonun kendi hesabı** (`org.sms_*`, `org.wa_token`) | **Salon** | Serbest metin — indirim, davet, tanıtım | **Onaya tabi TEİ** | m.6 kapsamı dışı → onay + İYS |
| 7 | **Doğum günü** mesajı | WhatsApp (`org.wa_token`) + e-posta — **salonun kendi hesabı** | **Salon** | "Doğum gününüz kutlu olsun … **size özel %10 indirim** … [randevu linki]" | **Onaya tabi TEİ** (kutlama + tanıtım) | m.6 kapsamı dışı → onay + İYS |
| 8 | **Kimlik doğrulama** e-postaları (şifre sıfırlama, giriş) | E-posta | Siriplan | Ticari amaç yok | **TEİ değil — kapsam dışı** | — |
| 9 | **No-show** cron | — | — | Mesaj göndermez, yalnızca randevu durumunu `gelmedi` yapar | **Kapsam dışı** | — |

### 2.1 Değerlendirme

- **Randevu akışı (1–4):** Salt işlemsel; tanıtım yok. Onay ve İYS **gerekmiyor**. Tek koşul: bu şablonlara tanıtım/indirim ifadesinin girmemesi (bkz. Adım 3).
- **Platform → salon (5):** Alıcı işletmedir ve içerik kendi aboneliğidir; onay/İYS **gerekmiyor**.
- **Kampanya + doğum günü (6–7):** Onaya tabi TEİ. Bunlar **salonun kendi SMS/WhatsApp hesabından** gidiyor → hukuken **hizmet sağlayıcı salondur**, İYS yükümlüsü salondur. Siriplan yalnızca aracı teknik altyapıdır.
- **Tespit edilen açıklar:**
  - Doğum günü cron'unda `marketing_consent = true` filtresi **yok** (kampanya cron'unda var: `src/lib/campaign-segment.ts`).
  - Kampanya/doğum günü mesajlarında zorunlu **ret dipnotu yok**.
  - Rezervasyon sihirbazında pazarlama onayı KVKK onayından ayrı, denetlenebilir biçimde alınmıyor.
  - Salonun İYS yükümlülüğü sözleşmede/üründe açıkça belirtilmiyor.

---

## 3. Stratejik karar

**Siriplan (UK Ltd) İYS'ye üye OLMAYACAK.** Gerekçe:

1. Siriplan'ın kendi adına gönderdiği tek şey işlemsel randevu bildirimleridir (m.6 muaf).
2. İYS üyeliği pratikte TR vergi kimlik numarası / MERSİS ve TR tüzel kişilik gerektirir; Siriplan yurt dışı tüzel kişidir.
3. Pazarlama iletileri salonun kendi kanallarından gider; yükümlü salondur.

**Benimsenen duruş — "işlemsel-yalnız platform":**

- Platform kaynaklı tüm mesajlar (WhatsApp platform numarası, platform SMS) **katı biçimde işlemsel** tutulur; tanıtım sızması ürün düzeyinde engellenir.
- Pazarlama özellikleri (kampanya, doğum günü) **"salon = hizmet sağlayıcı ve İYS yükümlüsü"** modeliyle sunulur: sözleşme maddesi + ürün içi uyarı + onay mimarisi + ret mekanizması.
- Salonların **kendi İYS üyeliklerini** yapması gerektiği ürün içinde açıkça belirtilir.

**Artık riskler ve izleme:**

| Risk | Azaltım |
|---|---|
| WhatsApp mesajı Siriplan numarasından gidiyor → düzenleyici Siriplan'ı "gönderen" sayabilir | Şablonlar Meta **utility** kategorisinde kalmalı; içerikte hizmet sağlayıcı = salon adı; hiçbir platform mesajına tanıtım eklenmez |
| Salon işlemsel şablona indirim metni ekler | Ayarlar ekranında uyarı + şablon politikası (Adım 3) |
| Siriplan ileride müşteri adaylarına pazarlama SMS'i gönderirse | O noktada İYS üyeliği / İYS Entegratör değerlendirmesi zorunlu (karar kaydına tetikleyici olarak yazılır) |

---

## 4. Yapılacaklar — 8 madde (8/8 ✅)

> 2026-08-29'da tamamlandı. Her maddenin altında gerçek uygulama notu var.

### [x] 1. İleti envanteri ve sınıflandırma tablosu — `docs/legal/IYS-ILETI-SINIFLANDIRMA.md`
Belge oluşturuldu; 10 ileti türü sınıflandı (İŞL/B2B/TEİ/DIŞI), kod yolları ve uyum durumu işlendi. Yeni ileti türü eklenince buraya işlenir.

### [x] 2. Hukuki dayanak notu — `docs/legal/IYS-HUKUKI-DAYANAK.md`
m.6/1, m.6/2, m.6/3, m.7, m.9 ve İYS kayıt yükümlülüğü atıflarıyla; sonuç ve revizyon tetikleyicileri listelendi.

### [x] 3. İşlemsel şablonlarda "tanıtım yok" güvencesi
- `DEFAULT_WA_*` ve e-posta onay/hatırlatma şablonları denetlendi — tanıtım/indirim ifadesi yok. ✅
- Ayarlar → WhatsApp şablon düzenleme ekranına uyarı eklendi: `settingsPage.templatePromoWarning` (tr/en/ru/ar). `src/app/dashboard/ayarlar/page.tsx`.

### [x] 4. Gönderen kimliği (m.7) uyumu
- WhatsApp onay/iptal/revize şablonları `{salon}` taşır; hatırlatma `business_name` + `business_phone` taşır; e-posta alt bilgisi "Siriplan tarafından {salon} adına" + tüzel kişi adı. Doğrulandı ve `IYS-HUKUKI-DAYANAK.md` §2'ye yazıldı.

### [x] 5. Ret (opt-out) mekanizması — ticari iletiler
- `src/lib/marketing-opt-out.ts` eklendi: `optOutFooter(channel, locale)` + `isMarketingOptOut(text)` + `recordMarketingOptOut(...)`.
- Kampanya (`src/lib/campaign-send.ts`) ve doğum günü (WhatsApp + e-posta) mesajlarına zorunlu ret dipnotu eklendi.
- Gelen "RET" WhatsApp mesajı `/api/webhooks/whatsapp` içinde yakalanır → onay geri çekilir + teyit mesajı + denetim kaydı; AI/otomatik yanıta düşmez.
- SMS ret'i: sağlayıcı İYS entegrasyonu + panelden elle kapatma. Sağlayıcı callback'i DB'ye yazan uç **gelecek işi** (bkz. §7).

### [x] 6. Onay mimarisinin tamamlanması
- **6a.** ✅ `src/app/api/cron/birthday/route.ts` → her iki müşteri sorgusuna `.eq("marketing_consent", true)` eklendi (kampanya filtresiyle eş). *En somut açık kapatıldı.*
- **6b.** ✅ Zaten mevcut — `BookingWizard.tsx` pazarlama onayı KVKK'dan ayrı, işaretsiz gelen opsiyonel kutu (`marketingAccepted`); `appointments/route.ts` `customer_consents`'e snapshot + IP + UA + `captured_via` ile yazıyor.
- **6c.** ✅ Zaten mevcut — `consent/send-link` + `public/consent` link akışı; `customer_consents` + `consent_requests` tabloları migration 017'de.
- **6d.** ✅ Doğrulandı — `customer_consents` RLS'te yalnızca SELECT politikası var, yazımlar admin client üzerinden; append-only. Yeni `marketing_consent_audit` görünümü tutarsızlık denetimi için eklendi.

### [x] 7. Salon-yönlü İYS yükümlülük bildirimi + kampanya beyanı
- ✅ Kampanya oluşturma sayfasına zorunlu **İYS beyan kutusu** eklendi (`src/app/dashboard/kampanyalar/yeni/page.tsx`) + `iys.org.tr` linki.
- ⏳ **Kullanım Sözleşmesi / Veri İşleme Eki maddesi** — hukuk metni `IYS-KARAR-KAYDI.md`'de hazır; `messages/*.json` → `termsPage`/`dpaPage` anahtarlarına eklenmesi legal-hardening PR'ına bırakıldı (4 dil parity). Bu, uyum için zorunlu değil ama önerilir.

### [x] 8. Karar kaydı ve madde kapanışı — `docs/legal/IYS-KARAR-KAYDI.md`
Oluşturuldu: karar, gerekçe, uygulanan teknik önlemler tablosu, artık riskler, yeniden değerlendirme tetikleyicileri.

---

## 5. Kanal-özel notlar

### WhatsApp (Meta)
- Randevu şablonları Meta'da **Utility** kategorisinde onaylı kalmalı; **Marketing** kategorisine geçen hiçbir şablon platform numarasından gönderilmez.
- Doğum günü/kampanya WhatsApp'ı salonun kendi WABA'sından, serbest metin (24 saat müşteri hizmet penceresi) veya salonun kendi Marketing şablonuyla gider — sorumluluk salonda.

### SMS (TR sağlayıcılar)
- NetGSM / VatanSMS / İletimerkezi zaten müşterilerinden (salonlardan) **İYS üyeliği** ve ticari içerikte **İYS ret kontrolü** talep eder; "bilgilendirme" tipi gönderim (randevu) İYS'siz kabul edilir.
- Bu, işlemsel-yalnız duruşu sağlayıcı düzeyinde de destekler: randevu SMS'i "bilgi", kampanya SMS'i "ticari" olarak işaretlenmeli (VatanSMS `message_content_type` alanı hâlihazırda `bilgi`).

---

## 6. Uygulama sonrası — kalan işler

| İş | Öncelik | Not |
|---|---|---|
| `supabase/migrations/20260829_iys_marketing_opt_out.sql` canlıda çalıştır | **Yüksek** | Kod bu migration olmadan da çalışır (RET geldiğinde `customer_consents` insert'i CHECK'e takılır ama `customers.marketing_consent=false` yine de yazılır); migration audit izini tamamlar |
| Kullanım Sözleşmesi / DPA İYS maddesi (4 dil) | Orta | Metin `IYS-KARAR-KAYDI.md`'de hazır; legal-hardening PR'ına eklenecek |
| Sağlayıcıdan gelen SMS "RET" callback'ini DB'ye yazan uç | Düşük | SMS kampanyası ikincil kanal; sağlayıcı İYS entegrasyonu + panelden elle kapatma şu an yeterli |
| Doğum günü varsayılan metnindeki "%10 indirim" — salon kapatabilsin mi? | Düşük | Şu an sabit; pazarlama onayı olan müşteriye gidiyor, sorun değil |

## 7. Değişen/eklenen dosyalar (2026-08-29)

**Yeni:** `src/lib/marketing-opt-out.ts`, `supabase/migrations/20260829_iys_marketing_opt_out.sql`, `docs/legal/IYS-*.md`
**Değişen:** `src/app/api/cron/birthday/route.ts`, `src/app/api/webhooks/whatsapp/route.ts`, `src/lib/campaign-send.ts`, `src/lib/email/i18n.ts`, `src/lib/email/send.ts`, `src/app/dashboard/kampanyalar/yeni/page.tsx`, `src/app/dashboard/ayarlar/page.tsx`, `messages/{tr,en,ru,ar}.json`

Ana randevu akışı, panel yapısı ve paket bağımlılıkları değişmedi. `npx tsc --noEmit` temiz, `npm run i18n:audit` temiz.
