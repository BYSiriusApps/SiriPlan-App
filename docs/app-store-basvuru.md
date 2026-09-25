# Apple App Store — Başvuru Yol Haritası (SiriPlan iOS / PWABuilder)

> Son güncelleme: 2026-09-18
> Durum: **Devam ediyor.** Play Store zaten yayında (bkz. `docs/play-store-basvuru.md`, memory `play-store-submission-state`). Bu doküman aynı uygulamayı Apple tarafında yayınlamak için gereken adımları listeler.
> Mac bilgisayar **yok** → **Codemagic** ile çözülüyor (Adım 3, Seçenek A — karar verildi). Apple Developer Program başvurusu **onaylandı**, kalan yalnızca yıllık ücret ödemesi. Ekran görüntüleri iOS boyutuna (1320×2868) dönüştürülüp hazırlandı (Adım 6).

## Kritik yol (en çok zaman alanlar — hemen başlat)

Aşağıdaki iki madde günler sürebilir, geri kalan her şeyden önce başlatılmalı:

1. **Apple ID / iCloud şifre kurtarma** (Adım 0) — Developer Program kaydı, App Store Connect, TestFlight, hatta App Store'dan uygulama indirmenin kendisi hep aynı Apple ID'ye bağlı. Bu çözülmeden hiçbir şey ilerlemez.
2. **Apple Developer Program — Organization (kurumsal) hesap ise D-U-N-S doğrulaması** (Adım 1) — 1-30 iş günü sürebilir.

---

## Adım 0 — Apple ID / iCloud şifresini kurtar

İyi haber: iPhone zaten bu Apple ID ile oturum açık durumda. Bu, eski şifreyi bilmeye **gerek kalmadan** cihaz üzerinden şifre değiştirmeyi mümkün kılar:

1. iPhone'da **Ayarlar → [en üstteki isim/profil] → Şifre ve Güvenlik → Şifreyi Değiştir**.
2. Sistem eski şifreyi sormaz — yalnızca cihazın kilidini (Face ID / Touch ID / şifre) ister.
3. Yeni şifreyi bir parola yöneticisine kaydet (bundan sonra Developer Program, App Store Connect, TestFlight hep bu şifreyle).

Eğer bu ekran çalışmazsa (ör. cihaz iCloud'da tam oturum açık değil): **iforgot.apple.com** üzerinden hesap kurtarma başlat. İki faktörlü doğrulama cihazı da kayıpsa Apple'ın "Hesap Kurtarma" süreci devreye girer ve **3-5 gün bekleme süresi** olabilir — bu ihtimal varsa en başta tetiklenmeli.

Bu adım tamamlanınca App Store'dan uygulama indirme sorunu da otomatik çözülür (TestFlight'ı indirebilmek için gerekli).

---

## Adım 1 — Apple Developer Program kaydı ($99/yıl)

- developer.apple.com/programs → **Enroll**.
- Hesap türü seçimi:
  - **Individual** — D-U-N-S gerekmez, anında başlar; App Store'da geliştirici adı olarak **kişi adı** görünür.
  - **Organization** — App Store'da **şirket adı** (SiriPlan / BY SIRIUS) görünür, ama **D-U-N-S numarası** ve yasal imza yetkisi ister.
- UK Ltd şirket zaten var (Companies House **17142392**, bkz. memory `legal-compliance-posture`). Apple'ın D-U-N-S arama aracında (developer.apple.com/enroll → Organization → D-U-N-S lookup) önce bu şirketi ara — İngiltere'deki kayıtlı şirketler çoğu zaman D-U-N-S veritabanında zaten mevcuttur ve anında eşleşebilir. Eşleşme yoksa ücretsiz D-U-N-S başvurusu **5-30 iş günü** sürebilir.
- Play Store'da kurumsal doğrulama zaten yapılmıştı ("Hesap türü: Kurumsal, kimlik doğrulandı" — memory `play-store-basvuru`); aynı belgeler (şirket kaydı, yetkili kişi) Apple tarafında da işe yarar.
- **Öneri:** Individual ile hemen başlayıp App Store'a girmek, Organization'a sonradan geçmekten daha hızlı olabilir — ama geliştirici adı olarak kişi adının görünmesini istemiyorsan D-U-N-S sürecini en başta başlat, beklerken diğer adımlara (2-9) devam et.

