# Kampanya Mesaj Paketi — Uygulama ve Güvenlik Planı (TASLAK)

**Tarih:** 2026-10-06 · **Durum:** Tasarım — kod yazılmadı, Meta şablonları PENDING.
**Değişmez kurallar** ([CLAUDE.md](../../CLAUDE.md)): kiracılar arası veri sızmaz; güvenlik kritik yollar gevşetilmez; randevu bildirimleri ve mevcut kampanya akışı (salonun kendi hesabı) **bozulmaz**; izin kutucukları/butonlar aynen çalışır.
**İlgili:** [Hukuki Değerlendirme](./KAMPANYA-PAKETI-HUKUKI-DEGERLENDIRME.md) · [Ek Sözleşme](./KAMPANYA-PAKETI-EK-SOZLESME.md) · [Salon Bilgilendirme](./KAMPANYA-PAKETI-SALON-BILGILENDIRME.md)

---

## 0. Temel ilke: mevcut akışa DOKUNMA

Yeni gönderim yolu **ayrı bir fonksiyon/kanal** olarak eklenir (`campaign-send-platform.ts`, yeni). `campaign-send.ts` içindeki salonun kendi hesabından giden yol değişmez. Salon seçimi: kampanyada `send_via = 'own' | 'siriplan'` (varsayılan `own`). Paket yoksa/etkin değilse `siriplan` sunucuda reddedilir.

## 1. Tespit edilen mimari gerçekler (koddan)

| Bulgu | Etki |
|---|---|
| `campaign-send.ts` salonun `wa_token/wa_phone_number_id`'siyle **serbest metin** gönderiyor | 24 saat penceresi dışında Meta reddeder → şablon şart |
| Platform şablonları (`send.ts`) `WHATSAPP_TOKEN/WHATSAPP_PHONE_ID` ile randevu numarasından gidiyor | Pazarlama **kesinlikle** bu env'den gönderilmemeli; ayrı env: `WHATSAPP_MARKETING_TOKEN`, `WHATSAPP_MARKETING_PHONE_ID`, `WHATSAPP_MARKETING_WABA_ID` |
| `consumePlanUsage` / `releasePlanUsage` atomik sayaç mevcut (`wa_message`, `campaign`) | Kredi için yeniden kullanılabilir veya ayrı `marketing_credit` tipi |
| `isMarketingOptOut` yalnızca Latin "RET/STOP/DUR…" tanıyor | RU/AR dipnotları Latin "STOP" ile yazıldı; Kiril/Arapça serbest ret metni de ayrıca tanınmalı |
| Gelen webhook `org`'u alıcının telefonundan/ numara kimliğinden çözüyor (salon WABA) | Ortak numarada gelen "RET"in **hangi salona** ait olduğu bilinemez → ortak ret listesi |

## 2. P0 — Yayın öncesi ZORUNLU kontroller (güvenlik/hukuk)

**Yetkilendirme ve plan kapıları (sunucu tarafı):**
- [ ] Gönderim API'si oturumdan `org_id` alır, istemciden gelen `org_id`'ye asla güvenmez.
- [ ] Yalnızca `manage_campaigns` izni olan owner/manager (mevcut izin mantığı korunur); personel izni gevşetilmez.
- [ ] `siriplan` kanalı için sunucuda: paket etkin mi, sözleşme kabul kaydı var mı, kredi yeterli mi. **İstemci gizlemesi tek başına yeterli değil** (bkz. pro-feature-gating dersi).
- [ ] Salon kimliği her sorguda `org_id` + RLS kapsamlı; kampanya logları/sonuçlar başka salona görünmez.

**Onay ve alıcı seçimi:**
- [ ] Alıcılar yalnızca `resolveCampaignRecipients(supabase, org_id, …)` ile gelir; `marketing_consent = true` filtresi **sunucuda** zorunlu, istemci filtresi sayılmaz.
- [ ] **Ortak ret listesi (suppression) kontrolü** her gönderimden hemen önce (bkz. §4).
- [ ] Alıcı başına sıklık tavanı (örn. 30 günde en çok 2 pazarlama iletisi, tüm salonlar toplamı).
- [ ] Gönderim penceresi (örn. TR 09:00–21:00); dışındaki planlı kampanya ertelenir.

