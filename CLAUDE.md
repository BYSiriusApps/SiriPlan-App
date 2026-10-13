@AGENTS.md

# Değişmez kurallar (her görevde geçerli)

Bu depoda yapılan HER değişiklikte, ayrıca hatırlatılmasa bile:

- **Veri sızıntısı yaratma.** Kiracılar (organizasyonlar) arası veri asla
  karışmasın/görünmesin; API/sorgu değişikliklerinde org_id/RLS kapsamını
  daima koru (bkz. geçmişteki çapraz-kiracı sızıntı bulguları).
- **Güvenlik açığı açma.** Auth, yetkilendirme, RLS, CSP, middleware
  (`src/proxy.ts`) gibi güvenlik kritik kod yollarına dokunurken davranışı
  daraltma yönünde değil asla gevşetme yönünde değiştirme; şüpheliysen
  dokunma, ayrı onay iste.
- **Ana işleyişi bozma.** Mesajlaşma (WhatsApp/SMS/Telegram bildirimleri),
  randevu/kayıt kaydetme, düzenleme akışları her zaman aynı şekilde
  çalışmaya devam etmeli — performans/refactor amaçlı değişiklikler bu
  akışların davranışını (ne zaman/nasıl tetiklendiği, hangi verinin
  gönderildiği) değiştirmemeli.
- **İzin kutucukları ve butonların işlevini aynen koru.** Personel
  yetki/izin kutucukları, onay/red/iptal gibi aksiyon butonları şu an nasıl
  çalışıyorsa (hangi izin neyi açıp kapatıyor, hangi buton hangi API'yi
  çağırıyor) öyle çalışmaya devam etmeli; kapsam dışı bir "düzeltme" olarak
  bile olsa kullanıcı açıkça istemeden bu davranışı değiştirme.

Bu kurallar riskli/belirsiz bir değişiklik yapmadan önce her zaman geçerlidir;
kullanıcının ayrıca tekrar etmesine gerek yok.

# Test kuralı: demo hesapta bildirim numaraları (her test aşamasında)

Demo org (**Sirius Demo Güzellik Salonu**, slug `sirius-demo-salon`) üzerinde
randevu onay / revize / iptal / yeni saat önerisi gibi bildirim ve mesaj (WhatsApp,
SMS, Telegram, push) üreten HER testte, mesajlar gerçek müşteri numaralarına
değil aşağıdaki test numaralarına gitmelidir:

- **Hesap sahibi (owner) numarası:** `5553287509` (E.164: `+905553287509`)
- **Personel numarası** (randevuya personel atanmışsa / seçiliyse): `5355032634`
  (E.164: `+905355032634`)

Uygulama:
- Teste başlamadan önce demo org sahibinin ve test için seçilen personelin telefon
  alanını bu numaralara ayarla; test randevusunda müşteri telefonu olarak da bu
  numaralardan birini kullan. Gerçek görünümlü `05xx` demo müşteri numaralarına
  asla mesaj tetikleme.
- Personel seçili değilse yalnızca sahip numarasına gitmeli; personel seçiliyse
  hem sahip (`5553287509`) hem personel (`5355032634`) bildirimi doğrulanmalı.
- Bu numaralar yalnızca demo/test org'u içindir; başka kiracıya (organizasyona)
  dokunma, canlı müşteri verisini değiştirme.
- Test bitince oluşturulan test randevularını iptal/temizle (müşteri kaydı silinmez).
