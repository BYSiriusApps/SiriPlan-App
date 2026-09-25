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