**Para/kötüye kullanım:**
- [ ] **Ön ödemeli kredi**; kredi 0 ise gönderim durur (artık borç/yan etki yok). Kredi düşümü Meta çağrısından ÖNCE atomik; reddedilirse iade.
- [ ] Kampanya başına alıcı tavanı, günlük hesap tavanı, yeni hesap/yeni paket "ısınma" limiti.
- [ ] Rate limit + eşzamanlı gönderim kilidi (aynı kampanyanın iki kez gitmesi engellenir; mevcut `status` geçişi atomik yapılmalı).
- [ ] Salon kimlik doğrulaması zayıf (yeni kayıt, doğrulanmamış e-posta/telefon) ise paket etkinleştirilemez.

**İçerik güvenliği:**
- [ ] Yalnızca onaylı şablon adları; şablon adı istemciden serbest metin alınmaz (allowlist).
- [ ] Parametreler: tek satır (`\n`/sekme temizlenir), azami uzunluk (örn. 200), kontrol karakteri/bidi enjeksiyon temizliği; bağlantı **izin listesi** (salonun `/r/{slug}` vitrini; 3. taraf/kısaltılmış bağlantı engeli).
- [ ] KKP yasak kelime/kalıp ön denetimi (bahis, yatırım vaadi, tıbbi garanti…) → şüpheliyse "inceleme bekliyor".
- [ ] AR parametrelerde yön izolasyonu (FSI/PDI) — mevcut RU/AR randevu şablonlarındaki yöntem aynen.

**Sızıntı ve gizlilik:**
- [ ] Marketing token/ID yalnızca sunucu env'inde; istemciye/log'a/hata mesajına çıkmaz. Meta hata gövdeleri salona ham gösterilmez (hesap bilgisi sızabilir).
- [ ] Ortak ret listesinde ham telefon yerine **HMAC-SHA256 (sunucu sırrıyla) hash**; hangi salonun ilettiği bilgisi salonlara açılmaz.
- [ ] Gelen mesaj webhook'u (pazarlama numarası) **ayrı uç** (`/api/webhooks/whatsapp-marketing`), imza doğrulaması (`META_APP_SECRET`) zorunlu, org'a bağlı veri döndürmez.
- [ ] Yeni tablolar için RLS: salon yalnızca kendi satırlarını görür; `anon` rolü kapalı (Ağustos kilitlemesinin devamı).

## 3. Veri modeli (öneri)

| Tablo | Amaç | Not |
|---|---|---|
| `marketing_packages` | org başına paket durumu, etkinleştirme zamanı, kabul eden kullanıcı, sözleşme sürümü | RLS org; yazma yalnızca sunucu |
| `marketing_credits` | kredi bakiyesi + hareket defteri (satın alma, kullanım, iade) | Defter append-only; bakiye atomik fonksiyonla |
| `marketing_suppression` | `phone_hash`, `source`, `created_at`, `reason` | Org'dan bağımsız (ortak ret); salonlara görünmez, yalnızca sunucu |
| `marketing_send_log` | org_id, campaign_id, phone, template, durum, Meta mesaj id, hata kodu | RLS org |
| `package_terms_acceptance` | kullanıcı, org, sürüm, IP/UA hash, zaman | Delil niteliği |

`campaigns.send_via` kolonu; mevcut `campaign_logs` aynen kalır.

Migration'lar yazıldığında **canlıda otomatik çalışmaz** — mevcut kurala göre elle SQL Editor'e uygulanır (bkz. migration-apply-state).

## 4. Ortak numarada ret (opt-out) tasarımı

Sorun: müşteri Siriplan pazarlama numarasına "RET" yazdığında hangi salon olduğu belli değil.

