# Ek Paketler: Ek Şube + AI Asistan (WhatsApp/Instagram)

Durum: **Faz 1 (altyapı) kodda, env'ler boşken tamamen devre dışı.** Faz 2 (arayüz + şube oluşturma) yazılmadı.

## 1. Fiyat önerisi

Mevcut: Mini 399₺/14$/13€ · Starter 1199₺/29$/26€ · Pro 1699₺/39$/33€ · Business 4699₺/99$/84€ (yıllık ≈ 9,84 ay).

| Paket | Aylık TRY | Aylık USD | Aylık EUR | Yıllık TRY | Yıllık USD | Yıllık EUR |
|---|---|---|---|---|---|---|
| **Ek Şube** (şube başı, adet) | 799 | 19 | 17 | 7.862 | 187 | 167 |
| **AI Asistan** (WA + IG/Messenger) | 999 | 24 | 21 | 9.830 | 236 | 207 |

Gerekçe:
- **Ek şube $19:** Tam Starter ($29) fiyatı olsaydı zincir işletme her şubeye ayrı hesap açardı. Pro + 3 ek şube = $96, Business ($99; AI + API + 5 şube dahil) ile neredeyse eşit: 4+ şubede Business doğal yükseltme olur.
- **AI $24:** Marjinal maliyet çok düşük (Gemini Flash yanıtı ≈ kuruş altı; IG DM ve 24 saat penceresi içindeki WA yanıtları Meta'da ücretsiz). Fiyat değer bazlı. Starter+AI = $53, Pro+AI = $63, Business $99 → Business'a geçiş teşviki korunur.
- **Uygunluk:** AI paketi Starter ve Pro'ya; Mini hariç (tek kişilik, 200 WA mesaj sınırlı plan), Business zaten içerir. Ek şube Starter/Pro/Business'a.
- **Adil kullanım (öneri):** AI için ayda ~1.000 yanıt. Kodda henüz sınır yok (Faz 2).
- Alt seçenek: AI'yı 19$ yaparsan çapraz yükseltme hâlâ çalışır ama değer algısı düşer; 29$ (eski site metni) Starter'da faturayı ikiye katlar.

## 2. Stripe'ta oluşturulacaklar

İki **Product**, her birinde aylık + yıllık **recurring Price**. Her Price'a TRY/USD/EUR `currency_options` ekle (plan fiyatlarıyla aynı yöntem; yoksa kod varsayılan para birimine düşer).
- Ek Şube: Price "per unit" (adet çarpılır, Checkout'ta 1-20 arası ayarlanır).
- Env'ler (Vercel + `.env.local`):
  `STRIPE_PRICE_BRANCH_MONTHLY`, `STRIPE_PRICE_BRANCH_ANNUAL`, `STRIPE_PRICE_AI_MONTHLY`, `STRIPE_PRICE_AI_ANNUAL`
- Stripe webhook endpoint'ine **`customer.subscription.created`** olayını ekle (diğerleri zaten açık).
- Müşteri Portalı: bu iki ürünü "abonelik iptali" için izinli bırak; plan değiştirme listesine **ekleme**.

## 3. Mimari (Faz 1: kodda)

- **Ayrı abonelik.** Ek paket, plan aboneliğine kalem eklenmez; kendi Stripe aboneliğidir. Çünkü checkout/change-plan/webhook `organizations.stripe_subscription_id` ve aboneliğin ilk kalemine dayanır. Ayrı abonelikte plan akışı değişmez.
- **Durum tablosu `org_addons`** (migration `20261012_org_addons.sql`): `ai_assistant`, `extra_branch_slots`, abonelik ID'leri. RLS açık, politika yok → yalnızca service_role yazar/okur (SMS kontörüyle aynı model). `organizations` kolonu kullanılmadı çünkü plan değişimi `feature_*` kolonlarını yeniden yazıp paketi silerdi.
- **`feature_ai` köprüsü.** AI paketi `organizations.feature_ai`'ye yansıtılır (`recomputeFeatureAi`: Business VEYA paket). WA/IG webhook'ları ve panel bu kolonu zaten okuyor, hiçbiri değişmedi. `applyPlanToOrg` plan değişince paketi korur.
- **Webhook ayrımı** (`api/webhooks/stripe`): `checkout.session.completed`, `subscription.created/updated/deleted` olaylarında ek paket aboneliği (metadata `kind=addon` veya bilinen Price ID) **plan mantığına hiç girmez**. Bu olmasaydı: paket iptali işletmeyi `trial`'a düşürür, paket aboneliği `subscription_status`'u ezer, checkout `stripe_subscription_id`'yi değiştirirdi. Eski bir aboneliğin silinme olayı yenisini kapatmaz (kayıtlı ID eşleşmesi).
- **Satın alma ucu** `POST /api/stripe/addon` `{addon, annual, quantity?}`: native uygulamada kapalı, sahip/yönetici, yalnızca ödenen Starter/Pro/Business planına, aynı paketten ikinci abonelik 409, Price env boşsa 503.

Etkisiz kalan akışlar: plan satın alma, plan değiştirme, iptal, SMS paketi, mesajlaşma, randevu kaydı: dosyalarına dokunulmadı (yalnızca `apply-plan.ts`te paket yokken sonuç eskisiyle aynı).

## 3b. Faz 2 (kodda): şube akışı + arayüz

Karar: **yarı otomatik.** Ödeme → hak (slot) otomatik; sahip web panelinde "Şube Aç" ile kendi şubesini açar. Webhook'ta otomatik org oluşturulmaz (ad/bilgi yok, tekrar gelen olayda çift kayıt riski).
- Migration `20261013_org_branches.sql` (**`20261012_org_addons.sql`'den SONRA** çalıştır): `org_branches` + atomik `claim_branch_slot`.
- `POST /api/branches`: yalnızca ana işletmenin sahibi, yalnızca web. Şube ayrı org (RLS aynen), sahip olarak eklenir, hizmetler tohumlanır, plan alanları kopyalanır (Stripe kimlikleri kopyalanmaz).
- `lib/branches.ts`: `syncBranchesFromParent` plan değişimi / plan iptali / hak değişiminde şubelere planı yansıtır. Hak sayısını aşan şubeler (en yeniden başlayarak) salt-okunur kilitlenir, veri silinmez.
- Şube kendi aboneliğini açamaz (`/api/stripe/checkout` şubede 409).
- Arayüz `/dashboard/abonelik` altında `AddonsPanel`. **Native uygulamada satın alma, fiyat ve şube açma formu render edilmez**; uçlar sunucuda da mobil uygulamayı reddeder. Yalnızca aktif paket durumu görünür.
- Elle şube (admin): `insert into org_branches (branch_org_id, parent_org_id) values (...)` + `org_addons.extra_branch_slots` ayarı; ardından bir plan değişimi/sync tetikler. Hak vermek için: `insert into org_addons (org_id, extra_branch_slots) values ('<org>', 2) on conflict (org_id) do update set extra_branch_slots = 2;`

## 4. Kalanlar (satışa açmadan ÖNCE)

1. **Plan iptalinde paketleri de kapat.** `cancel-subscription` yalnızca plan aboneliğini iptal eder; paket faturalanmaya devam eder. İptal ve `account/delete` akışlarında paket abonelikleri de `cancel_at_period_end` yapılmalı.
2. **Ek şube = ayrı organizasyon** (veri izolasyonu/RLS aynen kalır). `org_branches(branch_org_id, parent_org_id)` + "Şube ekle" ucu: sahip, `org_addons.extra_branch_slots`'u aşan sayıda şube açamaz; yeni org aynı sahibe `org_members` ile bağlanır; plan/özellikleri ana org'dan miras alır (`applyPlanToOrg` sonrası senkron, ana org dışında abonelik yok). Business için 5 şube sınırı da burada uygulanır (bugün yalnızca pazarlama metni, kodda yok).
3. **Arayüz:** `/dashboard/abonelik` içinde paket kartları + durum; `AddonsSection`/`fiyatlar` "Bilgi Al" formu yerine fiyat ve satın al; `messages/*.json` `addons.*.price` metinleri (şu an $29) yeni fiyatlarla; `pricing.ts`'e `ADDON_PRICING_BY_CURRENCY` ve `pricingSummaryForAssistant` güncellemesi (sohbet botu yanlış fiyat söylemesin).
4. **AI adil kullanım sayacı** (ayda ~1.000 yanıt, `consume_plan_usage` deseni).
5. Admin panelinden elle plan değişimi (`api/admin/orgs/[id]`) `feature_ai`'yi doğrudan yazar; orada `recomputeFeatureAi` çağrılmalı.
6. Meta tarafı: AI paketinin çalışması için işletmenin WA/IG bağlantısı (`ig_page_id`/token) gerekir; bağlama arayüzü zaten ayarlarda.

## 5. Test sırası (Stripe test modu, canlı anahtar yok)

1. Migration'ı SQL Editor'de çalıştır → test Price ID'leriyle env ver.
2. Test hesabında Starter satın al → `/api/stripe/addon` ile AI al → `org_addons.ai_assistant=true`, `organizations.plan` ve `stripe_subscription_id` **değişmemiş**, `feature_ai=true`.
3. Planı Pro'ya değiştir → `feature_ai` true kalmalı.
4. Paketi Stripe'tan iptal et → `ai_assistant=false`, plan aynı, `feature_ai=false`.
