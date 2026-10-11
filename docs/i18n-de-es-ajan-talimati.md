# Görev: SiriPlan çeviri dosyaları — Almanca (de) ve İspanyolca (es)

Sen yalnızca iki YENİ dosya üreteceksin: `messages/de.json` ve `messages/es.json`.
Başka hiçbir dosyaya dokunma. Kod değiştirme, git komutu çalıştırma (commit, push,
branch, stash, reset YOK), `npm install` çalıştırma. Paralelde başka bir ajan kod
tarafını yapıyor; çakışmamak için bu sınır kesin.

## Kaynak
- Ana kaynak: `messages/en.json` (İngilizce). Anlam şüphesinde `messages/tr.json`
  (Türkçe, özgün metin) ile karşılaştır.
- Ürün: SiriPlan — kuaför, berber, güzellik salonu, SPA, klinik için randevu ve
  işletme yönetim SaaS'ı. Hedef kullanıcı: işletme sahibi ve onların müşterisi.
- Yapı: 34 üst düzey anahtar (dashboardBanners, nav, hero, pricing, auth, dashboard,
  booking, privacyPage, termsPage, ... ). Sıra ve iç içe yapı aynen korunacak.

## Kesin kurallar (bozulursa uygulama çöker)
1. **Anahtarlar (key) asla çevrilmez.** Yapı en.json ile birebir aynı olacak:
   aynı anahtar, aynı sıra, aynı iç içe düzey, aynı dizi uzunluğu.
2. **Yer tutucular aynen kalır:** `{name}`, `{count}`, `{used}`, `{limit}`, `{time}`,
   `{staff}` vb. Süslü parantez içindeki ad çevrilmez, silinmez, eklenmez.
3. **ICU çoğul/seçim biçimi korunur:** `{count, plural, one {# randevu} other {# ...}}`
   gibi yapılarda `plural`, `one`, `other`, `select`, `#` sözcükleri çevrilmez; yalnızca
   süslü parantez içindeki görünen metin çevrilir. Almanca ve İspanyolcada kategoriler
   `one` ve `other`'dır (İspanyolcada büyük sayılar için `many` GEREKMEZ, ekleme).
4. **HTML/zengin metin etiketleri aynen kalır:** `<strong>…</strong>`, `<highlight>…</highlight>`
   vb. Etiket adı çevrilmez, etiketler eşleşmeli kalır; yalnızca aralarındaki metin çevrilir.
5. **Çevrilmeyecekler:** marka adları (SiriPlan, SiriusPlan, BY Sirius Group, WhatsApp,
   Instagram, Telegram, Google, Stripe, Meta, Apple, App Store, Google Play, iOS,
   Android), e-posta adresleri, URL'ler, telefon numaraları, kod/ID değerleri, plan
   adları (Mini, Starter, Pro, Business), para birimi simgeleri, rakamlar.
6. Geçerli JSON üret: UTF-8, çift tırnak, kaçış karakterleri doğru, sondaki virgül yok.
   Metin içindeki çift tırnak `\"` ile kaçırılır. `\n` gibi satır sonları korunur.
7. Boş bırakma, "TODO" yazma, İngilizce metni olduğu gibi kopyalama (marka/özel ad
   hariç). Her değer çevrilmiş olmalı.

## Üslup
- **Almanca:** Resmî hitap "Sie" (Siezen). Profesyonel, sade, yerel. Dişil/eril dengesi
  için mümkünse nötr ifade ("Kundschaft", "Team") tercih et. Alman tüketici/işletme
  dilinde yerleşik terimler: Termin, Terminbuchung, Mitarbeiter:innen yerine "Mitarbeitende",
  Kunden, Dienstleistungen, Kalender, Abonnement, Rechnung, Datenschutzerklärung.
