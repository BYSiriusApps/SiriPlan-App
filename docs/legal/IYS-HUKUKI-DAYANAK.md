# İYS — Hukuki Dayanak Notu (İç Değerlendirme)

**Konu:** Siriplan üzerinden gönderilen randevu onay/hatırlatma/iptal/güncelleme mesajlarının İYS kaydı ve açık rıza gerektirip gerektirmediği.
**Tarih:** 2026-08-29
**Not:** Bu belge hukuki mütalaa değildir; mevzuat lafzına dayanan iç değerlendirmedir. Danışman görüşü alınmamıştır (kullanıcı talimatı — bkz. [[legal-compliance-posture]]).

---

## 1. Mevzuat

- **6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun** (RG 05.11.2014)
- **Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik** (RG 15.07.2015; İYS değişikliği RG 04.01.2020)
- **İYS** — iys.org.tr (TOBB İYS A.Ş., Ticaret Bakanlığı denetiminde)

## 2. Uygulanan hükümler

### Yönetmelik m.6/1
> "Alıcının kendisiyle iletişime geçilmesi amacıyla iletişim bilgilerini vermesi hâlinde, temin edilen mal veya hizmetlere ilişkin değişiklik, kullanım ve bakıma yönelik ticari elektronik iletiler için ayrıca onay alınmaz."

**Uygulama:** Müşteri randevu alırken telefon/e-posta bilgisini bizzat verir. Randevu hatırlatma ve güncelleme bildirimleri "temin edilen hizmete ilişkin" bildirimlerdir → onay aranmaz.

### Yönetmelik m.6/2
> "Devam eden abonelik, üyelik veya ortaklık durumu ile tahsilat, borç hatırlatma, bilgi güncelleme, **satın alma ve teslimat** veya benzeri durumlara ilişkin bildirimleri içeren iletiler … için önceden onay alınması zorunlu değildir. **Ancak bu iletilerde herhangi bir mal veya hizmetin tanıtımı, pazarlaması ya da işletmenin reklamı yapılamaz.**"

**Uygulama:** Randevu onayı ve iptali, bir hizmet satın alımının teyidi/iptali niteliğindedir → onay aranmaz. Koşul: iletide tanıtım/indirim/pazarlama bulunmaması.

### Yönetmelik m.6/3
> "Tacir veya esnaf olan alıcıların elektronik iletişim adreslerine gönderilen ticari elektronik iletiler için önceden onay alınması zorunlu değildir."

**Uygulama:** Siriplan'ın salon sahibine gönderdiği deneme süresi/abonelik bildirimleri (alıcı tacir/esnaf + kendi aboneliği) → onay aranmaz.

### İYS kayıt yükümlülüğü (m.13/A ve devamı)
Hizmet sağlayıcılar ticari elektronik ileti göndermeden önce İYS'ye kayıt olur, aldıkları onayları İYS'ye yükler, her gönderimden önce İYS ret kontrolü yapar. **m.6 kapsamındaki, tanıtım içermeyen bildirimler bu rejimin dışındadır** (İYS SSS / Bakanlık uygulaması): bunlar için İYS'ye onay kaydı ve gönderim öncesi İYS kontrolü zorunlu değildir.

### Yönetmelik m.7 — Gönderen kimliği
İletide hizmet sağlayıcının adı/unvanı ve bir iletişim kanalı bulunmalıdır.
**Uygulama kontrolü (2026-08-29):**
- WhatsApp onay/iptal/revize şablonları `{salon}` değişkeniyle salon adını taşır. ✅
- Hatırlatma şablonu `business_name` + `business_phone` parametrelerini taşır (migration `20260827_wa_reminder_seven_params.sql`). ✅
- E-posta alt bilgisi: "Bu e-posta Siriplan tarafından {salon} adına gönderilmiştir" + siriplan.com + tüzel kişi adı. ✅

### Yönetmelik m.9 — Ret hakkı
Her ticari elektronik iletide kolay ve ücretsiz ret imkânı sunulmalıdır.
**Uygulama:** İşlemsel bildirimler (m.6) için ret dipnotu zorunlu değildir; yine de talep gelirse saygı gösterilir. Kampanya ve doğum günü iletilerine `optOutFooter()` ile zorunlu ret satırı eklenir ve gelen "RET" WhatsApp'ta otomatik işlenir (`src/lib/marketing-opt-out.ts`).

### Yaptırım (Kanun m.12)
İleti başına idari para cezası (2015 taban tutarları yeniden değerleme ile artar); bir defada 1.000'den fazla kişiye gönderimde ceza 10 katına kadar artırılabilir. Risk toplu pazarlama gönderiminde yoğunlaşır.

## 3. Sonuç

> **Randevu onay, hatırlatma, iptal ve güncelleme bildirimleri**, tanıtım/pazarlama ifadesi içermedikleri sürece Yönetmelik m.6/1 ve m.6/2 kapsamında **açık rıza ve İYS kaydından muaftır.**
>
> **Kampanya ve doğum günü iletileri** onaya tabi ticari elektronik iletidir. Bunlar salonun kendi SMS/WhatsApp hesabından gönderildiği için hukuken **hizmet sağlayıcı salondur**; İYS'ye kayıt, onay alma ve İYS'ye yükleme, ret yönetimi yükümlülüğü salona aittir. Siriplan aracı teknik altyapı sağlar.
>
> **Siriplan'ın salon sahiplerine gönderdiği abonelik bildirimleri** m.6/2–6/3 kapsamında muaftır.

## 4. Bu sonucun bağlı olduğu koşullar (revizyon tetikleyicileri)

1. İşlemsel şablonlara tanıtım/indirim ifadesi eklenirse (salon özelleştirmesi) → o iletiler TEİ'ye döner. Ayarlar ekranındaki uyarı bunu önlemeyi hedefler; kod tarafında engel yoktur.
2. Siriplan platform WhatsApp numarasından tanıtım/pazarlama göndermeye başlarsa → Siriplan İYS yükümlüsü olur.
3. Meta WhatsApp şablonları "Utility" kategorisinden "Marketing" kategorisine geçerse.
4. Ticaret Bakanlığı/İYS uygulaması veya mevzuat değişirse.
5. Siriplan Türkiye'de tüzel kişilik kurarsa → İYS Entegratör modeli yeniden değerlendirilmeli.
