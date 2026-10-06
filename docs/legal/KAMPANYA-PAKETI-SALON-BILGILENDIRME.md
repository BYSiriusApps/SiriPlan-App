# Kampanya Mesaj Paketi — Salon Bilgilendirme Metinleri (TASLAK)

> Avukat onayından önce yayınlanmaz. Metinler sade, tehdit etmeyen ama net olmalıdır. TR esas; EN/RU/AR çeviri avukat metni sonrası yapılır (`messages/*.json`).
> Kullanım yerleri: (1) Paket etkinleştirme ekranı, (2) Kampanya oluşturma ekranı, (3) Yardım/SSS, (4) Satış sayfası dipnotu.

---

## 1. Etkinleştirme ekranı (Ayarlar → Kampanya Paketi)

**Başlık:** Siriplan numarasından kampanya gönderimi

**Kısa açıklama:**
Kampanya ve doğum günü mesajlarınız, Siriplan'ın size özel sağladığı ayrı bir WhatsApp pazarlama numarasından, Meta onaylı şablonlarla gönderilir. Mesajda salonunuzun adı görünür. Randevu bildirimleriniz bu numaradan **etkilenmez**; ayrı numaradan gitmeye devam eder.

**Bilmeniz gerekenler (okuyup onaylamanız gerekir):**

1. **Mesajın göndericisi hukuken sizsiniz.** Siriplan yalnızca teknik altyapıyı sağlar. Ticari elektronik ileti mevzuatı (6563 sayılı Kanun ve Ticari İletişim Yönetmeliği) gereği, mesaj alacak kişilerden **önceden onay** almış olmanız gerekir.
2. **Yalnızca onay vermiş müşterilere gönderilir.** Siriplan, "pazarlama onayı = evet" olmayan müşterilere asla göndermez. Bu işareti doğru kullanmak sizin sorumluluğunuzdadır; onayı olmayan kişiyi onaylı göstermeyin.
3. **İYS:** Mevzuat gereği onaylarınızı İYS'de (iys.org.tr) yönetmeniz gerekebilir. Bu konuda mali müşavirinizden veya hukuk danışmanınızdan bilgi alın. Siriplan İYS üyesi değildir ve sizin yerinize İYS işlemi yapmaz.
4. **Ret (çıkış) hakkı otomatiktir.** Her mesajın altında "RET/STOP yazın" bilgisi yer alır. Müşteri yazdığında bir daha ona mesaj gitmez. Bu kaydı aşamazsınız.
5. **İçerik kuralları:** Yanıltıcı indirim, yasak ürün/hizmet, tıbbi sonuç vaadi gibi içerikler gönderilemez ([Kabul Edilebilir Kullanım Politikası](#)).
6. **Ücret ve kredi:** Paket ücreti ve mesaj kredisi peşindir. Meta'nın kabul etmediği mesaj için kredi iade edilir.
7. **Sorumluluk:** Onaysız veya kurallara aykırı gönderimden doğan idari para cezası ve talepler size aittir (Ek Hizmet Sözleşmesi m.8). Siriplan, kural ihlalinde hizmeti durdurabilir.

**Onay kutuları (hepsi işaretlenmeden "Etkinleştir" aktif olmaz):**
- [ ] Ek Hizmet Sözleşmesi'ni ve Kabul Edilebilir Kullanım Politikası'nı okudum, kabul ediyorum.
- [ ] Mesaj göndereceğim kişilerden önceden ve ispatlanabilir şekilde ticari elektronik ileti onayı aldığımı/alacağımı beyan ederim.
- [ ] Müşterilerime kişisel verilerinin (telefon numarası) WhatsApp (Meta) üzerinden iletilmesine ilişkin aydınlatma yaptığımı beyan ederim.

*(Onay anı ve kullanıcı kaydı: `customer_consents`'tan ayrı, org düzeyinde denetim kaydı olarak tutulur — bkz. Uygulama Planı §3.)*

## 2. Kampanya oluşturma ekranı — uyarı bandı

> Bu kampanya yalnızca **pazarlama onayı olan** müşterilere gönderilir. Seçtiğiniz kitlede **{n}** kişi onaylı, **{m}** kişi onaysız olduğu için hariç tutuldu. Mesaj {kredi} kredi harcayacak. Gönderim 09:00–21:00 arasında yapılır.

## 3. SSS

**Siriplan'ın numarasından gönderince yasal olarak Siriplan mı gönderen oluyor?**
Teknik olarak mesaj Siriplan altyapısından çıkar, ancak içerik ve alıcı seçimi sizindir; mevzuat açısından ileti sahibi sizsiniz. Bu yüzden onay ve ret yükümlülüğü sizdedir.

**Kendi WhatsApp numaramı bağlamak yerine neden bu paket?**
Kendi numaranızı bağlarsanız Meta ve ücretlendirme sizinle olur. Paket, kendi numarası/şablonu olmayan salonlar içindir; onay ve şablon işlerini Siriplan hazır sunar.

**Müşteri "RET" yazarsa ne olur?**
Müşteri otomatik olarak pazarlama listesinden çıkarılır. Siriplan'ın pazarlama numarasından hiçbir salon ona bir daha pazarlama mesajı gönderemez.

**Randevu hatırlatmaları bu paketten mi gidiyor?**
Hayır. Randevu bildirimleri ayrı numaradan gitmeye devam eder; kampanya şikâyeti bunları etkilemez.

**Mesaj sayısı sınırlı mı?**
Evet: günlük ve kampanya başına tavan, müşteri başına sıklık sınırı vardır. Amaç hem mevzuata uyum hem de numaranın engellenmemesidir.

**Müşterimin onayını nereden alırım?**
Randevu sayfasındaki ayrı pazarlama onay kutusu, müşteri kartından elle onay işaretleme (kayıtlı kanal bilgisiyle) veya Siriplan'ın onay talebi bağlantısı kullanılabilir. Telefonda sözlü onay alıyorsanız ne zaman/kim tarafından alındığını not edin; ispat sizdedir.

## 4. Salon İYS rehberi (kısa)

1. iys.org.tr → "İşletme" üyeliği (vergi no/e-Devlet ile).
2. Mevcut müşteri onaylarınızı İYS'ye yükleyin; yeni onayları da İYS'de tutun.
3. Gönderimden önce İYS'deki ret durumunu kontrol etmeniz gerekebilir. (Bu adımın WhatsApp için kapsamı avukat/İYS ile teyit edilecek.)
4. Onay belgelerinizi (kim, ne zaman, hangi kanaldan) saklayın.

*Bu rehber hukuki tavsiye değildir.*

## 5. Salonun yapması gereken ön hazırlık listesi (aktivasyondan önce)

- [ ] Müşteri listemde pazarlama onayı olanlar işaretli, olmayanlar işaretsiz.
- [ ] Yeni rezervasyonlarda ayrı pazarlama onay kutusu açık.
- [ ] İYS üyeliği (gerekiyorsa) tamam.
- [ ] Müşteri aydınlatma metnimde Meta/WhatsApp aktarımı var.
- [ ] Kampanya içeriğim yasak içerik listesinde değil.
