# Instagram, Facebook Messenger, WhatsApp ve SMS Otomasyonu — Kurulum Kılavuzu

> Bu kılavuz **işletme sahibi (müşteri)** içindir: SiriPlan panelinizde randevu taleplerine ve mesajlara otomatik yanıt verebilmesi için Instagram, Facebook, WhatsApp ve SMS taraflarında yapmanız gerekenleri anlatır. Panel tarafındaki alanlar zaten hazır — burada anlatılan adımlar Meta (Facebook/Instagram) ve SMS sağlayıcı hesaplarınızda yapılır.

## İçindekiler

1. [Genel bakış — hangi kanal ne işe yarar](#1-genel-bakış)
2. [WhatsApp](#2-whatsapp) — zaten hazır, ek adım gerekmez
3. [Instagram + Facebook Messenger kurulumu](#3-instagram--facebook-messenger-kurulumu)
4. [SMS kurulumu](#4-sms-kurulumu)
5. [TikTok — neden otomasyon yok](#5-tiktok)
6. [Test ve demo süreci](#6-test-ve-demo-süreci)
7. [Sık sorulan sorular](#7-sık-sorulan-sorular)

---

## 1. Genel bakış

| Kanal | Randevu onay/hatırlatma/iptal | Kampanya | Gelen mesaja otomatik AI yanıtı | Kurulum |
|---|---|---|---|---|
| **WhatsApp** | ✅ SiriPlan'ın kendi hattından otomatik | Kendi numaranızdan (opsiyonel) | ✅ | Panelde token girişi (opsiyonel) |
| **SMS** | ✅ | ✅ | — (SMS'te AI yanıt yok, tek yönlü) | Panelde sağlayıcı hesabı girişi |
| **Instagram DM** | — | — | ✅ (yeni) | Panelde token girişi |
| **Facebook Messenger** | — | — | ✅ (yeni) | Panelde token girişi (Instagram ile aynı) |
| **TikTok** | — | — | ❌ desteklenmiyor | Yalnızca profil linki |

## 2. WhatsApp

Randevu onay/hatırlatma/iptal mesajları **SiriPlan'ın kendi WhatsApp hattından** otomatik gider — bunun için hiçbir şey yapmanıza gerek yok. Kampanyalarınızın ve gelen mesajlara otomatik yanıtın **kendi** WhatsApp Business numaranızdan gitmesini isterseniz Ayarlar → "WhatsApp Business Bağlantısı" bölümünden bağlanabilirsiniz (bu kılavuzun kapsamı dışında, panelde ayrıca açıklanıyor).

## 3. Instagram + Facebook Messenger kurulumu

Instagram ve Facebook Messenger, Meta'nın aynı altyapısını paylaşır: Instagram hesabınız bir Facebook Sayfasına bağlıysa, **tek bir bağlantı** hem Instagram DM'lerini hem Messenger mesajlarını kapsar.

### Adım 1 — Facebook Sayfası
İşletmenize ait bir Facebook Sayfanız yoksa [facebook.com/pages/create](https://www.facebook.com/pages/create) üzerinden oluşturun. Zaten varsa bu adımı atlayın.

### Adım 2 — Instagram hesabını Profesyonel hesaba çevirip Sayfaya bağlayın
1. Instagram uygulamasında **Ayarlar → Hesap → Hesap Türünü Değiştir** ile hesabınızı **İşletme (Business)** hesabına çevirin (zaten değilse).
2. **Ayarlar → İşletme → Bağlı Hesaplar → Facebook** üzerinden Instagram hesabınızı Adım 1'deki Facebook Sayfasına bağlayın.

### Adım 3 — Meta for Developers'ta uygulama oluşturun
1. [developers.facebook.com](https://developers.facebook.com) adresine kendi Facebook hesabınızla girin.
2. **Uygulamalarım → Uygulama Oluştur** ile **"Business"** türünde yeni bir uygulama açın.
3. Uygulama panelinde **Messenger** ve **Instagram** ürünlerini ("Add Product") ekleyin.

### Adım 4 — Sayfa Erişim Belirteci (Page Access Token) alın
1. Uygulama panelinde **Messenger → Ayarlar** bölümüne gidin.
2. "Access Tokens" altında Adım 1'deki Sayfanızı seçip bir **Sayfa Erişim Belirteci** üretin. Kalıcı (süresiz) bir belirteç için Meta'nın "long-lived token" adımlarını izleyin — kısa ömürlü belirteç birkaç saat sonra geçersiz olur.
3. Aynı ekranda veya Sayfa Ayarları → Sayfa Bilgileri altında **Sayfa Kimliği'ni (Page ID)** bulun — genelde 15-16 haneli bir sayıdır.

### Adım 5 — Webhook aboneliği (bu adımı biz de birlikte yapacağız)
Uygulama panelinde **Messenger → Ayarlar → Webhooks** bölümüne:
- **Callback URL**: `https://siriplan.com/api/webhooks/meta`
- **Verify Token**: SiriPlan ekibinden alacağınız doğrulama anahtarı
- Abone olunacak alanlar: `messages`, `messaging_postbacks` (Page) ve `messages` (Instagram)

girilir. Bu adım teknik olduğu için genellikle SiriPlan ekibiyle birlikte yapılır.

### Adım 6 — Panelde token'ı girin
SiriPlan panelinde **Ayarlar → Instagram & Facebook Messenger Bağlantısı** bölümüne:
- **Sayfa Erişim Belirteci** (Adım 4)
- **Facebook Sayfa Kimliği** (Adım 4)

alanlarını doldurup **Kaydet**'e basın. Bu alanlar boşken gelen DM'lere otomatik yanıt verilmez.

### Adım 7 — Meta App Review (canlıya alırken)
Uygulamanız "Geliştirme (Development)" modundayken yalnızca uygulamaya **test kullanıcısı** olarak eklediğiniz hesaplarla mesajlaşma çalışır. Gerçek/yabancı müşterilerle çalışabilmesi için Meta'nın `pages_messaging` ve `instagram_manage_messages` izinlerini **App Review** sürecinden geçirmeniz gerekir (Meta tarafından incelenir, birkaç gün sürebilir). Bu süreçte SiriPlan ekibi size eşlik edecek.

## 4. SMS kurulumu

SMS bildirimleri (randevu onay/hatırlatma/iptal + kampanya) zaten panelde hazır — Ayarlar → "SMS Bildirimleri" bölümünden Netgsm, VatanSMS veya İleti Merkezi'nden birini seçip kullanıcı adı/şifre/gönderici başlığınızı girmeniz yeterli:

1. Seçtiğiniz sağlayıcının (Netgsm / VatanSMS / İleti Merkezi) web sitesinden bir işletme hesabı açın.
2. Sağlayıcı panelinden bir **Gönderici Başlığı (Sender ID)** başvurusu yapın — operatör onayı gerekir, onaysız gönderimde SMS reddedilir.
3. Bir SMS kredi paketi satın alın (aylık sabit ücret yoktur, SMS başına ücretlendirilir).
4. Kullanıcı adı, şifre ve onaylı başlığı panelde Ayarlar → SMS Bildirimleri'ne girip kaydedin.

## 5. TikTok

TikTok'un işletmelere açık, genel kullanıma sunulmuş bir "otomatik DM/randevu" API'si **yoktur** (Meta'daki WhatsApp/Instagram/Messenger API'lerinin dengi bir ürün TikTok'ta genel erişime açık değil). Bu nedenle TikTok için otomasyon sunmuyoruz — panelde yalnızca profil linkinizi (Ayarlar → Sosyal Medya) görüntüleme amaçlı ekleyebilirsiniz.

## 6. Test ve demo süreci

Canlıya almadan önce SiriPlan ekibi birkaç test hesabıyla (test Facebook Sayfası, test Instagram hesabı) uçtan uca deneme yapacak ve size bir demo sunumu hazırlayacaktır. Gerçek müşteri hesabınızla App Review süreci tamamlanana kadar test modunda ilerlenir.

## 7. Sık sorulan sorular

**Instagram hesabım Facebook Sayfama bağlı değilse ne olur?**
Adım 2'yi tamamlamadan Instagram DM'leri panele ulaşmaz; Messenger yine de çalışabilir.

**Token'ı kaybedersem/sızarsa ne yapmalıyım?**
Meta for Developers panelinden token'ı iptal edip yeniden üretin, ardından panelde güncelleyin. Şüpheli bir durumda SiriPlan ekibine bildirin.

**Aynı anda hem Messenger hem Instagram'a mı yanıt verilir?**
Evet — tek bağlantı (bir Sayfa Erişim Belirteci + bir Sayfa Kimliği) her iki kanalı da kapsar.
