export interface BlogPost {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "randevu-doluluk-orani-artirma",
    category: "İpuçları",
    title: "Salonunuzda Randevu Doluluk Oranını %40 Artırmanın 7 Yolu",
    excerpt: "Müşteri hatırlatmaları, online rezervasyon ve akıllı kampanyalarla salonunuzu nasıl dolduracağınızı keşfedin.",
    date: "15 Haziran 2026",
    readTime: "5 dk",
    author: "Siriplan Ekibi",
    content: `
Salon sahiplerinin en büyük sorunlarından biri doluluk oranını yüksek tutmak. İstatistiklere göre ortalama bir kuaför salonunun kapasitesinin **%30-40'ı boş kalıyor**. Bu rehberde bunu tersine çevirmek için 7 kanıtlanmış yöntemi paylaşıyoruz.

## 1. WhatsApp Hatırlatmaları Kurun

Randevu öncesi otomatik WhatsApp hatırlatması, gelmeme (no-show) oranınızı %60'a kadar azaltabilir. Siriplan ile 24 saat ve 2 saat öncesi otomatik mesaj kurabilirsiniz.

**Örnek mesaj:**
> "Merhaba Ayşe Hanım! Yarın saat 14:00'te Elegans Kuaför'deki randevunuzu hatırlatmak istedik. Değişiklik için: [link]"

## 2. Online Randevu Sayfası Oluşturun

Müşterilerinizin %7/24 randevu alabilmesi için mobil uyumlu bir online randevu sayfası şart. Bu sayede mesai saatleri dışında bile doluluk sağlarsınız.

**Anahtar özellikler:**
- Hizmet ve personel seçimi
- Müsait saatlerin görünmesi
- Anlık onay mesajı
- Takvime ekleme linki

## 3. Instagram ve WhatsApp'ı Otomatize Edin

"Fiyatlarınız nedir?" veya "Yarın boş yeriniz var mı?" gibi sorular gün boyu zaman öldürür. AI asistanı bu soruları otomatik yanıtlar ve randevu sayfasına yönlendirir.

## 4. Bekleme Listesi Tutun

Dolu saatleri gerçekten dolu tutmak için bekleme listesi kullanın. İptal olduğunda listedeki müşteriyi anında haberdar edin. Bu saat boş kalmak yerine dolmaya devam eder.

## 5. Sadakat Programıyla Sık Geleni Ödüllendirin

"10 ziyaret = 1 bedava" gibi ödül programları müşterilerin sık gelmesini sağlar. Müşteri skoru sistemiyle en değerli müşterilerinizi tespit edip öncelikli saat sunabilirsiniz.

## 6. İnaktif Müşterilere Kampanya Gönderin

3 aydır gelmeyen müşterileriniz var mı? Onlara kişiselleştirilmiş bir WhatsApp mesajı gönderin:

> "Sizi özledik! Bu hafta gelirseniz %20 indirim sizi bekliyor. Randevu: [link]"

Siriplan'ın kampanya modülü bu süreci tamamen otomatize eder.

## 7. Son Dakika Boşluklarını Doldurun

O gün kalan boş saatler için "Flash kampanya" mesajı gönderin. WhatsApp listenizdeki müşterilere özel fiyatla son dakika randevusu teklif edin.

---

## Sonuç

Bu 7 yöntemi birlikte uyguladığınızda doluluk oranınızın 4-8 haftada belirgin şekilde arttığını göreceksiniz. Siriplan, tüm bu adımları tek platformdan otomatize etmenizi sağlar.

**14 gün ücretsiz deneyin, farkı kendiniz görün.**
    `,
  },
  {
    slug: "whatsapp-ai-asistan-kurulum",
    category: "AI & Teknoloji",
    title: "WhatsApp AI Asistanı ile Mesai Saatleri Dışında Randevu Alma",
    excerpt: "7/24 çalışan yapay zeka asistanınız müşteri sorularını yanıtlar, randevu alır ve ön ödeme toplar.",
    date: "8 Haziran 2026",
    readTime: "4 dk",
    author: "Siriplan Ekibi",
    content: `
Saat 23:00'te telefonunuza gelen bir WhatsApp mesajı: "Yarın saat 10:00'da boş yeriniz var mı?" Normalde ya görmezden gelir ya sabah yanıtlarsınız. Müşteri o sırada başka salona gider.

AI asistanı bu sorunu tamamen ortadan kaldırıyor.

## AI Asistanı Nedir?

Siriplan'ın AI asistanı, WhatsApp Business Cloud API ve Anthropic Claude kullanarak müşteri mesajlarını anlık analiz eder ve akıllı yanıtlar üretir.

### Ne Yapabilir?

- **Uygunluk sorgusu:** "Yarın 14:00 boş mu?" → Sistemi kontrol eder, müsaitse slot ayırır
- **Fiyat sorusu:** "Saç boyası ne kadar?" → Hizmet listenizden fiyat söyler
- **Personel seçimi:** "Ayşe hanımı istiyorum" → Sadece Ayşe'nin müsait saatlerini gösterir
- **Randevu oluşturma:** Müşteri onay verince randevuyu sisteme kaydeder
- **Ön ödeme talebi:** Kaparo toplar, sistem güncellenir

### Ne Yapamaz?

- Sisteminizde tanımlamadığınız hizmetleri satmaz
- Hayali saatler önermez
- Politikanızın dışına çıkmaz

## Kurulum Süreci

### 1. WhatsApp Business Hesabı Alın
Meta Business Manager üzerinden WhatsApp Business Cloud API başvurusu yapın. Onay süreci 3-7 iş günü alır.

### 2. Siriplan'a Bağlayın
Dashboard > Ayarlar > Entegrasyonlar > WhatsApp bölümünden API anahtarlarınızı girin.

### 3. Hizmet ve Fiyat Listesi Girin
AI asistanı bu listeye göre yanıt verecek. Ne kadar detaylı girerseniz o kadar akıllı yanıtlar alırsınız.

### 4. Test Edin
Kendinize bir test mesajı gönderin. Asistan birkaç saniye içinde yanıt vermelidir.

## Gerçek Sonuçlar

Siriplan kullanan salonlardan elde edilen veriler:
- Mesai dışı alınan randevular: **+%35**
- WhatsApp yanıt süresi: 30 dakikadan **3 saniyeye**
- No-show oranı: **-%45**

---

AI asistanı, yeni bir "personel" gibi düşünün — uyku uyumaz, asla hata yapmaz, her müşteriye aynı sabırla yaklaşır.

**Siriplan Pro ile bugün aktive edin.**
    `,
  },
  {
    slug: "sadakat-programi-musteri-kaybi-onleme",
    category: "Müşteri Yönetimi",
    title: "Sadakat Programı ile Müşteri Kaybını Nasıl Önlersiniz?",
    excerpt: "Puanlama sistemi, doğum günü kampanyaları ve kişiselleştirilmiş tekliflerle müşteri bağlılığını artırın.",
    date: "1 Haziran 2026",
    readTime: "6 dk",
    author: "Siriplan Ekibi",
    content: `
Yeni müşteri kazanmak, mevcut müşteriyi tutmaktan **5 kat daha maliyetlidir**. Bu yüzden müşteri sadakati, salon büyütmenin en karlı yoludur.

## Müşteri Sadakat Puanı Sistemi

Siriplan'ın müşteri skoru, her müşteriye 0-100 arası otomatik puan atar. Puan hesaplamada:

- **Ziyaret sıklığı** (son 3 ayda kaç kez geldi)
- **Harcama tutarı** (ortalama sepet)
- **Bağlılık süresi** (kaç aydır müşteri)
- **Referans verme** (yeni müşteri getirdi mi?)

### Puan Bantları

| Puan | Segment | Aksiyon |
|------|---------|---------|
| 80-100 | VIP | Öncelikli saat, özel indirim |
| 60-79 | Sadık | Sadakat hediyesi, doğum günü sürprizi |
| 40-59 | Orta | Geri kazanma kampanyası |
| 0-39 | Riskli | Acil kampanya mesajı |

## Doğum Günü Otomasyonu

Müşterinizin doğum gününde şunu görmesini hayal edin:

> "Doğum gününüz kutlu olsun Ayşe Hanım! 🎂 Bu ay içinde gelen ziyaretinizde saç boyasında %25 indirim sizi bekliyor."

Siriplan bu mesajı **otomatik olarak** doğum gününde gönderir. Hiçbir şey yapmanıza gerek yok.

## İnaktif Müşteri Kampanyaları

3 ay boyunca gelmeyen müşteriyi tespit etmek ve geri kazanmak:

### Geri Kazanma Mesajı Örneği
> "Sizi çok özledik! Son ziyaretinizden bu yana 3 ay geçti. Bu hafta gelirseniz [hizmet] hizmetinde %20 indirim yapıyoruz. Randevu alın: [link]"

Bu basit mesaj, inaktif müşterilerin **%23'ünü geri kazandırıyor**.

## Kişiselleştirilmiş Teklifler

Müşteri geçmişini kullanarak kişiselleştirilmiş teklif yapın:

- **Saç boyası müşterisi:** "Boyama zamanı geldi! Müşterimiz olduğunuz için özel fiyat..."
- **SPA müşterisi:** "Bu ay yeni aromaterapi paketi çıkardık, sizi düşünerek..."
- **Yüksek harcayıcı:** "VIP müşterilerimize özel erken rezervasyon saatleri açtık..."

## Referans Programı

Müşteriniz yeni biri getirirse her ikisine de indirim kazandıran bir referans programı sadakati katlayarak artırır.

**Sistem nasıl çalışır:**
1. Müşteri kendi referans kodunu paylaşır
2. Yeni müşteri gelir, kodu kullanır
3. Her ikisine de puan/indirim otomatik eklenir

---

## Ölçülebilir Sonuçlar

Sadakat programı aktif kullanan Siriplan müşterilerinden elde edilen ortalama sonuçlar:
- Tekrar ziyaret oranı: **+%34**
- Ortalama sepet tutarı: **+%18**
- Müşteri yaşam döngüsü: **2.3x uzuyor**

**Bugün başlayın — 14 gün ücretsiz.**
    `,
  },
  {
    slug: "kvkk-guzellik-salonlari-rehber",
    category: "KVKK & Hukuk",
    title: "Güzellik Salonları İçin KVKK Uyum Rehberi 2026",
    excerpt: "Müşteri verilerini nasıl toplamalı, saklayıp işlemeli ve pazarlama mesajları için nasıl onay almalısınız?",
    date: "22 Mayıs 2026",
    readTime: "8 dk",
    author: "Siriplan Ekibi",
    content: `
6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), salon sahiplerini doğrudan ilgilendiriyor. Müşteri adı, telefon numarası, fotoğraf veya ödeme bilgisi topladığınız anda KVKK kapsamına giriyorsunuz.

## Salonların Topladığı Kişisel Veriler

- Ad, soyad, telefon, e-posta
- Randevu geçmişi ve tercihler
- Ödeme bilgileri
- Müşteri fotoğrafları (before/after)
- WhatsApp konuşmaları

Bunların hepsi **kişisel veri**. Bunları işlemek için yasal dayanağınız olmalı.

## Veri İşleme Yasal Dayanaçları

### 1. Açık Rıza
Pazarlama mesajı göndermek için **açık rıza** gerekir. "Onaylıyorum" kutusunu işaretletmeden mesaj gönderemezsiniz.

### 2. Sözleşme
Randevu aldığınızda hizmet sözleşmesi kurulur. Bu kapsamdaki veriler (ad, telefon) rıza olmadan işlenebilir.

### 3. Meşru Menfaat
Hatırlatma mesajı gibi makul iş ihtiyaçları için önceki müşterilere ulaşmak meşru menfaat kapsamında değerlendirilebilir.

## Dikkat Edilmesi Gerekenler

### Online Randevu Formu
- KVKK metni linki zorunlu
- "Kabul ediyorum" kutucuğu işaretlenmeden form gönderilememeli
- Pazarlama onayı ayrı bir kutucukla alınmalı

### WhatsApp Mesajları
- Toplu mesaj için önceden onay alınmalı
- "Beni listenizden çıkarın" talebi 48 saat içinde yerine getirilmeli

### Veri Saklama Süresi
Yasal zorunluluk olmadıkça müşteri verileri **5 yıldan uzun** saklanmamalı.

## Siriplan'ın KVKK Desteği

Siriplan, KVKK uyumunu otomatize eder:

✅ Randevu formunda zorunlu KVKK onay kutucuğu
✅ Pazarlama onayı ayrı tutuluyor
✅ Müşteri verisi silme talebi dashboard'dan işlenebiliyor
✅ Veri export ve silme özelliği
✅ SSL şifreleme ve güvenli veri saklama

---

*Bu rehber genel bilgi amaçlıdır. Hukuki danışmanlık için avukatınıza başvurun.*
    `,
  },
  {
    slug: "instagram-otomatik-randevu-kurulum",
    category: "Büyüme",
    title: "Instagram'dan Otomatik Randevu: Tam Kurulum Rehberi",
    excerpt: "Instagram DM'lerinizi otomatik yanıtlayın, randevu alın ve satışlarınızı artırın. Adım adım kurulum.",
    date: "14 Mayıs 2026",
    readTime: "7 dk",
    author: "Siriplan Ekibi",
    content: `
Instagram, güzellik salonları için en güçlü pazarlama kanallarından biri. Peki ya gelen yüzlerce DM'e nasıl yetişeceksiniz?

## Instagram DM Otomasyonu Nedir?

Siriplan'ın Instagram entegrasyonu sayesinde:
- Her gelen DM'e anında yanıt
- Fiyat, hizmet ve randevu soruları otomatik cevaplanır
- Randevu linki DM üzerinden paylaşılır
- Takipçi randevu aldığında sisteme otomatik kaydolur

## Adım Adım Kurulum

### Adım 1: Meta Business Manager Hesabı
instagram.com/business → Meta Business Suite → Hesap oluştur

### Adım 2: Instagram Professional Account
Kişisel hesabınızı İşletme Hesabına çevirin: Profil > Ayarlar > Hesap Türü

### Adım 3: Meta App Oluşturma
developers.facebook.com → App oluştur → Instagram Basic Display seç

### Adım 4: Siriplan'a Bağlama
Dashboard > Ayarlar > Entegrasyonlar > Instagram

Gerekli bilgiler:
- Page Access Token
- Page ID
- Verify Token (Siriplan size verir)

### Adım 5: Webhook Kurulumu
Meta App → Webhooks → Instagram → Siriplan webhook URL'ini gir

### Adım 6: Test
Hesabınıza test mesajı gönderin. Sistem yanıt vermeli.

## Yanıt Şablonları

Hangi mesaj gelirse AI ne yanıt verir?

**"Fiyatlarınız nedir?"**
→ Hizmet listeniz gösterilir

**"Yarın yer var mı?"**
→ Müsait saatler listelenir, randevu linki gönderilir

**"Ayşe hanımla randevu alabilir miyim?"**
→ Sadece Ayşe'nin müsait saatleri gösterilir

**"Ne zaman açıksınız?"**
→ Çalışma saatleriniz söylenir

## Sonuçlar

Entegrasyonu aktif kullanan salonlarda:
- DM yanıt süresi: 45 dakikadan **8 saniyeye**
- Instagram üzerinden alınan randevu: **+%120**
- Müşteri kaybı: **-%30**

---

**Siriplan Pro ile Instagram AI asistanınızı bugün aktive edin.**
    `,
  },
  {
    slug: "kdv-komisyon-raporlama-otomasyonu",
    category: "Ciro",
    title: "Salonunuzda KDV ve Komisyon Raporlamasını Otomatikleştirin",
    excerpt: "Personel bazlı komisyon takibi, KDV beyanı için hazır raporlar ve tek tıkla PDF export.",
    date: "5 Mayıs 2026",
    readTime: "4 dk",
    author: "Siriplan Ekibi",
    content: `
Her ay muhasebeciye "Bu ay ne kadar kazandık?" sorusunu sormak yerine, sisteminizin sizi otomatik bilgilendirmesini hayal edin.

## Ciro Takibinin Önemi

Salon sahiplerinin %70'i gerçek karlılıklarını bilmiyor. Brüt ciro ile net kar arasındaki farkı görmek için:
- Personel giderleri
- KDV kesintisi
- Malzeme maliyeti
- Kira ve sabit giderler

hepsini hesaba katmak gerekiyor.

## Siriplan Ciro Dashboard'u

### Anlık Görünüm
- Bugünkü ciro
- Bu haftanın toplamı
- Bu ayın hedef vs. gerçek
- Personel bazlı performans

### KDV Raporu
Her hizmet için KDV dahil/hariç tutarlar otomatik ayrıştırılır. Muhasebeci için hazır KDV raporu PDF olarak indirilebilir.

### Personel Komisyon Hesaplama

**Örnek:**
- Ayşe hanım bu ay 15.000 TL hizmet vermiş
- Komisyon oranı %30
- Sistem otomatik: 15.000 × 0.30 = **4.500 TL komisyon**

Bu hesaplama her personel için otomatik yapılır, aylık bordro hazır.

## Raporları Export Etme

### PDF Raporu
Muhasebeciye gönderilmeye hazır, kurumsal formatlı PDF.

### Excel Dosyası
Kendi analizleriniz için ham veri. Pivot tablo, grafik, dilediğiniz analiz.

### JSON Format
Muhasebe yazılımınıza aktarım için makine okunabilir format.

## Gider Takibi

Sadece geliri değil, giderleri de takip edin:
- Kira, elektrik, su, internet
- Malzeme ve ürün alımları
- Personel maaşları
- Reklam harcamaları

Net kar = Ciro - Giderler. Siriplan bunu otomatik hesaplar.

---

## Sonuç

El hesabı ve Excel yerine Siriplan'ın otomatik raporlama sistemi ile her ay 3-4 saat tasarruf edin. Muhasebeci maliyetinizi düşürün.

**14 gün ücretsiz deneyin.**
    `,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
