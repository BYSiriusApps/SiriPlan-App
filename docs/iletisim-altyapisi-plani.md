# SiriPlan Communication Service — Mimari & Yol Haritası

Hazırlanma: 8 Eki 2026 · Durum: **PLAN — henüz kod yazılmadı, karar bekleyen maddeler §11'de**
Kaynak: kurucunun ChatGPT notları + mevcut kod incelemesi + bu belgedeki öneriler.

> **Okuma notu.** Fiyatlar, düzenleme tarihleri (1 Nisan 2026 URL kuralı, 18 Kasım 2026 Sender ID
> engeli, promosyonel SMS yasağı) ve "Netgsm yurtdışı şirkete hizmet vermiyor" bilgisi ChatGPT
> konuşmasından geliyor ve **doğrulanmadı**. Her biri Faz 0'da sağlayıcıdan **yazılı** teyit alınmadan
> mimari karara dayanak yapılmamalı (bkz. §10).

---

## 1. Özet (5 cümle)

1. Tek bir **Communication Engine** kurulur; SMS ve WhatsApp aynı API/kuyruk/log/ledger üzerinden geçer, sağlayıcı kodu hiçbir iş akışına gömülmez.
2. **Transactional** (randevu, hatırlatma, iptal, doğrulama) ve **promotional** (kampanya) akışları kod, veri ve politika düzeyinde ayrı yollardır; promosyonel akış varsayılan olarak **kapalı** gelir.
3. **WhatsApp ana zengin kanal, SMS kısa/URL'siz yedek kanal**dır; harita, konum, iptal bağlantısı WhatsApp'a taşınır.
4. **Önerim:** Promosyonel SMS'i SiriPlan (İngiltere) göndermesin; **işletmenin kendi Türk SMS hesabıyla (BYO)** göndersin — kodda bu zaten yarı hazır (§4).
5. İlk sürümde mevcut davranış **birebir korunur**: yeni motor önce "gölge günlük" olarak çalışır, sonra gönderim yolları tek tek taşınır (§9).

---

## 2. Mevcut durum (kod incelemesinden)

