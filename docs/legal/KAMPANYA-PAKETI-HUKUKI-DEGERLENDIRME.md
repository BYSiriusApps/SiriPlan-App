# Kampanya Mesaj Paketi (Siriplan numarasından) — Hukuki Değerlendirme

**Durum:** TASLAK — iç değerlendirme, hukuki mütalaa değildir. **Avukat/İYS danışmanı onayı alınmadan paket AÇILMAZ.**
**Tarih:** 2026-10-06
**İlgili:** [`IYS-KARAR-KAYDI.md`](./IYS-KARAR-KAYDI.md) · [`IYS-HUKUKI-DAYANAK.md`](./IYS-HUKUKI-DAYANAK.md) · [`IYS-ILETI-SINIFLANDIRMA.md`](./IYS-ILETI-SINIFLANDIRMA.md) · [`KAMPANYA-PAKETI-EK-SOZLESME.md`](./KAMPANYA-PAKETI-EK-SOZLESME.md) · [`KAMPANYA-PAKETI-SALON-BILGILENDIRME.md`](./KAMPANYA-PAKETI-SALON-BILGILENDIRME.md) · [`KAMPANYA-PAKETI-UYGULAMA-VE-GUVENLIK-PLANI.md`](./KAMPANYA-PAKETI-UYGULAMA-VE-GUVENLIK-PLANI.md)

---

## 1. Ne değişiyor?

| | Bugün | Paketle |
|---|---|---|
| Kampanya/doğum günü mesajını gönderen hesap | Salonun KENDİ WhatsApp/SMS hesabı | **Siriplan'ın sağladığı ayrı numara** (Meta Marketing şablonları) |
| Fiili gönderici (teknik) | Salon | Siriplan WABA |
| İletide görünen marka | Salon adı | Salon adı (`{{2}}` parametresi) |
| Maliyet | Salon, kendi sağlayıcısına öder | Siriplan öder, salona ücretli paketle yansıtır |

`IYS-KARAR-KAYDI.md` → "Yeniden değerlendirme tetikleyicisi #1" tam olarak bu durumdur:
*"Siriplan platform numarasından tanıtım/pazarlama göndermeye başlarsa."* Mevcut "işlemsel-yalnız platform"
duruşu bu paket için **geçerli değildir**; bu belge o kararın yerine geçecek yeni karar için zemin hazırlar.

## 2. Roller (kim kimdir?)

**Önerilen yapı: "Salon = ileti sahibi / hizmet sağlayıcı; Siriplan = salon adına gönderen teknik altyapı."**

| Konu | Salon | Siriplan |
|---|---|---|
| Ticari elektronik ileti (TEİ) hizmet sağlayıcısı | ✅ (marka/ileti sahibi) | Teknik gönderici (adına) |
| Alıcıdan açık rıza alma ve ispat | ✅ | Kaydı tutar, ispat yardımcı |
| İYS üyeliği ve onay yükleme | ✅ (salon kendi İYS hesabı) | ❌ (üye değil — bkz. §4) |
| İleti içeriği | ✅ | Kuralları dayatır, kötüye kullanımı keser |
| Ret (opt-out) uygulaması | Yükümlü | **Teknik olarak otomatik uygular** |
| Kişisel veri | Veri sorumlusu | Veri işleyen |

**Neden risk tamamen yok olmuyor:** Mesaj Siriplan numarasından, Siriplan WABA'sından, Siriplan hesabıyla ödenerek
gidiyor. Düzenleyici/şikâyetçi/Meta "gönderen kim?" sorusunda Siriplan'ı da muhatap alabilir. Sözleşme iç ilişkiyi
(tazmin) düzenler, ama kamu otoritesine karşı tek başına kalkan değildir.

## 3. Hukuki çerçeve (özet)

- **6563 sayılı Kanun** — TEİ için önceden onay, ret hakkı, yaptırım (ileti başına idari para cezası; 1.000'den fazla
  alıcıya gönderimde artırım). Güncel tutarlar avukattan teyit edilmeli (yeniden değerlendirme ile her yıl değişir).
- **Ticari İletişim ve TEİ Yönetmeliği** — m.7 gönderen kimliği, m.9 ret hakkı, İYS kayıt/yükleme/sorgu yükümlülükleri.
- **KVKK (6698)** — rol belirleme (sorumlu/işleyen), aydınlatma, yurt dışı aktarım (Meta/ABD, UK), VERBİS.
- **Meta WhatsApp Business / Commerce / Messaging politikaları** — opt-in zorunluluğu, yasak içerik, kalite puanı ve
  mesajlaşma limitleri; ihlalde numara kısıtlama/kapatma.