---

## Adım 2 — PWABuilder ile iOS paketi oluştur

- pwabuilder.com → `https://siriplan.com` gir → Package for iOS.
- Manifest zaten hazır (`public/manifest.json`) — isim, tema rengi (`#022058`), ikonlar dahil.
- Bundle ID: Android'de kullanılan `com.siriplan.app` aynen kullanılabilir (App Store ile Play Store ayrı isim alanı, çakışma olmaz).
- İkon: `public/icons/icon-store-1024x1024.png` zaten mevcut, alfa kanalsız 1024×1024 — PWABuilder'a bu dosyayı ver.
- PWABuilder çıktısı bir **Xcode projesi (.zip)** — bunu açıp derlemek için macOS + Xcode şart (Apple, Transporter/Xcode dışında imzalama yolu sunmuyor; Windows'ta çalışan resmi bir alternatif yok). Bu yüzden Adım 3 gerekiyor.

---

## Adım 3 — Mac ihtiyacı: nasıl çözülür (Mac'in yok)

> **Karar verildi: Seçenek A (Codemagic).** Aşağıdaki "Codemagic — yapılacaklar" alt bölümü somut, sıradaki adımları listeler. B ve C seçenekleri referans olarak kalıyor.

Üç seçenek, önerilen sırayla. Kısa karşılaştırma:

| | Codemagic (A) | MacInCloud (B) | Ödünç Mac (C) |
|---|---|---|---|
| İlk kurulum süresi | ~30-45 dk (tek seferlik) | ~15 dk hesap açma + kullandıkça | Mac sahibinin uygunluğuna bağlı |
| Maliyet | Ücretsiz katman genelde yeter | ~$1-3 (tek seferlik 1-2 saat) | $0 |
| Sonraki güncellemeler | Otomatik (git push yeter) | Her seferinde tekrar kiralama + manuel adımlar | Tekrar rica etmek gerekir |
| Teknik zorluk | Orta (API key + signing ayarı bir kere) | Düşük (GUI, elle Xcode) | Düşük (GUI, elle Xcode) |

### Seçenek A — Codemagic (önerilen, tek seferlik kurulum + kalıcı çözüm)

**Maliyet:** Ücretsiz katman ayda 500 dakika macOS build (SiriPlan boyutunda bir proje için build başına ~10-20 dk sürer, yani ayda 25+ build ücretsiz sınırda kalır — pratikte hiç ödeme gerekmez).

**Kurulum adımları:**
1. GitHub'da PWABuilder çıktısı Xcode projesini içeren **ayrı, küçük bir repo** oluştur (örn. `siriplan-ios`) — ana `randevu-sistemi` reposuna karıştırmaya gerek yok.
2. codemagic.io'ya GitHub hesabınla giriş yap, "Add application" ile bu repoyu bağla.
3. App Store Connect'te bir **API Key** oluştur: App Store Connect → **Users and Access → Integrations → App Store Connect API → +** — Issuer ID, Key ID ve indirilen `.p8` dosyasını not al. (Bu adım tamamen web üzerinden yapılır, Mac gerekmez.)
4. Codemagic → proje → **Team Settings → Code signing identities → App Store Connect** bölümüne bu üç bilgiyi (Issuer ID, Key ID, `.p8`) gir. Codemagic bundan sonra sertifika ve provisioning profilini Apple ile kendisi otomatik oluşturur (elle imzalama gerekmez).
5. Codemagic'in workflow editöründen (YAML yazmaya gerek yok, GUI'den seçilebilir) hazır **"iOS App Store" şablonunu** seç: build → archive → App Store Connect'e (TestFlight) yükle adımları otomatik gelir.
6. **"Start new build"** — Codemagic kendi bulut Mac'inde derler, imzalar, yükler; sonucu e-postayla bildirir.