| Konu | Bugün | Sorun |
|---|---|---|
| WhatsApp | `src/lib/wa-templates/send.ts`, `internal-send.ts` — Meta Cloud API'yi **doğrudan** çağırıyor (kendi WABA'mız) | Sağlayıcı soyutlaması yok; ama BSP aracı ücreti de yok (avantaj) |
| SMS (işletme → müşteri) | `src/lib/sms.ts` `sendSms()`: org başına `sms_provider` (netgsm/vatansms/iletimerkezi) + `sms_username/password/sender_id` | İşletmenin **kendi** hesabı — BYO modeli zaten var. Parola `organizations` içinde düz metin (geçmişte sızıntı bulgusu) |
| SMS (SiriPlan → işletme) | `sendPlatformSms()` — env'den Netgsm; trial-reminder cron'u kullanıyor | Netgsm bu iş için uygun değilse (kurucu notu) değişecek |
| Gönderim noktaları | ~12 dosya: `notify.ts`, `campaign-send.ts`, `appointments/[id]/notify*.ts`, `public/cancel`, `approve.ts`, cron'lar… | Her biri doğrudan kanal fonksiyonu çağırıyor |
| Mesaj günlüğü | **Yok** (merkezi `message_logs` tablosu yok; teslim/okundu bilgisi saklanmıyor) | Maliyet, teslimat, hata analizi yapılamaz |
| Kota | `plan_usage` + `consume/release_plan_usage` (Mini: ayda 200 WA, Starter: 1 kampanya) | Yalnızca sayaç; maliyet, kredi, ledger yok. **Açık geç** (hata olursa gönderir) — doğru karar, korunmalı |
| Onay / opt-out | `marketing-opt-out.ts`, WA "RET" işleme, kampanya İYS beyanı | Kanal bazlı, kayıtlı (kim/ne zaman/hangi kaynak) opt-in defteri yok |
| Zamanlayıcı | Vercel Hobby: yalnızca **günlük** cron; hatırlatmalar DB tarafında (`wa_reminder_*` migration'ları) | Dakikalık kuyruk işleyici için Vercel cron **yetmez** (§5) |
| Maliyet görünürlüğü | Yok | Mesaj başına brüt kâr hesaplanamıyor |

**Sonuç:** Sıfırdan değil, **sarma (strangler)** işi: mevcut çalışan gönderimleri bozmadan altına motor koyacağız.

---

## 3. Hedef mimari

```
Panel / Cron / Public API
        │
        ▼
Communication API  (tek giriş: send({tenant, to, category, purpose, template, vars, idempotencyKey}))
        │
        ▼
Policy Engine  ── kategori (TRANSACTIONAL | PROMOTIONAL) · opt-in/out · sessiz saat
        │          · URL koruması · kota/kredi · tenant kanal tercihi · dil
        ▼
Message Queue (Postgres)  ── retry · exponential backoff · idempotency · dead-letter
        │
        ▼
Provider Router  ── kural: kanal + kategori + ülke + tenant ayarı + sağlık (circuit breaker) + maliyet
        │
   ┌────┴─────────────┬──────────────┬──────────────┐
   ▼                  ▼              ▼              ▼
 WhatsApp:          SMS:           SMS (BYO):     E-posta
 meta-cloud         plivo | twilio  tenant'ın      (Resend,
 (bugünkü)          bird | infobip  kendi Netgsm/  mevcut)
 + BSP'ler (ops.)   aws             İletimerkezi…
        │                  │
        ▼                  ▼
  Türkiye GSM / Meta → Alıcı
        │
        ▼
Delivery Webhooks  →  Webhook Gateway (imza doğrula · ham olayı sakla · normalize)
        │
        ▼
message_logs (+ message_events)  →  usage_ledger  →  tenant maliyet / kâr panosu
```

**Dizin önerisi:** `src/lib/comm/`
- `types.ts` (Channel, Category, Status, Money…) · `service.ts` (public API) · `policy/` (consent, url-guard, quiet-hours, quota)
- `queue/` (enqueue, claim, retry) · `router/` (rules, health) · `providers/<ad>/` (her biri aynı arayüz)
- `webhooks/` (gateway + sağlayıcı normalizerları) · `ledger/` (usage, cost, price-book) · `templates/` (kayıt + render)

Hiçbir iş kodu (`appointments`, `campaigns`) `providers/*` import etmez — yalnızca `comm.send()`.

### Provider arayüzü (istenen fonksiyonlar)

```ts
interface CommProvider {
  id: string;                          // "plivo", "meta-cloud", "byo-netgsm"
  channels: ("sms" | "whatsapp")[];
  sendSms(req: SmsRequest): Promise<SendResult>;
  sendWhatsApp(req: WaRequest): Promise<SendResult>;
  sendTemplate(req: TemplateRequest): Promise<SendResult>;   // WA şablon / SMS şablon
  getMessageStatus(providerMessageId: string): Promise<MessageStatus>;
  handleWebhook(rawBody: string, headers: Headers): Promise<NormalizedEvent[]>;
  calculateProviderCost(ctx: CostContext): Money;            // price-book'tan, segment/kategori bazlı
  checkBalance?(): Promise<Money>;
  registerSender?(req: SenderRegistration): Promise<SenderStatus>;
  capabilities: { urlInSms: "ok" | "blocked_tr" | "masked"; promoTr: boolean; unicodeSegmentLen: 70; … };
}
```
`capabilities` önemli: Politika motoru, sağlayıcının neye izin verdiğini koddan değil **bu beyandan** okur (ör. "Twilio TR promosyonel: false").

---

## 4. Önerilerim (kurucunun brifine ek / ayrışan noktalar)

### 4.1 Promosyonel SMS: SiriPlan göndermesin — işletme kendi hesabıyla göndersin (BYO)
- Türkiye'de ticari ileti (kampanya) için **İYS** yükümlülüğü gönderen işletmede; İYS planımız zaten "SiriPlan İYS'ye üye olmaz, kampanya yükümlülüğü salonda" diyor (`docs/legal/IYS-UYUM-PLANI.md`).
- Yurtdışı (international) rotadan Türkiye'ye promosyonel SMS ya yasak ya yazılı onay gerektiriyor (kurucu notu). BYO ile bu risk tamamen kalkar: Türk işletme + Türk operatör hattı + yerel sender ID.
- Kodda `sendSms()` zaten org başına Netgsm/VatanSMS/İletimerkezi kimlik bilgisiyle çalışıyor → bunu `byo-*` provider olarak yeni arayüze sarmak yeterli.
- **Kural:** `category = PROMOTIONAL` + kanal `sms` ⇒ yalnızca BYO provider; SiriPlan'ın platform hesapları promosyonel SMS **taşıyamaz** (kod düzeyinde reddedilir, `capabilities.promoTr=false`).
- WhatsApp Marketing da ticari ileti sayılır → İYS/opt-in gerekir; SiriPlan sağlayıcıdır, gönderen işletmedir (şartlar/ToS'ta açık yazılmalı).

### 4.2 WhatsApp: ilk aşamada sağlayıcı DEĞİŞTİRME — mevcut Meta Cloud API'yi ilk adapter yap
- Bugün aracı (BSP) ücreti ödemiyoruz. Plivo/Bird/Vonage ücreti Meta ücretinin **üstüne** eklenir; "Utility $0,001" gibi rakamlar Meta ücretini içermez.
- Faz 1'de `meta-cloud` adapter'ı mevcut kodu sarar; BSP'ler (Plivo/Bird/360dialog) yalnızca şu durumlarda eklenir: (a) çok sayıda işletmenin **kendi WABA'sını** bağlaması (Embedded Signup / Tech Provider), (b) Meta doğrudan erişimde operasyonel sorun.
- 360dialog Partner Platform / Meta Tech Provider = "SiriPlan'ı WhatsApp SaaS'a çeviren" yol; **Faz 5'te** ayrı araştırma, şimdi mimariyi kapatmamak yeterli (provider + `waba_id/phone_number_id` tenant başına tutulur).

### 4.3 Sender ID: tek "SIRIPLAN" + gövdede işletme adı
- Her işletme için ayrı Sender ID kaydı (2 hafta × yüzlerce) ölçeklenmez ve ISV/end-customer belgesi ister.
- Öneri: tüm transactional SMS'ler tek kayıtlı `SIRIPLAN` başlığından, **gövde işletme adıyla başlar**: `ABC Guzellik: Randevunuz 12 Ekim Pzt 14:30...`. İşletme marka adıyla gönderim isteyen BYO kullanır.

### 4.4 SMS = Türkçe karakter maliyeti
Türkçe karakter (ş, ğ, ı) çoğu sağlayıcıda Unicode'a düşürür → **70 karakter/segment** (GSM-7'de 160). Her şablonda iki sürüm tutulur: `ascii` (varsayılan, translitere) ve `unicode`. Segment sayısı ve maliyet **göndermeden önce** hesaplanıp loglanır.

### 4.5 Hesaplı dahil SMS kotası (brifteki rakamlar için maliyet kontrolü)
SMS ≈ $0,0275–0,0288/segment (doğrulanacak) ⇒ 1 SMS ≈ 2 segment olursa ≈ **$0,057**.

| Plan | Brifteki kota | Yaklaşık maliyet (2 segment/SMS) | Not |
|---|---|---|---|
| Starter | 100 | ~$5,7 | kabul edilebilir |
| Pro | 300–500 | ~$17–29 | **Mini planın tüm aylık fiyatı (USD $14) kadar** — fazla |
| Business | 1.000 | ~$57 | Business ₺4.752; sınırda |

**Öneri:** Dahil kotayı **SMS yerine WhatsApp Utility** ağırlıklı kur (çok daha ucuz), SMS'i "WA gitmediyse fallback" olarak kur ve dahil SMS'i küçük tut (örn. Starter 50 / Pro 150 / Business 500). Rakamı Faz 2'deki **gerçek pilot segment maliyetiyle** kesinleştir. Mini'ye SMS dahil etme.

### 4.6 Kuyruk için Vercel cron yetmez
Hobby planda cron günde 1 kez. Dakikalık işleme için (öncelik sırasıyla): **Supabase `pg_cron` + `pg_net` ile `/api/comm/worker` tetikleme**, ya da Upstash **QStash** / Inngest. Kuyruk tablosu Postgres'te (`FOR UPDATE SKIP LOCKED`), ek altyapı gerektirmez. Doğrulama (OTP) gibi gecikmeye duyarlı mesajlar önce **senkron** denenir, hata olursa kuyruğa düşer.

### 4.7 Sırlar
Yeni `comm_provider_accounts` ve tenant BYO kimlik bilgileri **şifreli** (Supabase Vault / pgsodium veya uygulama düzeyi AES-GCM) saklanır; API'den asla geri dönmez. Mevcut düz metin `organizations.sms_password` bu geçişte taşınır (geçmiş sızıntı bulgusu — `docs` / memory: cross-tenant-org-leak).

### 4.8 URL kuralı → mevcut işimizi etkiliyor ⚠️
Az önce hazırladığımız **trial-reminder SMS'inde URL var** (`siriplan.com/sunum.html`, `/auth/plan-sec`). Yurtdışı rotadan (1 Nisan 2026 kuralı doğruysa) engellenebilir/maskelenebilir; yalnızca Netgsm (yerel) hattıyla güvenli. **Öneri:** SiriPlan→işletme sahibi trial bildirimini şu şekilde kur: **WhatsApp utility şablonu (link burada) + e-posta (link burada) + SMS yalnızca "e-postanızı/WhatsApp'ı kontrol edin" (URL'siz)**. Bu karar Faz 2 sonucuna göre netleşir; o güne kadar Netgsm hattıyla gidecekse mevcut metin kullanılabilir.

---

## 5. Veri modeli (provider-bağımsız, her tablo `tenant_id` + RLS)

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `comm_provider_accounts` | Platform ve BYO hesapları | `id, scope(platform/tenant), tenant_id?, provider, channel, credentials_enc, sender_id, status, priority, config_json` |
| `comm_routing_rules` | Router kuralları | `channel, category, country, tenant_id?, provider_account_id, priority, enabled` |
| `comm_templates` | Şablonlar (global + tenant override) | `tenant_id?, key(purpose), channel, locale, body, variants(ascii/unicode), provider_template_ref, status(approved/pending), category, has_url` |
| `comm_consents` | Opt-in/opt-out defteri | `tenant_id, customer_id, channel, category, status, source, evidence, ip, at` (silinmez; yalnızca yeni satır eklenir) |
| `comm_queue` | Kuyruk | `id, idempotency_key UNIQUE, tenant_id, payload, status, attempts, next_attempt_at, locked_at, last_error, dead_at` |
| `message_logs` | Her mesaj (brifteki alanlar) | `id, tenant_id, customer_id, channel, category, template_id, provider, provider_message_id, status, segments, error_code, delivered_at, read_at, failed_at, provider_cost, meta_cost, total_cost, tenant_billable_cost, currency, fx_rate, created_at` |
| `message_events` | Ham webhook olayları (denetim) | `message_id, provider, raw, normalized_status, received_at, signature_ok` |
| `usage_ledger` | Çift girişli kullanım defteri | `tenant_id, period, kind(sms/wa_utility/wa_marketing/wa_auth), delta, source(included/credit/overage), message_id?, balance_after` |
| `credit_wallets` + `credit_purchases` | Satın alınan SMS/WA kredisi | `tenant_id, balance, stripe_payment_id` |
| `price_book` | Sürümlü fiyat tablosu | `provider, channel, category, country, unit_cost, currency, valid_from` (fiyat değişince geçmiş log bozulmaz) |
| `tenant_comm_settings` | İşletme tercihleri | kanal-olay matrisi (hatırlatma→WA / SMS / ikisi / WA-başarısızsa-SMS), sessiz saat, sender adı |

Notlar:
- **Idempotency anahtarı:** `tenant + appointment_id + purpose + appointment_at` (aynı randevu hatırlatması iki kez gitmesin — bugünkü "wa_reminder" hatalarının dersi).
- **Aylık sıfırlama:** dönem (`period`) ledger'a yazılır; "reset" cron'u gerekmez, yeni dönemde bakiye yeniden hesaplanır.
- Maliyet alanları **ayrı**: `provider_cost`, `meta_cost`, `total_cost`, `tenant_billable_cost`. Abonelik geliri bu tablolara karışmaz; kâr = `tenant_billable_cost − total_cost` mesaj bazında görülür.
- Mevcut `plan_usage` (Mini) bu yapıya **sonra** taşınır; o zamana dek paralel çalışır ("açık geç" korunur).

---

## 6. Politika kuralları (Policy Engine)

1. **Kategori zorunlu.** `send()` kategorisiz çağrılamaz. Şablon kaydında kategori sabit.
2. **TRANSACTIONAL:** opt-in beklemez (hizmet gereği), ama müşterinin kanalı "durdur" dediyse (STOP/RET) saygı duyulur; kampanya içeriği taşıyamaz.
3. **PROMOTIONAL:** varsayılan **kapalı**. Şartlar: işletme İYS beyanı verdi + müşteri için `comm_consents` aktif + sessiz saat dışında + SMS ise **yalnızca BYO provider** + (WA ise) onaylı Marketing şablonu.
4. **URL koruması (`url-guard`):** SMS gövdesinde URL/alan adı tespiti (`https?://`, `www.`, `*.com/.tr` desenleri). Alıcı +90 ve provider `urlInSms != "ok"` ise → gönderme, WA'ya düş ya da şablonu reddet. Lint: URL'li SMS şablonu kaydedilemez.
5. **Sıra:** onay → URL → kota/kredi → sessiz saat → yönlendirme. Her ret kodu loglanır (`skipped_reason`) — sessizce yutma yok.
6. **Kota aşımı:** transactional **asla engellenmez** (randevu akışı bozulmaz — CLAUDE.md değişmez kuralı); aşım `overage` olarak ledger'a yazılır, işletmeye bildirilir, promosyonel/ek SMS durdurulabilir.
7. **Tenant izolasyonu:** her sorgu `tenant_id` ile; ledger/log/consent RLS'li; çapraz-kiracı testi (`tenant-isolation.mjs`) yeni tablolara eklenir.
8. KVKK: mesaj içeriği yurtdışı sağlayıcıya gider → aydınlatma/veri işleyen listesi ve sağlayıcı DPA'ları güncellenir.

---

## 7. Mesaj tasarımı

**SMS (URL'siz, kısa, ASCII varsayılan):**
```
ABC Guzellik: Randevunuz 12 Ekim Pzt 14:30, Ayse Hanim. Degisiklik icin 0212 xxx xx xx
ABC Guzellik: Randevunuz 12 Ekim Pzt 15:30'a alindi.
ABC Guzellik: 12 Ekim 14:30 randevunuz iptal edildi.
```
**WhatsApp (zengin):** tarih/saat, uzman, adres, konum bağlantısı (`/k/[slug]`), iptal/değiştir düğmesi.
**Kanal matrisi (işletme seçer):** `WA` · `SMS` · `WA + SMS` · `WA, başarısızsa SMS` (**önerilen varsayılan** — SMS maliyetini düşürür; "WA teslim edilmedi" webhook'u ile tetiklenir, gecikme süresi ayarlı).

---

## 8. Sağlayıcı değerlendirmesi

| Aday | SMS | WhatsApp | Notlar / açık sorular |
|---|---|---|---|
| **Plivo** | ~$0,0285–0,0288 | Utility ~$0,001 provider ücreti (+Meta) | Pilot A. İngiltere şirketi + TR Sender ID + transactional yazılı onay? |
| **Bird** | ~$0,0275 | Utility ~$0,0059 (+Meta) | Pilot B. Plivo'ya göre WA'da pahalı |
| **Twilio** | (fiyat teklifi) | var | ChatGPT'nin önerdiği; TR Sender ID ön kayıt ~2 hafta; promosyonel TR yasağı; ISV/end-customer şartları. **Aday listesine eklenmesini öneririm** |
| **Infobip** | kurumsal teklif | var | Yazılı uygunluk (UK Ltd + TR alıcı + SIRIPLAN + trans/promo) |
| **AWS End User Messaging** | var | — | Yedek transactional; TR Sender ID kısıtlarını doğrula |
| **Vonage** | — | Meta + platform ücreti | Kurumsal alternatif |
| **360dialog** | — | numara bazlı + Partner Platform | Faz 5: çok kiracılı WABA |
| **Meta Cloud (doğrudan)** | — | BSP ücreti yok | **Bugünkü yol; Faz 1 default adapter** |
| **BYO Netgsm/İletimerkezi/VatanSMS** | tenant'ın hesabı | — | **Promosyonel SMS'in tek yolu (öneri)** |

Seçim kriteri (ağırlıklı): teslim oranı & gecikme (pilot), yazılı uygunluk, Sender ID süreci, toplam maliyet (segment + kur), webhook kalitesi, API istikrarı, destek.

---

## 9. Yol haritası

> İlke (CLAUDE.md): mevcut mesajlaşma, randevu kaydı ve düzenleme akışları **aynı şekilde** çalışmaya devam etmeli. Bu yüzden önce gözlem, sonra taşıma; her gönderim yolu ayrı PR, geri alınabilir bayrakla.

### Faz 0 — Doğrulama (kod yok, ~1–2 hafta, paralel yürür)
- [ ] Sağlayıcılara **yazılı soru listesi** (§10) — Plivo, Bird, Twilio, Infobip, AWS.
- [ ] Netgsm: UK Ltd ile hangi kullanım serbest/yasak? (trial SMS B2B için hat kullanılabilir mi?) yazılı al.
- [ ] Mevcut gönderim envanteri (12 çağrı noktası) + her birinin kategorisi (trans/promo) tablosu.
- [ ] Hukuk: İYS, KVKK yurtdışı aktarım, Sender ID başvuru belgeleri (UK Ltd Companies House 17142392).
- [ ] Karar toplantısı: §11'deki sorular.

### Faz 1 — Temel (gözlem modu, davranış değişmez)
- Migration: `message_logs`, `message_events`, `usage_ledger`, `price_book`, `comm_*` tabloları + RLS + izolasyon testi.
- `comm/` iskeleti: tipler, `CommProvider` arayüzü, Policy Engine (kural motoru, henüz bloklamaz — **yalnızca loglar**).
- Adapter'lar: `meta-cloud` (mevcut WA kodunu sarar), `byo-netgsm|vatansms|iletimerkezi` (mevcut `sms.ts`).
- Mevcut gönderimler **gölge log** yazar (gönderimden sonra `message_logs` satırı) — gönderim yolu hâlâ eskisi.
- Çıktı: ilk kez mesaj bazlı teslimat/maliyet görünürlüğü.

### Faz 2 — Webhook + SMS pilotu
- Webhook gateway (imza doğrulama, idempotent, ham olay saklama); Meta delivered/read/failed, SMS DLR.
- Kuyruk (Postgres + `pg_cron`/QStash), retry/backoff/dead-letter; yalnızca **yeni** akışlar kuyruğa (ilk: SiriPlan→işletme trial bildirimi).
- **Plivo vs Bird (+Twilio opsiyonel) A/B pilotu:** aynı 200–500 transactional mesaj, ölç: teslim %, gecikme, Sender ID görünümü, hata oranı, gerçek segment maliyeti. Başarı eşiği önceden yazılır.
- Karar: birincil + yedek SMS sağlayıcısı; `price_book` gerçek değerlerle dolar.

### Faz 3 — Taşıma (strangler)
- Gönderim noktaları tek tek `comm.send()`'e geçer; her biri bayrak arkasında, önce iç kullanıcı/demo org, sonra %10→%100.
- Sıra (risk artan): trial-reminder → randevu iptal/değişiklik → onay → hatırlatma → kampanya.
- Davranış eşitliği testi: aynı girdi → aynı alıcı/içerik/zaman (tüm kanallar).
- `WA → başarısızsa SMS` fallback'i (ayarlı) açılır.

### Faz 4 — Kota, kredi, faturalama
- Plan kotaları (`plan_included_credits`) + ledger; aylık dönem mantığı; panelde kullanım kartı ("Bu ay 37/100 SMS").
- SMS/WA **kredi paketi** satın alma (Stripe tek seferlik; **test modunda doğrula** — yerelde canlı anahtar uyarısı).
- Admin panosu: tenant bazlı kullanım, `provider_cost` vs `tenant_billable_cost`, brüt kâr, anormal kullanım uyarısı.
- Mevcut `plan_usage` ledger'a taşınır.

### Faz 5 — Ölçek & WhatsApp SaaS
- Çok kiracılı WABA: Embedded Signup / Tech Provider / 360dialog Partner değerlendirmesi, işletme başına numara/profil.
- Sağlık kontrolü + otomatik failover (circuit breaker), bakiye alarmları, kuyruk izleme.
- Sender ID kayıt otomasyonu (`registerSender`) gerekiyorsa.

### Faz 6 — Promosyonel
- Yalnızca: işletme İYS beyanı + BYO SMS ya da WhatsApp Marketing + onay defteri + sessiz saat. Hiçbir sağlayıcıdan **yazılı onay** olmadan platform hattından SMS kampanyası açılmaz (brif şartı).

---

## 10. Sağlayıcı due-diligence soruları (Faz 0 — yazılı yanıt iste)

1. İngiltere'de kayıtlı şirket, **Türkiye alıcılara** SMS gönderebilir mi? Hangi şirket belgeleri (Companies House, vergi no, yetki mektubu) istenir? Süre?
2. Alphanumeric **SIRIPLAN** kaydı mümkün mü, ücret/süre/ret nedenleri? "18 Kasım 2026'dan sonra kayıtsız Sender ID engeli" doğru mu?
3. **SaaS/ISV modeli:** Biz adına birçok işletmeye mesaj atıyoruz; end-customer bildirimi/Sender ID gerekiyor mu? Hesap yapısı (subaccount)?
4. **Transactional** (randevu bildirimi) kapsamı yazılı olarak izinli mi? **Promosyonel** TR trafik için durum?
5. **URL kuralı (1 Nisan 2026):** URL'li SMS bloklanıyor mu, maskeleniyor mu; alan adı beyaz listesi var mı?
6. Segment/kodlama: Türkçe karakter Unicode segmenti nasıl faturalanıyor? Birim fiyat (TR, 1k/10k/100k hacim), kur ve minimum taahhüt?
7. Delivery receipt (DLR) güvenilirliği TR operatörlerinde (Turkcell/Vodafone/Türk Telekom)? Webhook imzası, tekrar deneme politikası?
8. WA için: Meta ücreti ayrı mı gösterilir? Marka/numara bağlama, template yönetimi API'si, çok kiracılı WABA desteği?
9. Rate limit, SLA, durum sayfası, destek kanalı; hesap askıya alma kriterleri.
10. Veri işleme: DPA, veri konumu, saklama süresi, KVKK/GDPR.

---

## 11. Karar bekleyen konular (senden)

1. **Promosyonel SMS = işletmenin kendi hesabı (BYO) — onaylıyor musun?** (Önerim: evet.)
2. **Tek `SIRIPLAN` Sender ID + gövdede işletme adı** mı, yoksa işletme başına ayrı marka adı mı?
3. **WhatsApp:** Faz 1–4'te Meta Cloud doğrudan kalsın, BSP'ye yalnızca Faz 5'te bakılsın — uygun mu?
4. **Dahil SMS kotası:** §4.5'teki daha düşük/fallback ağırlıklı sürüm mü, brifteki 100/300–500/1000 mü? (Pilot maliyetine göre revize.)
5. **Twilio**, aday listesine (Plivo/Bird/Infobip/AWS yanına) eklensin mi?
6. **Trial SMS'i (SiriPlan→işletme)**: URL'siz + WA/e-posta'ya taşıma (§4.8) kabul mü, yoksa Netgsm onayı gelene kadar mevcut metin mi?
7. **Zamanlayıcı:** `pg_cron + pg_net` mı, QStash/Inngest mi? (Vercel Hobby'den üst plana geçme niyeti var mı?)
8. Pilot bütçesi ve süresi (örn. ilk 30 gün, ~$50–100 test kredisi).

---

## 12. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Sağlayıcı TR transactional'ı da kısıtlar | SMS kanalı çalışmaz | Router + WA birincil + BYO yedek; Faz 0 yazılı onay |
| URL'li SMS bloklanır | Hatırlatma ulaşmaz | url-guard + URL'siz şablon + WA |
| Çift gönderim (idempotency yok) | Müşteri çift SMS/WA, ek maliyet | Idempotency anahtarı + UNIQUE |
| Taşıma sırasında mesaj kaybı | Randevu iletişimi bozulur | Gölge mod → bayrak → kademeli geçiş; "açık geç" |
| Kur dalgalanması | SMS/WA marjı erir | `price_book` sürümlü + `fx_rate` kayıt + aylık fiyat güncelleme |
| Kredi/Stripe hatası | Yanlış tahsilat | Önce test modu; ledger denetim cron'u |
| Çapraz-kiracı sızıntı | Ciddi güvenlik | RLS + izolasyon testi + sırlar şifreli |
| İYS/KVKK ihlali | Hukuki | Promosyonel kapalı varsayılan, onay defteri, ToS'ta rol ayrımı |

---

## 13. Başarı ölçütleri

- Teslim oranı ≥ %97 (SMS transactional, TR), medyan gecikme < 10 sn.
- Mesajların %100'ü `message_logs`'ta; ≥ %99'unda nihai durum (delivered/failed) var.
- Mesaj başına gerçek maliyet ve brüt kâr panoda görünür.
- Sağlayıcı değiştirme = router kuralı güncellemesi (iş kodu değişmeden).
- Migrasyonda regresyon: randevu/hatırlatma/iptal bildirimlerinde davranış farkı **0**.