**Önerilen çözüm (iki katman):**
1. **Numara bazlı ortak bastırma:** "RET/STOP/…" geldiğinde telefonun hash'i `marketing_suppression`'a yazılır ve **o numaradan tüm salonlar için** pazarlama durur. Müşteri için en güvenli yorum; hukuken muhafazakâr.
2. **Salon müşteri kaydının güncellenmesi:** son N günde bu telefona gönderim yapan salon(lar)ın `customers.marketing_consent=false` + `customer_consents` denetim kaydı (mevcut `recordMarketingOptOut` mantığı; `org_id` kapsamını `marketing_send_log`'dan alır, rastgele org'a yazmaz).
3. Teyit mesajı: "Pazarlama mesajlarını artık almayacaksınız." (serbest metin, 24 saat penceresi içinde; müşteri yeni yazdığı için açık).
4. Şablon v2'de **QUICK_REPLY "Durdur" butonu** düşünülür (buton payload'ına gönderim kimliği → salon eşleşmesi kesinleşir). Mevcut 12 şablonda buton yok; v2 gerekirse yeni şablon adı + yeniden onay.

Kiril ("СТОП") ve Arapça ("إيقاف") ret kelimeleri `isMarketingOptOut` kümesine **eklenmeli** (mevcut davranışı daraltmaz, genişletir).

## 5. Numara ve kalite yönetimi

- Pazarlama numarası, randevu numarasından **ayrı WABA/telefon kimliği**; ayrı token.
- Meta `phone_number_quality_update` / `message_template_status_update` webhook'ları: kalite RED/YELLOW'da **otomatik duraklatma** + sahibine bildirim.
- Şikâyet/ret oranı eşiği (örn. kampanyada %2 ret/engel) aşılırsa kampanya durdurulur, salona uyarı.
- Meta mesajlaşma limiti (tier) aşımı için kuyruk/ertelenmiş gönderim; kısmi başarısızlık durumunda krediler iade.

## 6. Faturalama

- Salon → paket (abonelik eklentisi) + kredi paketleri (tek seferlik). Stripe canlı anahtar uyarısı geçerli: **önce test modunda** denenir (bkz. stripe-no-staging-live-keys-local).
- Fiyat = Meta Marketing konuşma ücreti (TR) + marj + numara gideri; **sabit fiyat belirlemeden önce Meta güncel tarifesi doğrulanmalı**.
- KDV/fatura yapısı avukat/mali müşavir görüşüyle (Hukuki Değerlendirme §4.8).

## 7. Test planı

1. Birim: param temizleme, ret kelimeleri (4 dil), kredi atomikliği, sıklık tavanı, gönderim penceresi.
2. Entegrasyon (test numarası): onaysız müşteri hariç; ret sonrası tekrar gönderim engeli; iki salon aynı numaraya gönderince ret her iki salon için geçerli.
3. **Kiracı izolasyonu:** `tenant-isolation.mjs` benzeri test — salon A, salon B'nin kampanya/log/ret verisini göremez; ortak liste hash'i salona dönmez.
4. Yetki: personel (izinsiz) gönderemez; paketsiz salon `siriplan` kanalını API'den seçemez (403).
5. Hata: Meta reddi → kredi iadesi; çift tıklama → çift gönderim yok.
6. Mevcut akış regresyonu: `own` kanalı ve randevu bildirimleri aynen çalışıyor.

## 8. Uygulama sırası

1. Şablonlar APPROVED (bekleniyor) → 2. avukat görüşü (paralel) → 3. ayrı numara + Meta doğrulaması → 4. veri modeli + RLS (migration) → 5. `campaign-send-platform.ts` + yetki kapıları → 6. ret webhook + ortak liste → 7. kredi/faturalama (test modu) → 8. aktivasyon ekranı + 4 dil metin → 9. testler → 10. sınırlı pilot (1–2 salon) → 11. genel açılış.

## 9. Takip tablosu

| # | Madde | Sahip | Durum |
|---|---|---|---|
| 1 | 12 Meta şablonu onayı | Meta | ⏳ PENDING (6 Eki gönderildi) |
| 2 | Avukat görüşü (§4 soruları) | Kurucu | ☐ |
| 3 | Pazarlama numarası alımı | Kurucu | ☐ |
| 4 | Fiyat/kredi kararı (A-3) | Kurucu | ☐ |
| 5 | Migration + RLS | Geliştirme | ☐ |
| 6 | Gönderim kodu + kapılar | Geliştirme | ☐ |
| 7 | Ret webhook + ortak liste | Geliştirme | ☐ |
| 8 | Kredi/Stripe (test modu) | Geliştirme | ☐ |
| 9 | UI + 4 dil metin | Geliştirme | ☐ |
| 10 | Test + pilot | Geliştirme | ☐ |