**Avantaj:** Barkod/mikrofon gibi gelecekteki native izin güncellemelerinde (Android tarafında AAB sürüm 3/1.0.0.3'te olduğu gibi periyodik oldu) tekrar Mac kiralamana gerek kalmaz — sadece kodu push edersin, gerisini Codemagic yapar.
**Dezavantaj:** İlk kurulum (API key + signing ayarı) diğerlerine göre biraz daha teknik, ama tek seferlik.

#### Codemagic — sırada ne var (iş bölümü)

Bu adımların çoğu kendi Apple/GitHub/Codemagic hesaplarınla ilgili olduğu için tarayıcıdan senin yapman gerekiyor — ben burada olmadığım için oturum açamıyorum. Sırasıyla:

**Senin yapman gerekenler:**
1. Apple Developer Program yıllık ücretini öde ($99) → hesap tam aktif olur.
2. pwabuilder.com'a git → `https://siriplan.com` gir → **Package for iOS** → Bundle ID `com.siriplan.app`, ikon olarak `public/icons/icon-store-1024x1024.png` → indir (bir `.zip`).
3. GitHub'da yeni, boş bir repo oluştur (örn. `siriplan-ios`, private).
4. İndirdiğin zip'i aç, içeriğini bu yeni repoya push et (GitHub Desktop veya `git` ile — istersen ben bu push komutlarını senin için yazabilirim, sadece zip'i bir klasöre çıkarman yeterli).
5. App Store Connect → **Users and Access → Integrations → App Store Connect API → +** → yeni key oluştur → **Issuer ID**, **Key ID** ve indirilen `.p8` dosyasını bir yere kaydet (bunlar hassas bilgi, kimseyle paylaşma).
6. codemagic.io'ya GitHub hesabınla kaydol → **Add application** → `siriplan-ios` reposunu seç. Codemagic projeyi tarayınca Xcode proje/scheme adını otomatik algılar.
7. Codemagic proje ayarlarında **Distribution → iOS code signing → App Store Connect** kısmına 5. adımdaki üç bilgiyi (Issuer ID, Key ID, `.p8`) gir.
8. Workflow editöründe hazır **"iOS App Store"** şablonunu seç, **"Publish to App Store Connect (TestFlight)"** seçeneğini aç → **Start new build**.

**Benim yapabileceklerim (istersen):**
- 4. adımdaki `git init/add/commit/push` komutlarını senin için hazırlarım — zip'i çıkardığın klasörün yolunu ver.
- Codemagic'in ürettiği hata loglarını yapıştırırsan (signing/build hatası vb.) birlikte çözeriz.
- PWABuilder projesinin gerçek Xcode şema/hedef adını paylaşırsan, GUI yerine tam otomatik bir `codemagic.yaml` da yazabilirim (versiyon kontrolü + tekrarlanabilirlik için GUI ayarından daha sağlam).

### Seçenek B — MacInCloud (cloud Mac kiralama, tek seferlik ve basit)

**Maliyet:** Pay-As-You-Go plan **~$1/saat** (kredi kartıyla anlık başlat/durdur, dakika bazlı kesinti). Tek seferlik build+submit için 1-2 saat yeterli → toplam **~$1-3**. (Alternatif: 7/24 erişimli aylık "Managed Server" plan ~$20-30/ay var ama tek seferlik ihtiyaç için gereksiz.)

**Kurulum adımları:**
1. macincloud.com → hesap aç → **Pay-As-You-Go** planını seç, kredi kartı bilgisini gir.
2. Bir Mac instance başlat (birkaç dakikada hazır olur), verilen RDP/Jump Desktop bağlantısıyla uzaktan bağlan.
3. Xcode genelde önceden kurulu gelir — sürüm eskiyse App Store'dan güncelle (bunun için de Apple ID ile giriş gerekir, Adım 0 burada da devreye girer).
4. PWABuilder'dan indirdiğin zip'i tarayıcı üzerinden bu Mac'e indir (uzak masaüstünden siriplan hesabına ya da doğrudan pwabuilder.com'a giriş yapıp indirebilirsin).
5. Zip'i aç, `.xcodeproj`'u Xcode ile aç → Adım 4'teki imzalama + Archive + Upload adımlarını uygula.
6. İş bitince instance'ı **durdur** (saatlik ücretlendirme durur, unutma).

**Avantaj:** Basit, tamamen GUI üzerinden, teknik ön bilgi gerektirmez.
**Dezavantaj:** Her güncellemede aynı süreci tekrar kiralayıp tekrar elle yapman gerekir; uzak masaüstü bağlantısı internet hızına bağlı olarak yavaş hissettirebilir.

### Seçenek C — Ödünç Mac

**Maliyet:** $0 (yalnızca zaman — Xcode kurulu değilse ~10-15GB indirme, App Store üzerinden ücretsiz ama süre alır).

