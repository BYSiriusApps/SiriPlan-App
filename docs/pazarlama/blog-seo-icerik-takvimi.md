# SiriPlan Blog — SEO İçerik Takvimi

## Haftada kaç yazı?

**1 yazı/hafta, düzenli.** Gerekçe:

- 2026 verilerine göre yayın sıklığı doğrudan bir sıralama faktörü değil — kalite ve **süreklilik** kazanıyor. Bir yılda 52 hafta boyunca haftada 1 kaliteli yazı, bir haftada patlayıp sonra sessizliğe gömülen 12 yazıdan çok daha iyi sonuç veriyor. ([Search Engine Journal](https://www.searchenginejournal.com/how-often-should-you-blog-tips-for-ideal-posting-frequency/530884/), [Distribb](https://distribb.io/blog/how-often-should-you-blog-for-seo))
- Küçük işletmelerin trafik görmeye başlaması için genelde **20-30 odaklı yazı** gerekiyor — haftada 1 ile ~6-7 ay. ([ProGeekTech](https://www.progeektech.com/post/how-many-blog-posts-does-a-small-business-need-to-rank-2026))
- SiriPlan zaten Mayıs-Haziran 2026'da bu tempoyu tutmuş (6 yazı, ~7-9 günde bir) — devam ettirmek yeni bir alışkanlık değil, var olanı sürdürmek.
- Kapasite artarsa (siz + AI ile taslak) **haftada 2'ye** çıkmak mümkün, ama 1/hafta'yı düşürmemek şartıyla. Asla "bu hafta 3, sonra 3 hafta sessizlik" yapmayın — Google ve okuyucu ikisi de düzensizliği cezalandırır.

## Rakip haritası (kısa)

Aynı nişte zaten içerik üreten rakipler bulundu: **salonmerkezi.com** (semt+anahtar kelime SEO stratejisi yazmışlar), **enorandevu.com**, **hizliappy.com**, **planla.co**, **guzelliksalonuprogrami.org**, **kuafordukkan.com**. Yani alan boş değil — fark yaratmak için jenerik "7 ipucu" yazıları yerine **gerçek ürün özelliklerine dayanan, veri/örnekli** içerik (mevcut yazılarınızın zaten yaptığı gibi) rakiplerin çoğundan daha güçlü. Aşağıdaki takvim bilinçli olarak gerçekten var olan SiriPlan özelliklerine (paket/seans, stok/barkod, bekleme listesi, prim hesaplama, İYS/KVKK) dayanıyor — üretmesi kolay (siz zaten süreci biliyorsunuz) ve rakiplerin çoğunda karşılığı yok.

## 8 Haftalık Takvim

| # | Yayın tarihi | Kategori | Başlık | Hedef anahtar kelime | Dayandığı özellik | Durum |
|---|---|---|---|---|---|---|
| 1 | 19 Eyl 2026 | İpuçları | Randevuya Gelmeme (No-Show) Oranını Azaltmanın 6 Yolu | "no show azaltma", "randevuya gelmeme önleme" | Hatırlatma + kaparo | ✅ Yayınlandı (`randevu-no-show-azaltma`) |
| 2 | 28 Eyl 2026 | Personel Yönetimi *(yeni kategori)* | Salon Personeli İçin Maaş ve Prim Hesaplama Rehberi | "kuaför prim hesaplama", "personel maaş hesaplama salon" | `/dashboard/personel/maas-hesaplama` | ☐ |
| 3 | 5 Eki 2026 | Müşteri Yönetimi | Bekleme Listesi ile Boş Randevu Saatini Doldurma Rehberi | "randevu bekleme listesi", "iptal olan randevuyu doldurma" | Bekleme listesi modülü | ☐ |
| 4 | 12 Eki 2026 | Ciro | Peşin Paket/Seans Satışı ile Nakit Akışını Güçlendirin | "kuaför paket satışı", "seans paketi yazılımı" | Paket/seans takibi | ☐ |
| 5 | 19 Eki 2026 | Sektörler *(yeni kategori)* | Nail Stüdyosu, Estetik Merkezi ve Diyetisyenler İçin Randevu Sistemi Farkları | "estetik merkezi randevu sistemi", "diyetisyen randevu programı" | Sektör kategori sayfaları (`/kategori/nail`, `/kategori/estetik`, `/kategori/diyetisyen`) | ☐ |
| 6 | 26 Eki 2026 | Büyüme | Google Haritalar'da Salonunuzu Öne Çıkarmanın 7 Yolu (Yerel SEO) | "salon google haritalar sıralama", "yerel seo kuaför" | Randevu vitrini linki (`/r/[slug]`) | ☐ |
| 7 | 2 Kas 2026 | KVKK & Hukuk | WhatsApp Pazarlama Mesajları İçin Doğru Onay Nasıl Alınır? (İYS + KVKK) | "whatsapp pazarlama izni", "iys kvkk farkı" | İYS/KVKK opt-out altyapısı | ☐ |
| 8 | 9 Kas 2026 | Ciro | Stok ve Barkodla Ürün Satışı: Salon Envanterini Kontrol Altına Alın | "salon stok takip programı", "barkod ürün satışı kuaför" | Barkod/stok modülü | ☐ |

**Not (teknik):** 2 ve 5. haftalarda yeni kategoriler ("Personel Yönetimi", "Sektörler") kullanılıyor. Bu kategoriler yazılınca [src/app/[locale]/(marketing)/blog/[slug]/page.tsx](../../src/app/%5Blocale%5D/%28marketing%29/blog/%5Bslug%5D/page.tsx) içindeki `CATEGORY_COLORS` ve `CATEGORY_INTERNAL_LINKS` map'lerine birer satır eklenmeli — yoksa renk/iç-link bloğu boş kalır.

## Her yazı için içerik checklist'i

Teknik SEO (schema, canonical, hreflang, kategoriye göre ilgili yazılar, iç link bloğu) kodda otomatik — tek tek düşünmenize gerek yok. Yazı yazarken kontrol edin:

- [ ] Başlık 60 karakteri geçmiyor, hedef anahtar kelime başlıkta geçiyor
- [ ] Excerpt (meta description) 120-155 karakter, tıklamayı özendiriyor
- [ ] Tek H1 (başlık), gövdede 3-6 tane H2, mümkünse anahtar kelime varyasyonu H2'lerde
- [ ] 800-1500 kelime — çok kısa tutmayın, ama doldurmak için de uzatmayın
- [ ] Gerçek bir SiriPlan ekran görüntüsü veya somut sayı/örnek (mevcut yazılarınızın güçlü yanı — devam edin)
- [ ] Gövdede en az 1 alakalı iç link (feature sayfası veya `/kategori/[sektor]`) — otomatik blok dışında, doğal cümle içinde
- [ ] `src/lib/blog-posts.ts`'e eklerken `isoDate` alanını unutmayın (JSON-LD `datePublished` için zorunlu)
- [ ] Yayından sonra Google Search Console'a URL gönder (indeksleme hızlansın)

## Sonraki adım önerisi

Bu takvimdeki 8 yazıdan istediğinizi seçin, ben taslağı (mevcut yazı formatınıza uygun, Türkçe, ürün özelliklerine dayalı) yazayım — siz gözden geçirip yayınlarsınız. Hangisiyle başlamak istersiniz?
