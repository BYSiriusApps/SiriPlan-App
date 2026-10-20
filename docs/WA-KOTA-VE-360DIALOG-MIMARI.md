# WhatsApp Mesaj Kotaları, Ek Krediler ve 360dialog Altyapısı

Durum: **Kodda hazır; migration uygulanıp env'ler girilene kadar mevcut davranış aynen sürer.**
Brief: "SiriPlan — WhatsApp Kota, Ek Paket ve 360dialog Geçiş Brief'i" (Google Doc).

## 1. Temel ilke

Tüm WhatsApp bildirimleri (müşteri + personel/sahip) ve kampanyalar **SiriPlan'ın kendi numaralarından** gider.
İşletmenin kendi Meta hesabı yalnızca AI asistanı (gelen mesaj) için kullanılır; **tek istisna:** kampanya hattı
tanımsızken eski serbest-metin kampanya akışı (işletmenin kendi `wa_token`'ı) aynen çalışır.

İki **hat**, her biri ayrı ayrı iki **sağlayıcıdan** biriyle çalışır (`src/lib/wa-line.ts`):

| Hat | Ne gönderir | Meta (varsayılan, bugünkü) | 360dialog |
|---|---|---|---|
| `utility` | randevu onay/hatırlatma/iptal/revizyon/yeni saat + personel-sahip bildirimleri | `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` | `WHATSAPP_360_API_KEY` |
| `marketing` | kampanya (ayrı numara) | `WHATSAPP_CAMPAIGN_TOKEN` + `WHATSAPP_CAMPAIGN_PHONE_ID` | `WHATSAPP_CAMPAIGN_360_API_KEY` |

Sağlayıcı seçimi: `WHATSAPP_UTILITY_PROVIDER` / `WHATSAPP_CAMPAIGN_PROVIDER` = `meta` | `360dialog` (boş = `meta`).
Seçilen sağlayıcının kimlik bilgisi eksikse hat "tanımsız" sayılır ve mevcut `whatsapp_not_configured` davranışı çalışır.
**Geri alma = env'i `meta` yapmak (kod değişikliği yok).** Gövde (Cloud API) iki sağlayıcıda aynıdır; 360dialog'da numara
API anahtarına bağlıdır, `phone id` gerekmez. İsteğe bağlı: `WHATSAPP_360_BASE_URL` (varsayılan `https://waba-v2.360dialog.io`).

## 2. Kotalar (kod: `entitlements.ts` → `WA_UTILITY_QUOTAS`)

| Plan | Dahil aylık UTILITY | Not |
|---|---|---|
| Deneme | 100 | brief: deneme ayrı düşük tavan |
| Mini | 400 | (önceki 200) |
| Starter | 500 | |
| Pro | 1.500 | |
| Business | 3.000 | brief'te yoktu; Pro×2 önerildi |

- **Kampanya (marketing) mesajı plana dahil değil.** Yalnızca satın alınan kampanya kredisiyle gider. Kampanya *modülü* ve
  mevcut hak (Starter ayda 1 kampanya, Pro sınırsız) **değişmedi**; yalnızca WhatsApp kampanya *mesajı* kredili. SMS kampanyası
  ve kendi hesabından gönderim etkilenmez.
- **Kota dolunca davranış:** önce ek utility kredisi düşer; yoksa mesaj gönderilmez, **randevu yine kaydedilir**.
- **Kesinti TÜM planlarda varsayılan olarak açık** (karar 14 Eki: yalnızca 2 gerçek müşteri var). `WA_QUOTA_ENFORCE_PLANS` yalnızca
  daraltmak içindir (virgüllü liste; ör. `mini` = yalnızca Mini keser, diğerleri sadece sayılır; boş string = hiçbir planda kesme).
  Kesinti yalnızca otomatik WhatsApp mesajını durdurur; **randevu kaydı her zaman sürer**.
- Personel/sahip bildirimleri kotaya **sayılmaz** (yalnızca müşteri randevu mesajları); maliyeti SiriPlan taşır.
- Kampanya alıcı üst sınırı: tek kampanyada 500 (`CAMPAIGN_RECIPIENT_LIMITS`; gönderim sıralı olduğundan sunucu süresi için).

## 2b. Yenilenme: abonelik başlangıç yıldönümü

Kota **takvim ayında değil**, aboneliğin başladığı günün/saatin aylık yıldönümünde yenilenir (`src/lib/wa-cycle.ts`, saf fonksiyon, birim testli):
yıllık planda da aylık; ay sonu taşması kıstırılır (31 Ocak → 28 Şubat → 31 Mart); yükseltmede Stripe çıpası "şimdi"ye kaydığı için yeni dönem yükseltme anından başlar.
Ek kredi bakiyesi dönemler arası **devreder**. Panelde (Abonelik/Hesabım/Ayarlar) "yenilenme tarihi" bu döngüden gelir.

## 3. Veritabanı (`supabase/migrations/20261017_wa_message_quotas.sql`)

Geri uyumlu, idempotent; yalnızca yeni tablo/fonksiyon. Tüm tablolarda **RLS açık + politika yok**, fonksiyonlar
`SECURITY DEFINER` + **yalnızca `service_role`** çalıştırır (bir kiracı kendi/başkasının bakiyesini okuyamaz-yazamaz-tüketemez).

- `org_message_cycle(org_id, anchor)` — abonelik döngüsü çıpası (Stripe `billing_cycle_anchor`; yükseltmede "şimdi"ye kayar). Webhook yazar (`customer.subscription.updated`, checkout tamamlanınca); kayıt yoksa uygulama Stripe'tan **bir kez** okuyup doldurur (mevcut aboneler için geri doldurma gerekmez), deneme için bitişten 14 gün önce, hiçbiri yoksa takvim ayına düşer.
- `org_message_usage(org_id, period, utility_used, marketing_used, utility_quota, last_reset)` — dönem sayacı; `period` = dönem başlangıcının UTC tarihi (yeni dönem = yeni satır = sıfırlama).
- `org_message_addons(org_id, utility_balance, marketing_balance)` — ek krediler (aya göre sıfırlanmaz, devreder).
- `org_message_purchases(stripe_session_id PK, …)` — satın alma kaydı; **idempotency = Stripe oturum id** (webhook tekrarında çift yükleme yok).
- `consume_wa_utility(org, quota, enforce, period)` → `plan | addon | plan_over | exceeded` (satır kilidiyle atomik, çift sayım yok)
  / `release_wa_utility(org, source, period)` / `consume_wa_marketing(org, period)` / `release_wa_marketing(org, period)` / `add_wa_credits(...)`.

Altyapı hatasında (migration yok / geçici DB hatası) **utility açık geçer** (mesaj engellenmez); **kampanya kredisi açık geçmez**
(maliyet kalemi, emin olunamıyorsa gönderilmez).
Eski `plan_usage` (`wa_message`, `campaign_wa_message`) artık kullanılmıyor; `campaign` (Starter ayda 1) aynen sürüyor.
Not: geçişte Mini'nin bu ayki eski sayacı sıfırdan başlar (lehine).

## 4. Satın alma (Stripe, tek seferlik — SMS kontörüyle aynı model)

Katalog: `src/lib/wa-credit-packs.ts`. Kredi adedi yalnızca sunucudaki katalogdan gelir.

| Paket | id | Kredi | TRY | USD (öneri) | EUR (öneri) | Stripe env |
|---|---|---|---|---|---|---|
| Ek utility | `u500` | 500 | 400 | 8 | 7 | `STRIPE_PRICE_WA_UTILITY_500` |
| Ek utility | `u1000` | 1.000 | 800 | 16 | 14 | `STRIPE_PRICE_WA_UTILITY_1000` |
| Kampanya | `m500` | 500 | 760 | 15 | 13 | `STRIPE_PRICE_WA_CAMPAIGN_500` |
| Kampanya | `m1000` | 1.000 | 1.500 | 30 | 26 | `STRIPE_PRICE_WA_CAMPAIGN_1000` |
| Kampanya | `m2500` | 2.500 | 3.800 | 76 | 66 | `STRIPE_PRICE_WA_CAMPAIGN_2500` |

TRY brief'ten; **USD/EUR ≈ TRY/50 benim önerimdir** — Stripe Price'taki `currency_options` ile **birebir** aynı olmalı (panel etiketi katalogdan).
Akış: `POST /api/stripe/wa-pack` (mobil app'te kapalı, yalnızca sahip/yönetici, mesafeli satış onayı zorunlu, kampanya paketleri yalnızca
kampanya modülü açık planlarda) → Checkout `payment` → `api/webhooks/stripe` (`kind=wa_pack`; ödeme alındıysa + customer eşleşiyorsa
`add_wa_credits`; hata 500 → Stripe yeniden dener).

## 5. Panel

- **Ayarlar → Abonelik:** `WaUsageCard` — kullanılan/kalan, ek bakiye, kampanya kredisi, yenilenme tarihi, satın alma (yalnızca web).
- **Hesabım** (sahip/yönetici): aynı kartın özeti. **Ayarlar** (sahip/yönetici): kompakt özet + abonelik sayfasına bağlantı (`/api/wa-usage`, org oturumdan alınır).
- Native uygulamada satın alma/fiyat yüzeyi **render edilmez**; yalnızca bilgi.
- i18n: `dashboard.waUsage` (tr/en/ru/ar/de/es). Plan metinleri ve sunum/kılavuz/asistan bilgisi güncellendi.
  **Sunuma ek paket FİYATI yazılmadı** (yalnızca "dahil X mesaj" + "ihtiyaç halinde ek paket").

## 6. 360dialog geçiş runbook'u (kod hazır; sizin adımlarınız)

1. 360dialog hesabı + numara (utility için mevcut numarayı taşıma talebi; kampanya için ayrı numara olabilir). Doğrulama takibi (Case 29013474461597889) için 360dialog önceliği isteyin.
2. Numara başına **API anahtarı** alın → Vercel: `WHATSAPP_360_API_KEY` (utility) ve/veya `WHATSAPP_CAMPAIGN_360_API_KEY` (kampanya).
3. Şablonlar numaranın WABA'sında **onaylı olmalı** (utility şablonları + 12 kampanya şablonu; adlar aynı kalır). Taşıma sonrası kontrol edin.
4. 360dialog Hub'da webhook URL'si: `https://siriplan.com/api/webhooks/whatsapp-360` + header `x-siriplan-webhook-secret: <gizli>`
   (header olmazsa `?secret=<gizli>`). Gizli: `WHATSAPP_360_WEBHOOK_SECRET` (utility numara), `WHATSAPP_CAMPAIGN_360_WEBHOOK_SECRET` (kampanya numarası). Tanımsızsa uç **fail-closed**.
   Bu uç yalnızca pazarlama **RET/STOP**'unu işler (tüm işletmelerde onayı geri çeker, aynı numaradan teyit gönderir); başka otomatik yanıt vermez.
5. Önce **küçük test**: `WHATSAPP_UTILITY_PROVIDER=360dialog` → demo org'da (test numaralarına) onay/hatırlatma/iptal; sonra kampanya hattı.
6. Sorun olursa `WHATSAPP_UTILITY_PROVIDER=meta` (anında geri dönüş, redeploy yeterli).

## 7. Yayına alma sırası

1. `20261017_wa_message_quotas.sql`'i SQL Editor'de çalıştır (tekrar çalıştırılabilir). **Kodu deploy etmeden önce** uygulanması önerilir
   (yoksa Mini'nin 400 sınırı geçici olarak uygulanmaz — açık geçer).
2. Stripe'ta 5 Price + env'ler (§4). Fiyatlar girilmeden panel satın alma düğmesi "fiyat tanımlı değil" hatası verir (başka hiçbir akış etkilenmez).
3. Deploy. Bu noktada: kota tüm planlarda uygulanır, yenilenme abonelik yıldönümüne göre, kampanya hattı env'siz = eski akış.
4. Mevcut abonelerin çıpası ilk mesajda Stripe'tan otomatik okunur (STRIPE_SECRET_KEY canlıda tanımlı olmalı). İsterseniz ilk günlerde `org_message_cycle` tablosunu kontrol edin.
5. Kampanya hattını açmak için §6 veya Meta ayrı numara env'leri.

## 8. Test edilenler

- Migration iki kez çalıştırıldı (idempotent) ve 38 senaryo PGlite'ta geçti (dönem geçişinde sayaç sıfırlanır/ek kredi devreder dahil): atomik tüketim, plan→addon→exceeded sırası,
  `enforce=false` ile sayma, release, idempotent satın alma, kampanya kredisi, geçersiz girdiler, **anon/authenticated fonksiyon ve tabloya erişemez**, service_role çalışır.
- `wa-cycle`: 10 senaryo (yıldönümü öncesi/sonrası, ay sonu kıstırma, artık yıl, yıl geçişi, çıpa yok/gelecek → takvim ayı).
- `wa-line`: env yokken `null`; Meta varsayılanı bugünkü URL/başlıkla birebir; 360dialog başlığı; geri alma.
- 360 webhook yetkisi: gizli yok/yanlış → 401, doğru → 200.
- **Test edilmedi:** Meta/360dialog'a gerçek gönderim, Stripe test ödemesi, canlı migration.

## 9. Bilinen / açık noktalar

- Kampanya gönderimi hâlâ tek istekte sıralı; 500 alıcı sunucu süresine yakın olabilir → kuyruk/gruplu gönderim ayrı iş.
- İndirimli kampanya şablonu serbest mesaj metnini taşımaz (yalnızca indirim özeti + geçerlilik).
- Mini'de kampanya modülü kapalı (`feature_campaigns=false`); brief "Mini: ek paket" diyor — Mini'ye modül açmak ayrı karar. Kampanya paketi yalnızca modülü açık planlara satılır.
- Mevcut `consume_plan_usage` / `consume_sms_credit` fonksiyonları PUBLIC'ten REVOKE'lu (doğrulandı); yeni fonksiyonlar aynı kalıbı izler.
- Pro 2.500 TL (brief) ≠ kod/sunum 1.699 TL: **fiyatlara dokunulmadı** (karar: mevcut fiyatlar kalsın).