- **UK (Siriplan'ın merkezi)** — PECR/UK GDPR kapsamı AB/UK alıcılar için ayrıca düşünülmeli (şu an hedef TR salonları).

## 4. Çözülmesi gereken ana hukuki sorular (AVUKATA)

1. **İYS ve yurt dışı şirket.** İYS üyeliği pratikte TR vergi no/MERSİS ister. Salon İYS'ye üye, Siriplan değilse:
   Siriplan'ın salon adına göndermesi "İYS'ye kayıtlı olmayan bir gönderen" sayılır mı, yoksa teknik aracı mı?
   Alternatif: Siriplan **İYS entegratörü** olur (TR tüzel kişilik gerekir mi?).
2. **WhatsApp İYS kapsamında mı?** İYS kanalları arama/mesaj/e-posta; WhatsApp için güncel Bakanlık/İYS uygulaması?
3. **Ortak numaradan ret.** Müşteri "RET" yazınca hangi salona karşı geçerli? (bkz. uygulama planı §4) Ortak ret listesi
   (tüm salonlar) hukuken sorunsuz mu, yoksa salon başına mı olmalı?
4. **Siriplan'ın ayrı sorumluluğu.** TEİ kanunu "hizmet sağlayıcı" ve "aracı" ayrımı yapıyor mu? Siriplan numarasından
   gönderim Siriplan'ı hizmet sağlayıcı yapar mı? İdari para cezası kime kesilir, tazmin sözleşmeyle ne kadar geçerli?
5. **KVKK rolü.** Siriplan ortak ret listesi/suppression listesi tuttuğunda kendi amacıyla veri işlemiş (sorumlu) olur mu?
6. **Yurt dışı aktarım.** Salon müşteri telefonlarının Meta'ya iletimi için salon aydınlatma metninde ne yer almalı?
7. **Sözleşme yapısı.** Tazminat sınırsız olabilir mi (TBK genel işlem koşulları ve haksız şart denetimi)? Tüketici değil
   tacir olan salon için sorumluluk sınırı geçerli mi? UK şirketiyle TR salon arasında yetki/hukuk seçimi (mevcut:
   Türk hukuku + İstanbul mahkemeleri) uygun mu?
8. **Vergi.** UK şirketinin TR salonuna dijital hizmet satışı: KDV (hizmetin TR'de ifası, DSV/yabancı hizmet),
   fatura/e-arşiv zorunluluğu.
9. **Mesajda marka kullanımı.** İletide "Siriplan tarafından {salon} adına" ibaresi gerekli mi?

## 5. Risk kaydı

| # | Risk | Olasılık | Etki | Azaltım |
|---|---|---|---|---|
| R1 | Onaysız alıcıya gönderim → idari para cezası/şikâyet | Orta | Yüksek | Sunucu tarafı zorunlu `marketing_consent` filtresi, salon beyanı, onay ispat dışa aktarımı, tazmin |
| R2 | Meta kalite düşüşü → numara kısıtı | Orta | Yüksek | Pazarlama numarası işlemsel numaradan **tamamen ayrı**; kalite izleme; otomatik duraklatma |
| R3 | Ret yanıtının yanlış salona/hiçbirine işlenmesi | Orta | Yüksek | Ortak (numara bazlı) ret listesi; ret anında tüm salonlar için bastırma |
| R4 | Maliyet suistimali (hesap ele geçirme, spam) | Düşük-Orta | Yüksek | Ön ödemeli kredi, günlük/aylık tavan, yeni hesap limiti, alıcı sayısı tavanı |
| R5 | Yasak içerik (tıbbi iddia, yanıltıcı indirim, bahis vb.) | Orta | Orta | KKP + gönderim öncesi kural denetimi + askıya alma hakkı |
| R6 | Çapraz-kiracı sızıntı (ortak numara gelen kutusu, ret listesi, loglar) | Düşük | Çok yüksek | Tüm sorgularda `org_id` kapsamı, RLS, ortak listede yalnızca hash |
| R7 | Siriplan'ın hizmet sağlayıcı sayılması | Bilinmiyor | Yüksek | Avukat görüşü (§4.1, §4.4) — **paket öncesi şart** |
| R8 | Fiyat < maliyet (Meta Marketing konuşma ücreti) | Orta | Orta | Ön ödemeli kredi + maliyet+marj fiyatlama; Meta fiyat değişim maddesi |

## 6. Karar seçenekleri

| | A) Yalnızca "kendi hesabını bağla" (bugünkü) | B) Siriplan numarası, ücretli paket | C) Siriplan İYS entegratörü/hizmet sağlayıcısı |
|---|---|---|---|
| Hukuki yük Siriplan'da | Düşük | **Orta-yüksek** | Yüksek |
| Operasyon | Düşük | Orta (kalite, kredi, ret) | Yüksek |
| Gelir | Yok | Var | Var |
| Ön koşul | Şablonların salon WABA'sında olması | Avukat görüşü + ayrı numara | TR tüzel kişilik/İYS başvurusu |

**Öneri:** A varsayılan kalır. B ancak §4'teki 1–5. soruların yazılı avukat görüşüyle ve
`UYGULAMA-VE-GUVENLIK-PLANI` kontrol listesinin (özellikle ortak ret listesi + kredi + ayrı numara) tamamlanmasıyla açılır.
C şimdilik kapsam dışı.

## 7. Açılış için kapılar (hepsi ✅ olmadan paket yayına alınmaz)

- [ ] Avukat/İYS danışmanı yazılı görüşü (§4 soruları)
- [ ] Ek sözleşme son hali (avukat revizyonu) + kullanım koşullarına atıf
- [ ] 12 Meta MARKETING şablonu APPROVED
- [ ] Ayrı pazarlama numarası alındı ve Meta'da doğrulandı
- [ ] Uygulama/güvenlik planı P0 maddeleri tamam ve test edildi
- [ ] Salon bilgilendirme/aktivasyon ekranı + 4 dil metinleri
- [ ] Gizlilik politikası/aydınlatma güncellemesi (Meta aktarımı, ortak ret listesi)
- [ ] Vergi/fatura yapısı netleşti (§4.8)
- [ ] `IYS-KARAR-KAYDI.md` yeni karar kaydıyla güncellendi, `IYS-ILETI-SINIFLANDIRMA.md` satırı eklendi

## 8. Karar kaydı taslağı (avukat sonrası doldurulacak)

> **Tarih:** …  **Karar:** … (A / B / C)  **Dayanak:** avukat görüşü (tarih/ref) …
> **Kalan riskler ve kabul gerekçesi:** …  **Yeniden değerlendirme tetikleyicileri:** Meta politikası değişikliği, İYS/Bakanlık
> uygulaması, Siriplan TR tüzel kişilik, kalite/şikâyet eşiği aşımı.