**Kurulum:** Aynı Adım 4'teki manuel süreç, sahibinin Mac'inde uygulanır.

**Avantaj:** Ücretsiz.
**Dezavantaj:** Mac sahibinin uygunluğuna bağımlısın; her güncellemede tekrar rica etmen gerekir.

**Öneri:** İlk gönderim için hızlı ve garantili olan **MacInCloud (B)** ile başla (~$1-3, aynı gün biter). Uygulama onaylandıktan sonra, gelecekteki güncellemeler (yeni izinler, yeni native özellikler) için bir kereliğine **Codemagic (A)**'yı kur — o zaman bir daha hiç Mac kiralamana gerek kalmaz.

---

## Adım 4 — Xcode'da imzalama ve yükleme

(Codemagic kullanılıyorsa bu adım otomatik; cloud Mac/ödünç Mac ile manuel yapılıyorsa:)

1. PWABuilder zip'ini aç, `.xcodeproj` dosyasını Xcode ile aç.
2. **⚠️ ZORUNLU — User-Agent işaretçisi:** WKWebView'ın `customUserAgent` / `applicationNameForUserAgent` değerine **`SiriPlanApp`** ekle (bkz. `src/lib/mobile-app-shared.ts` → `MOBILE_APP_UA_MARKER`). Bu atlanırsa `proxy.ts`'teki `isMobileAppRequest()` iOS'ta "native uygulama içindeyim" sinyalini hiç alamaz (Android'deki `android-app://` referer'ının iOS karşılığı yok) — kayıt/ödeme/pazarlama sayfalarının native'de engellenmesi (route kilidi) ve panel bileşenlerindeki mobil-özel gizlemeler (bkz. `useIsMobileApp()`) tamamen devre dışı kalır. PWABuilder'ın iOS şablonunda bu genelde `AppDelegate.swift` veya `WebViewController.swift` içindeki WKWebView kurulum kodunda tek satırlık bir ekleme.
3. **Signing & Capabilities** sekmesinde Apple ID ile giriş yap, Team seç, **"Automatically manage signing"** işaretle (Xcode sertifika + provisioning profili kendisi oluşturur, manuel işlem gerekmez).
4. Üstteki cihaz seçiciden **"Any iOS Device (arm64)"** seç.
5. **Product → Archive**.
6. Archive tamamlanınca açılan **Organizer** penceresinde **Distribute App → App Store Connect → Upload**.
7. Yüklemeden sonra TestFlight'ta gerçek cihazda doğrula: **Giriş ekranında "Hesabınız yok mu?" satırı hiç görünmemeli** — bu artık hem Android hem iOS için geçerli (aşağıdaki not).

---

## Adım 5 — App Store Connect: uygulama kaydı

- appstoreconnect.apple.com → **My Apps → +  → New App**.
- Platform: iOS. İsim: `SiriPlan` (Play Store'dakiyle aynı isim App Store'da da kullanılabilir, mağazalar arası çakışma olmaz).
- Bundle ID: Adım 2'de oluşturduğun `com.siriplan.app` kaydını seç.
- SKU: örn. `siriplan-ios-001` (serbest, yalnızca iç referans).
- Birincil dil: Türkçe.

---

## Adım 6 — Mağaza metinleri ve ekran görüntüleri

Play Store metinleri doğrudan taban alınabilir (`docs/play-store-basvuru.md` → "Mağaza girişi metinleri"), küçük uyarlamalarla:

- **Uygulama adı:** `SiriPlan`
- **Alt başlık (30 karakter, App Store'a özgü alan):** örn. `Randevu & Salon Yönetimi`
- **Açıklama / anahtar kelimeler:** Play Store tam açıklamasından türetilebilir; App Store ayrıca 100 karakterlik ayrı bir "Keywords" alanı ister (virgülle ayrılmış, örn. `randevu,kuaför,berber,güzellik salonu,personel takvimi,müşteri yönetimi`).
- **Ekran görüntüleri — HAZIR:** `docs/app-store/screenshots/` altında 10 adet, **1320×2868** (Apple'ın 2026'da zorunlu tuttuğu tek boyut: 6.9" iPhone — App Store Connect bu tek boyuttan diğer tüm cihazlara otomatik ölçekliyor, ayrı boyut seti gerekmiyor). Kaynak: `docs/sosyal-medya/2026-09-app-tanitim-gorselleri/playstore/` (1080×1920 Play Store promosyon görselleri) → `scripts/app-store-screenshots.mjs` (sharp) ile genişlik 1320'ye orantılı ölçeklenip yükseklik kenar-renk pad'iyle 2868'e tamamlandı (dikişsiz, fotoğraf/metin bozulmadı). Yeniden üretmek gerekirse: `node scripts/app-store-screenshots.mjs`.
- **İkon:** `public/icons/icon-store-1024x1024.png` (mevcut, hazır).
- Not: App Store'un Play Store'daki "feature graphic" (1024×500) karşılığı yok — bu görsel Apple tarafında kullanılmıyor, atlanabilir.

---

### ⚠️ 2026-09-22 — Bulunan risk / 2026-09-23 kesin çözüm: giriş ekranındaki "Kayıt Ol" bağlantısı

Android sürümünde giriş ekranına (`src/app/auth/giris/page.tsx`) sonradan eklenen "Tarayıcıda ücretsiz kayıt olun" bağlantısı, tıklanınca `target="_blank"` ile harici tarayıcıda `siriplan.com/auth/kayit`'i açıyordu — o akış plan seçimi/ödemeyle bitiyor. Bu, Google Play'de tek başına sorun değildi (Android TWA harici tarayıcıya çıkmayı destekliyor, Play bu tür B2B harici bağlantılara Apple kadar katı değil), **ama Apple'da sorun**: Guideline 3.1.1 yalnızca uygulama içi satın alma akışını değil, satın almaya yönlendiren **"external links"i de** kapsıyor. İlk müdahalede (2026-09-22) yalnızca iOS'ta gizleyen bir `useIsIOSApp()` ayrımı eklenmişti.

**2026-09-23 — kapsam genişletildi:** Native uygulama yalnızca "giriş + panel" olmalı kararı netleşince bu ayrım kaldırıldı; bağlantı artık `useIsMobileApp()` ile **hem Android hem iOS'ta** tamamen gizli — mobil uygulamada kayıt/ödemeye giden hiçbir buton veya link yok. `useIsIOSApp()` fonksiyonu bu tek kullanım yeri kalktığı için `use-mobile-app.ts`'ten silindi.

**Not:** Adım 4, madde 2'deki `SiriPlanApp` User-Agent işaretçisi bu spesifik bağlantıdan bağımsız olarak hâlâ zorunlu — `proxy.ts`'in iOS'ta "native uygulama içindeyim" sinyalini alabilmesinin TEK yolu bu (bkz. yukarıdaki not).

---

## Adım 7 — App Privacy (Nutrition Label)

Play Store "Data safety" formunda beyan edilenle birebir aynı içerik, Apple'ın kendi formunda tekrarlanır:

- Toplanan veri: Ad, e-posta, telefon, uygulama içi kullanım verisi.
- Amaç: Hesap yönetimi + uygulama işlevi.
- Üçüncü tarafla paylaşım: Yok.
- Aktarımda şifreleme: Var.
- Kullanıcı silme talep edebilir: Var (Ayarlar → "Hesabımı Sil").
- WhatsApp/SMS entegrasyonları isteğe bağlı ve varsayılan kapalı — yalnızca işletme kendi hesabını bağlarsa müşteri ad+telefon o sağlayıcıya gider (bkz. `/gizlilik`, `/kvkk`).

---

## Adım 8 — Yaş derecelendirmesi (Age Rating)

Apple'ın anket tabanlı sistemi (şiddet/kaba içerik/kumar vb. soruları) — SiriPlan'da bu içeriklerin hiçbiri yok, beklenen sonuç **4+**.

---

## Adım 9 — Reviewer notları (App Review Information)

Play Store için hazırlanan 3.1.1 / 3.1.3(c) gerekçesi (memory `app-store-iap-compliance`, `docs/play-store-basvuru.md`) Apple incelemesi için de **aynen geçerli** — kod tarafında `isMobileApp()` / `proxy.ts` route kilidi platform bağımsız (Android'de yapılan kapatmalar iOS wrapper'da da otomatik geçerli, ek kod değişikliği gerekmez).

**App Review Information alanına (İngilizce):**

```
SiriPlan is a B2B SaaS appointment-management tool for hair salons, barbershops and beauty
businesses (staff scheduling, calendar, customer records, income/expense reporting).

Subscriptions are sold ONLY on our website (siriplan.com) as a business service and are NOT
offered through Apple's in-app purchase system. Per Guideline 3.1.3(c) (Enterprise Services),
this is a B2B service sold directly to businesses — the app contains no in-app purchase, no
payment surface, and no link, button or text directing to purchase outside the app. Account
creation and plan selection are intentionally unavailable inside the app and redirect to the
sign-in screen.

OPTIONAL THIRD-PARTY INTEGRATIONS (WhatsApp Business, SMS, and Instagram/Facebook Messenger). The
app has three optional messaging integrations for appointment reminders, confirmations, and
automated customer replies: (1) WhatsApp Business - each business connects its own Meta WhatsApp
Business account; (2) SMS provider - each business enters its own SMS gateway API key; (3)
Instagram & Facebook Messenger - each business connects its own Meta Page access token to
auto-reply to incoming DMs. In the demo account all three settings panels are intentionally left
unconfigured and appear empty. This is expected, not a defect: when no credentials are entered
the app simply does not send/receive these optional messages, and every other feature (booking,
calendar, staff, customers, reporting) works fully.

Demo login (owner, full access): sahip.demo@siriplan.com / Sahip!2026Demo

The app is a native wrapper (WKWebView) of our responsive web application, built with PWABuilder.
Bundle ID com.siriplan.app.
```

Demo hesap giriş: `sahip.demo@siriplan.com` / `Sahip!2026Demo` (bkz. memory `demo-test-accounts` — başvurudan hemen önce `scripts/demo-refresh.mjs --apply` ile veriyi tazele).

---

## Adım 10 — TestFlight ile kendi cihazında test et (önerilir, zorunlu değil)

- App Store Connect → TestFlight → kendini **Internal Tester** olarak ekle (aynı Apple ID / App Store hesabı).
- iPhone'a **TestFlight** uygulamasını App Store'dan indir (Adım 0 tamamlandıysa bu artık mümkün).
- Gerçek cihazda: adres çubuğu görünmüyor mu, giriş çalışıyor mu, ödeme/plan yüzeyi hiç görünmüyor mu — doğrula.

---

## Adım 11 — İncelemeye gönder

App Store Connect'te build seçilip tüm alanlar (metadata, gizlilik, yaş derecelendirmesi, reviewer notları, fiyatlandırma = Ücretsiz) dolduktan sonra **Add for Review → Submit to App Review**.

---

## Maliyet özeti

| Kalem | Tutar |
|---|---|
| Apple Developer Program | $99/yıl |
| Codemagic (karar verilen yol) | Ücretsiz katman genelde yeterli |

## Kalan adımlar (checklist)

- [ ] Adım 0 — Apple ID / iCloud şifresi kurtarıldı
- [x] Adım 1 — Developer Program başvurusu onaylandı (2026-09-18) — kalan: yıllık ücret ($99) ödemesi
- [x] Adım 2 — PWABuilder iOS paketi indirildi (2026-09-23)
- [x] Adım 3 — Codemagic kurulumu tamamlandı (2026-09-23) — repo `BYSiriusApps/siriplan-ios`, App Store Connect API Key (Admin rolü), UI-managed Code Signing Identities (sertifika + provisioning profile), `codemagic.yaml` (fetch-signing-files scripti kaldırılmış final versiyon)
- [x] Adım 4 — Codemagic build başarılı, App Store Connect'e (TestFlight) yüklendi (2026-09-23, build #7, 2.93 MB)
- [x] Adım 5 — App Store Connect'te uygulama kaydı açıldı (Apple ID 6815322807, SKU siriplan-ios-001)
- [x] Adım 6a — Ekran görüntüleri iOS boyutuna (1320×2868) dönüştürüldü (2026-09-18) — `docs/app-store/screenshots/`
- [x] Adım 6a-2 — iPad ekran görüntüleri (2064×2752, "13" Display") üretildi ve yüklendi (2026-09-23) — `docs/app-store/screenshots-ipad/`, `scripts/app-store-screenshots-ipad.mjs`
- [x] Adım 6b — Mağaza metinleri (isim/alt başlık/açıklama/keywords/support+marketing URL) girildi (2026-09-23)
- [x] Adım 7 — App Privacy formu dolduruldu ve yayınlandı (2026-09-23) — 9 veri türü, hepsi "App Functionality" amaçlı, tracking yok
- [x] Adım 8 — Yaş derecelendirmesi anketi tamamlandı (2026-09-23) — sonuç 4+
- [x] Adım 9 — Reviewer notları + demo giriş girildi (2026-09-23)
- [x] Adım 10 — TestFlight ile cihazda test edildi (2026-09-23) — giriş çalıştı, "Hesabınız yok mu?" satırı iOS'ta doğrulanan şekilde gizli
- [x] Adım 11 — İncelemeye gönderildi (2026-09-23 21:53, Submission ID 1676ea41-1e67-4673-b5b6-f078637267a3) — durum: **Waiting for Review**
- [x] Adım 12 — Reddedildi (2026-09-24, Submission ID 1676ea41-1e67-4673-b5b6-f078637267a3): PWABuilder'ın varsayılan placeholder izin metinleri ("Capture Video/Audio by user request", "Track current location by user request") Apple'ın otomatik taramasında yetersiz bulundu (NSCameraUsageDescription, NSMicrophoneUsageDescription, NSLocationWhenInUseUsageDescription). `BYSiriusApps/siriplan-ios` reposunda `src/SiriPlan/Info.plist` içindeki üç metin, gerçek kullanım amacına göre somut/açıklayıcı hale getirildi (kamera→barkod tarama+hizmet/müşteri/logo fotoğrafı, mikrofon→sesli randevu/stok asistanı, konum→website ayarlarında "Konumumu kullan" butonu) ve commit `e77a1c3` ile main'e push edildi (2026-09-24).
- [x] Adım 13a — Reviewer Notes metnine Instagram/Facebook Messenger de eklendi (2026-09-24, yukarıdaki Adım 9 bloğu güncellendi) — demo hesapta WA/SMS/Instagram üçü de bilerek boş, App Review Information'a bunu App Store Connect'te elle güncellemek gerekiyor (build gerektirmez, metadata).
- [x] Adım 13b — TAMAMLANDI (2026-09-25): build number 1→2 bump edildi (commit `dbc2911`, App Store Connect "previousBundleVersion" hatası çözüldü), TestFlight Test Information (Feedback Email, Beta App Review contact+sign-in) dolduruldu, App Review Information Notes güncel metinle (Instagram/WhatsApp/SMS dahil) değiştirildi, build 2 sürüme bağlandı ("1 (2)" — Ready for Review), **Resubmit to App Review** basıldı — durum: **Waiting for Review**.
- [ ] Adım 14 — TAKİP: İkinci inceleme sonucu bekleniyor (2026-09-25).

### Resubmit yol haritası (red yememek için sırayla)

1. **Codemagic build'i başlat.** PWABuilder'dan yeniden indirmeye gerek YOK — sadece `Info.plist` metni değişti, native proje (Xcode şeması/WKWebView kurulumu) aynı; `e77a1c3` commit'i zaten `main`'de. Codemagic panelinden **Start new build** (workflow: `ios-app-store`) — otomatik tetiklenmediyse elle başlat.
2. **Build TestFlight'a yüklenene kadar bekle** (codemagic.yaml → `submit_to_testflight: true`, otomatik olur). E-posta ile bildirim gelir.
3. **(Önerilir) TestFlight'ta gerçek cihazda hızlı kontrol:** kamera/mikrofon/konum izin diyaloglarından biri tetiklendiğinde (ör. barkod tarama veya sesli randevu) artık yeni açıklama metninin çıktığını doğrula — placeholder metnin gerçekten değiştiğini teyit eder.
4. **App Store Connect → uygulama sürümü:** yeni build'i seç.
5. **App Review Information** kutusundaki metni yukarıdaki güncellenmiş sürümle (Instagram/Messenger eklenmiş hali) değiştir.
6. **Add for Review → Submit to App Review.** Bu bir "resubmission" — önceki reddin Resolution Center'ından yanıt yazmak YETMEZ, çünkü yeni bir binary yükledik; metadata-only bir düzeltme olsaydı Resolution Center yeterdi ama burada kod (Info.plist) değişti.
7. Durumu takip et — "Waiting for Review" → genelde 24-48 saat.