- **İspanyolca:** Evrensel (Latin Amerika + İspanya'da anlaşılır) nötr İspanyolca.
  İşletme sahibine "usted" değil, SaaS'larda yaygın olan samimi-profesyonel **"tú"**
  kullan; tutarlı kal. Terimler: cita, reserva, cliente, personal/equipo, servicios,
  calendario, suscripción, factura, política de privacidad.
- Buton ve menü etiketleri kısa olmalı (arayüze sığar). Çevirinin uzunluğu İngilizcenin
  yaklaşık %30'unu geçmesin; Almanca bileşik sözcüklerde kısaltmaya dikkat et.
- Terim sözlüğünü baştan belirle ve her yerde aynı karşılığı kullan (ör. "appointment"
  hep aynı sözcük, "staff" hep aynı sözcük).
- Hukuki sayfalar (privacyPage, termsPage, kvkkPage, cookiesPage, legalDocs,
  purchaseConsent, accountDeletionPage): anlamı koru, kendi yorumunu ekleme, hukuki
  hüküm uydurma. KVKK sayfası Türkiye'ye özgüdür; anlamı aynen çevir. Şüpheli yerleri
  çıktıyla birlikte raporda listele.

## Arayüz bozulmasın (panel ve site görünümü mevcut haliyle kalmalı)
- Düğme, sekme, menü, kutucuk (checkbox) ve tablo başlığı etiketleri İngilizce karşılığından
  belirgin biçimde uzun olmasın; taşma/alt satıra kayma yapıyorsa daha kısa eşanlamlı seç.
  Almanca uzun bileşik sözcükler için özellikle dikkat: gerekirse kısalt ("Terminverwaltung"
  yerine "Termine").
- Değerin başına/sonuna boşluk ekleme veya silme; `\n` ve satır sonlarını koru.
- Yer tutucuyu atlamak ekranda boş ya da ham değer gösterir: personel adı `{staff}`, hizmet
  adı `{service}` gibi yer tutucular her çeviride bulunmalı ve ekrana ID/kod değil
  isim basılmasını sağlar. Birini kaybetmek bu yüzden yasak.
- Eksik/boş değer bırakma: eksik anahtar arayüzde ham anahtar adı (ör. `dashboard.title`)
  olarak görünür.
- Hizmet/personel gibi veritabanından gelen adlar çevrilmez; yalnızca etiket metni çevrilir.

## Kapsam: yalnızca metin çevirisi
- Görev SADECE metin çevirisidir. Yazı tipi, renk, hover efekti, kart, ikon, emoji ve
  yerleşim hiçbir şekilde değişmeyecek. Değerlerdeki emoji ve ikon karakterlerini
  (✓, →, •, 🇹🇷 vb.) aynen koru; çevirme, silme, ekleme.
- Panel yavaşlamamalı: dosyayı şişirme. Gereksiz uzun açıklama, tekrar, ek metin
  ekleme; en.json'daki kadar kısa ve öz kal.
- Sonuç, mevcut dillerdeki (tr/en) görünümle aynı ve düzgün görünmeli.

## Çalışma yöntemi
1. En.json'u parça parça (üst düzey anahtar grupları halinde) çevir; büyük olduğu için
   tek seferde yapmaya çalışma. Her parçadan sonra dosyayı geçerli JSON olarak yaz.
2. Bitince doğrula (yalnızca okuma/çalıştırma, dosya değiştirmeyen komutlar):
   - `node -e "JSON.parse(require('fs').readFileSync('messages/de.json','utf8'))"` (ve es için)
   - `npm run i18n:audit` (varsa anahtar eşleşmesini kontrol eder; de/es henüz kayıtlı
     değilse hata verebilir — sorun değil, o durumda kendi karşılaştırma betiğini
     geçici dizinde yaz: en.json ile aynı anahtar kümesi, aynı `{…}` yer tutucu kümesi,
     aynı HTML etiket kümesi her değer için eşleşmeli.)
3. Teslim: `messages/de.json`, `messages/es.json` + kısa rapor: (a) toplam anahtar sayısı
   en ile aynı mı, (b) yer tutucu/etiket uyuşmazlığı var mı, (c) emin olmadığın
   ifadelerin listesi (anahtar yolu + sebep), (d) belirlediğin terim sözlüğü.

## Yapma
- en.json, tr.json, ru.json, ar.json veya başka dosyayı düzenleme.
- `languages.ts`, `routing.ts` gibi kod dosyalarına dil ekleme (başka ajan yapıyor).
- Anahtar ekleme/silme/yeniden adlandırma. Çevirisi zor bir değer olsa bile en.json'daki
  anahtar kümesi birebir korunur.
