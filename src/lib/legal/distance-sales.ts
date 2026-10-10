import { SELLER } from "./seller";

/**
 * Mesafeli satış sözleşmesi, ön bilgilendirme formu ve iade/iptal politikası
 * metinleri. Türkçe metin esastır; EN çeviridir. RU/AR için İngilizce metin
 * gösterilir (bkz. LegalDocument) — Türkçe metin her durumda bağlayıcıdır.
 *
 * Hukuki dayanaklar: 6502 sayılı Tüketicinin Korunması Hakkında Kanun,
 * Mesafeli Sözleşmeler Yönetmeliği, 6563 sayılı Elektronik Ticaretin
 * Düzenlenmesi Hakkında Kanun, 6698 sayılı KVKK, 3065 sayılı KDV Kanunu.
 * Yürürlükteki parasal sınırlar/oranlar metne yazılmaz (her yıl değişir).
 */

export type LegalSection = { h: string; p: string[] };
export type LegalDoc = { title: string; subtitle?: string; intro?: string[]; sections: LegalSection[] };
export type LegalDocKey = "contract" | "preinfo" | "refund";
export type LegalLang = "tr" | "en";

const addr = {
  tr: SELLER.registeredAddress || "Kayıtlı adres talep üzerine bildirilir",
  en: SELLER.registeredAddress || "Registered address is provided on request",
};

const sellerTr = [
  `Unvan: ${SELLER.legalName}`,
  `Kuruluş yeri / sicil: ${SELLER.jurisdiction.tr} — Companies House No: ${SELLER.registrationNo}`,
  `Adres: ${addr.tr}`,
  `E-posta: ${SELLER.email} · Telefon / WhatsApp: ${SELLER.phone}`,
  `İnternet sitesi: ${SELLER.website}`,
];
const sellerEn = [
  `Name: ${SELLER.legalName}`,
  `Registered in: ${SELLER.jurisdiction.en} — Companies House No: ${SELLER.registrationNo}`,
  `Address: ${addr.en}`,
  `Email: ${SELLER.email} · Phone / WhatsApp: ${SELLER.phone}`,
  `Website: ${SELLER.website}`,
];

/* ───────────────────────── MESAFELİ SATIŞ SÖZLEŞMESİ ───────────────────────── */

const contractTr: LegalDoc = {
  title: "Mesafeli Satış Sözleşmesi",
  subtitle: `SiriPlan abonelik hizmeti · Yürürlük: ${SELLER.effectiveDate.tr}`,
  intro: [
    "Bu sözleşme, siriplan.com üzerinden veya SiriPlan uygulaması/paneli aracılığıyla elektronik ortamda kurulur. Alıcı, ödeme adımında ilgili onay kutularını işaretleyerek bu sözleşmeyi ve Ön Bilgilendirme Formu'nu okuduğunu, anladığını ve kabul ettiğini beyan eder.",
  ],
  sections: [
    {
      h: "1. Taraflar",
      p: [
        "SATICI (Hizmet Sağlayıcı):",
        ...sellerTr,
        "ALICI: Sipariş sırasında kayıt/ödeme formunda ad-soyad veya unvan, e-posta ve (varsa) telefon bilgilerini beyan eden gerçek veya tüzel kişidir. Alıcı bilgilerinin doğruluğundan Alıcı sorumludur.",
        "“Tüketici”, ticari veya mesleki olmayan amaçlarla hareket eden gerçek kişiyi; “Ticari Alıcı” ise hizmeti ticari veya mesleki faaliyeti kapsamında (ör. salon, klinik, serbest meslek sahibi) satın alan gerçek veya tüzel kişiyi ifade eder. Bu sözleşmenin tüketiciye özgü hükümleri (özellikle 7. madde) yalnızca Tüketici için geçerlidir.",
      ],
    },
    {
      h: "2. Sözleşmenin Konusu",
      p: [
        "Sözleşmenin konusu, Alıcı'nın siriplan.com üzerinden seçtiği SiriPlan planına (Mini, Starter, Pro, Business veya Satıcı'nın sunduğu diğer plan/ek paketler) ait çevrimiçi randevu ve işletme yönetimi yazılım hizmetine (SaaS) erişim hakkının, aşağıdaki şartlarla Alıcı'ya sağlanmasıdır.",
        "Planların kapsamı, sınırları (ör. personel sayısı, aylık randevu/mesaj kotası) ve güncel ücretleri sipariş anında ve https://siriplan.com/fiyatlar adresinde gösterilir. Sipariş anında gösterilen plan, süre (aylık/yıllık) ve tutar bu sözleşmenin ayrılmaz parçasıdır.",
        "Hizmet, bir yazılıma çevrimiçi erişimdir; fiziksel bir ürün teslim edilmez.",
      ],
    },
    {
      h: "3. Hizmetin Sunumu ve İfa (Elektronik Ortamda Anında İfa)",
      p: [
        "Hizmet elektronik ortamda sunulur ve ödemenin onaylanmasıyla birlikte Alıcı'nın hesabında planın etkinleştirilmesiyle ifa edilmeye başlanır; fiziksel teslimat ve kargo yoktur. Alıcı'nın hizmete erişebilmesi için internet bağlantısı ve uyumlu bir cihaz/tarayıcı gereklidir.",
        "Hizmetin başlama anı, ödemenin Stripe tarafından onaylanması ve planın hesaba tanımlanmasıdır. Hizmet kesintileri, bakım ve sorumluluk sınırları Kullanım Koşulları'nda (https://siriplan.com/kosullar) düzenlenmiştir.",
      ],
    },
    {
      h: "4. Ücret, Ödeme ve Para Birimi",
      p: [
        "Ücretler, sipariş/ödeme ekranında Alıcı'nın seçtiği plan ve dönem (aylık veya yıllık) için gösterilen tutardır ve gösterilen para biriminde (TRY, USD veya EUR) tahsil edilir. Ödeme, kredi/banka kartıyla, Satıcı'nın ödeme hizmet sağlayıcısı Stripe aracılığıyla peşin olarak alınır. Kart bilgileri Satıcı tarafından saklanmaz; Stripe tarafından işlenir.",
        "Ödeme, Satıcı'nın yurt dışındaki üye işyeri hesabı üzerinden tahsil edildiğinden, Alıcı'nın kartının bankası; işlem tutarı üzerinden komisyon, kur farkı veya yurt dışı işlem bedeli uygulayabilir. Bu bedeller Alıcı'nın bankasına aittir, Satıcı tarafından eklenmez ve Satıcı'nın kontrolünde değildir.",
        "Ödeme karşılığında, Stripe üzerinden elektronik fatura/makbuz (invoice/receipt) Alıcı'nın e-posta adresine iletilir.",
      ],
    },
    {
      h: "5. Satıcı'nın Yurt Dışında Yerleşik Olması ve Vergiler (KDV)",
      p: [
        "Satıcı, İngiltere ve Galler'de kayıtlı bir şirkettir; Türkiye'de yerleşik değildir ve Türkiye'de vergi temsilcisi bulunmamaktadır.",
        "Sipariş/ödeme ekranında gösterilen fiyatlar, uygulanabilir KDV ve diğer vergiler dâhil (vergi dâhil) toplam tutarlardır; gösterilen tutar dışında ayrıca vergi veya ek bedel talep edilmez.",
        "Satıcı yurt dışında yerleşik olduğundan, ödeme karşılığında Stripe üzerinden düzenlenen elektronik fatura/makbuz (invoice/receipt), Türkiye'de düzenlenen KDV'li e-fatura veya e-arşiv fatura yerine geçmez. Alıcı'nın bulunduğu ülke mevzuatı uyarınca kendisine ayrıca beyan, kayıt veya ödeme yükümlülüğü doğuyorsa (ör. Ticari Alıcı'nın giderlerinin muhasebeleştirilmesi veya yurt dışından hizmet alımına ilişkin beyanlar), bunların değerlendirilmesi Alıcı'ya aittir; Satıcı vergi danışmanlığı sunmaz.",
        "Mevzuat değişikliği nedeniyle Satıcı'nın ek vergi tahsil etmesi zorunlu hâle gelirse, bu vergi yalnızca sonraki dönem(ler)e yansıtılır, Alıcı'ya önceden bildirilir ve Alıcı yenilemeden önce aboneliğini iptal edebilir.",
      ],
    },
    {
      h: "6. Abonelik Süresi, Otomatik Yenileme ve İptal",
      p: [
        "Abonelik; Alıcı'nın seçtiği dönem (1 ay veya 1 yıl) için peşin ödenir ve Alıcı iptal etmedikçe her dönem sonunda, güncel plan fiyatı üzerinden, kayıtlı karttan otomatik olarak yenilenir.",
        "Alıcı, aboneliğini istediği zaman panel içinden (Ayarlar → Abonelik) veya info@bysirius.com adresine yazarak iptal edebilir. İptal, bir sonraki yenilemeyi durdurur; Alıcı, ödediği dönemin sonuna kadar hizmeti kullanmaya devam eder. Başlamış dönem için kıst (orantılı) iade yapılmaz; ancak Tüketici'nin kanundan doğan cayma ve iade hakları saklıdır (bkz. madde 7 ve İade ve İptal Politikası).",
        "Satıcı, plan fiyatlarını veya kapsamını değiştirebilir; ücret artışı, mevcut dönemi etkilemez ve sonraki yenilemeden en az 30 gün önce e-posta/panel bildirimiyle duyurulur. Alıcı, yeni fiyatı kabul etmiyorsa yenilemeden önce iptal edebilir. Satıcı, duyurulan fiyatın yürürlüğe girmesinden sonra aboneliği sürdüren Alıcı'nın yeni fiyatı kabul ettiğini kabul eder; Satıcı'nın ilan ettiği “sabit fiyat garantisi” varsa o süre boyunca fiyat artırılmaz.",
        "Ücretsiz deneme süresi (14 gün), ödeme yapılmadan hizmeti değerlendirme amacıyla verilir ve kart bilgisi gerektirmeyebilir. Deneme süresi dolduğunda Alıcı ücretli bir plan satın almadıkça hizmet kısıtlanabilir. Ücretli plan, ödemenin alındığı andan itibaren başlar.",
        "Plan değişiklikleri: yükseltmede, mevcut dönemin kullanılmayan kısmı kredi olarak düşülerek aradaki fark tahsil edilir ve yeni dönem yükseltme anında başlar; düşürmede mevcut dönem korunur, kullanılmayan fark hesaba kredi olarak yansıtılır ve nakit iade yapılmaz. Ayrıntılar İade ve İptal Politikası'ndadır.",
      ],
    },
    {
      h: "7. Cayma Hakkı (Yalnızca Tüketici İçin)",
      p: [
        "Tüketici'nin, 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkı vardır. Ancak mevzuat; elektronik ortamda anında ifa edilen hizmetler ile cayma süresi sona ermeden önce Tüketici'nin onayıyla ifasına başlanan hizmetlerde cayma hakkının kullanılamayacağını veya sınırlı kullanılabileceğini öngörür.",
        "Tüketici, ödeme adımında ayrıca işaretlediği onayla; hizmetin ödemenin ardından hemen (cayma süresi dolmadan) başlamasını talep ettiğini, hizmetin elektronik ortamda anında ifa edilen bir hizmet olduğunu ve bu nedenle hizmet ifa edilmeye başlandıktan sonra cayma hakkını kaybedeceğini açıkça kabul eder.",
        "Yetkili bir merci veya mahkeme, bu onay ve istisnanın somut olayda geçerli olmadığına hükmeder yahut Tüketici ifa başlamadan önce yazılı olarak cayarsa: Tüketici, cayma bildirimini info@bysirius.com adresine iletir; Satıcı, ifa edilmemiş (kullanılmamış) kısma ilişkin tutarı, cayma bildiriminin kendisine ulaşmasından itibaren en geç 14 gün içinde, tahsilatta kullanılan ödeme aracına iade eder. Hizmet bu süre içinde Tüketici'nin talebiyle kullanılmaya başlandıysa, cayma tarihine kadar fiilen kullanılan kısmın bedeli (günlük orantılı) Tüketici'ye ait olur.",
        "Cayma bildirimi için İade ve İptal Politikası'ndaki örnek form kullanılabilir (zorunlu değildir). Ticari Alıcılar tüketici sayılmadıklarından cayma hakkına sahip değildir.",
      ],
    },
    {
      h: "8. Alıcı'nın Yükümlülükleri ve Kabul Edilebilir Kullanım",
      p: [
        "Alıcı; hesabını ve şifresini korumakla, hizmeti hukuka, Kullanım Koşulları'na ve kabul edilebilir kullanım kurallarına uygun kullanmakla, hizmete yüklediği içerik ve kişisel verilerden (kendi müşterilerinin verileri dâhil) ve bunların mevzuata uygunluğundan (KVKK/UK GDPR aydınlatma ve onay yükümlülükleri dâhil) sorumludur.",
        "Alıcı; sistemin güvenliğini tehlikeye atan, kopyalama, tersine mühendislik, otomatik toplu veri çekme (scraping) veya hizmetin haksız yeniden satışı gibi eylemlerde bulunamaz. İhlal hâlinde Satıcı hizmeti askıya alabilir veya sonlandırabilir.",
      ],
    },
    {
      h: "9. Satıcı'nın Sorumluluğu ve Sınırları",
      p: [
        "Satıcı, hizmeti özenle ve makul teknik standartlarda sunmayı taahhüt eder; ancak hizmetin kesintisiz veya hatasız olacağını, belirli bir iş sonucunu veya gelir artışını garanti etmez. Üçüncü taraf hizmetlerinin (WhatsApp/Meta, SMS operatörleri, ödeme kuruluşları, barındırma sağlayıcıları vb.) kesintilerinden veya kural değişikliklerinden doğan aksaklıklardan Satıcı, mevzuatın izin verdiği ölçüde sorumlu değildir.",
        "Satıcı'nın bu sözleşmeden doğan toplam sorumluluğu, Ticari Alıcılar bakımından, olayın gerçekleştiği tarihten önceki 12 ay içinde Alıcı'nın ilgili plan için ödediği ücretle sınırlıdır; kast ve ağır kusur ile emredici mevzuatın sorumluluğun sınırlandırılmasına izin vermediği hâller saklıdır. Tüketicilere ilişkin emredici tüketici mevzuatı hükümleri bu maddeden etkilenmez.",
        "Mücbir sebep (doğal afet, savaş, salgın, ağ/altyapı ve enerji kesintileri, yasal düzenlemeler, üçüncü taraf platform kısıtlamaları vb.) hâllerinde taraflar yükümlülüklerini ifa edememekten sorumlu tutulamaz.",
      ],
    },
    {
      h: "10. Kişisel Veriler",
      p: [
        "Alıcı'nın kişisel verileri, hizmetin sunulması, ödeme ve faturalama, hukuki yükümlülükler ve iletişim amaçlarıyla, 6698 sayılı KVKK ve ilgili mevzuata uygun olarak işlenir. Ayrıntılar için Gizlilik Politikası (https://siriplan.com/gizlilik) ve KVKK Aydınlatma Metni (https://siriplan.com/kvkk) geçerlidir.",
        "Alıcı'nın onayının kanıtı olarak; onay tarihi ve saati, onaylanan metin sürümü, Alıcı'nın hesap kimliği, IP adresi ve tarayıcı bilgisi güvenli şekilde kaydedilir ve yasal saklama süreleri boyunca saklanır.",
      ],
    },
    {
      h: "11. Uyuşmazlıkların Çözümü ve Uygulanacak Hukuk",
      p: [
        "Bu sözleşmeye Türk hukuku uygulanır. Tüketiciler bakımından, Alıcı'nın yerleşim yerinde veya hizmeti satın aldığı yerde, yürürlükteki parasal sınırlar dâhilinde Tüketici Hakem Heyetleri'ne, bu sınırların üzerinde Tüketici Mahkemeleri'ne başvuru hakkı saklıdır (bu başvuru yolları emredicidir).",
        "Ticari Alıcılar bakımından, uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.",
        "Taraflar, sözleşmeye ilişkin elektronik kayıtların (sunucu/log kayıtları, e-posta, ödeme kayıtları, onay kayıtları) 6100 sayılı Hukuk Muhakemeleri Kanunu'nun 193. maddesi uyarınca kesin delil niteliğinde olduğunu kabul eder.",
      ],
    },
    {
      h: "12. Bildirimler, Dil, Bölünebilirlik ve Yürürlük",
      p: [
        "Satıcı'nın Alıcı'ya yapacağı bildirimler Alıcı'nın kayıtlı e-posta adresine veya panel içi bildirimle yapılır. Alıcı, e-posta adresini güncel tutmakla yükümlüdür; bildirim, gönderildiği anda yapılmış sayılır.",
        "Bu sözleşme Türkçe esas metindir; diğer dillerdeki çeviriler kolaylık içindir ve çelişki hâlinde Türkçe metin geçerlidir. Sözleşmenin bir hükmünün geçersizliği, diğer hükümlerin geçerliliğini etkilemez.",
        "Bu sözleşme, Alıcı'nın ödeme adımında onay kutularını işaretleyip ödemeyi tamamlamasıyla yürürlüğe girer. Alıcı, onay anındaki sürümün bir kopyasını bu sayfadan her zaman görüntüleyebilir.",
      ],
    },
  ],
};

const contractEn: LegalDoc = {
  title: "Distance Sales Agreement",
  subtitle: `SiriPlan subscription service · Effective: ${SELLER.effectiveDate.en}`,
  intro: [
    "This agreement is concluded electronically through siriplan.com or the SiriPlan app/panel. By ticking the consent boxes at checkout, the Buyer declares that they have read, understood and accepted this agreement and the Pre-Contract Information Form. The Turkish text is the authoritative version.",
  ],
  sections: [
    {
      h: "1. Parties",
      p: [
        "SELLER (Service Provider):",
        ...sellerEn,
        "BUYER: the natural or legal person who provides name or company name, email and (if any) phone details in the registration/payment form. The Buyer is responsible for the accuracy of this information.",
        "“Consumer” means a natural person acting for purposes outside their trade or profession; “Business Buyer” means a person who buys the service in the course of a business or profession (e.g. a salon, clinic, freelancer). Consumer-specific provisions (in particular Article 7) apply only to Consumers.",
      ],
    },
    {
      h: "2. Subject Matter",
      p: [
        "The Seller grants the Buyer access to the online appointment and business-management software service (SaaS) for the SiriPlan plan selected on siriplan.com (Mini, Starter, Pro, Business or other plans/add-ons offered by the Seller) under the terms below.",
        "Plan scope, limits (e.g. staff count, monthly appointment/message quotas) and current prices are shown at checkout and at https://siriplan.com/fiyatlar. The plan, billing period (monthly/yearly) and amount shown at checkout form an integral part of this agreement.",
        "The service is online access to software; no physical product is delivered.",
      ],
    },
    {
      h: "3. Provision and Performance (Instant Electronic Performance)",
      p: [
        "The service is delivered electronically. Performance begins when payment is confirmed and the plan is activated on the Buyer's account; there is no physical delivery or shipping. An internet connection and a compatible device/browser are required.",
        "The service starts once Stripe confirms the payment and the plan is assigned to the account. Service interruptions, maintenance and limitations of liability are governed by the Terms of Use (https://siriplan.com/kosullar).",
      ],
    },
    {
      h: "4. Price, Payment and Currency",
      p: [
        "The price is the amount shown at checkout for the selected plan and period (monthly or yearly) and is charged in the displayed currency (TRY, USD or EUR). Payment is made in advance by credit/debit card through the Seller's payment provider Stripe. Card details are processed by Stripe and are not stored by the Seller.",
        "Because payment is processed through the Seller's merchant account outside Türkiye, the Buyer's card issuer may charge commission, exchange-rate or foreign-transaction fees. Such fees belong to the Buyer's bank, are not added by the Seller and are outside the Seller's control.",
        "An electronic invoice/receipt is sent by Stripe to the Buyer's email address for each payment.",
      ],
    },
    {
      h: "5. Seller Established Abroad and Taxes (VAT)",
      p: [
        "The Seller is a company registered in England and Wales; it is not established in Türkiye and has no tax representative in Türkiye.",
        "The prices shown at checkout/payment are total amounts inclusive of applicable VAT and other taxes (tax-inclusive); no additional tax or fee is charged beyond the amount shown.",
        "Because the Seller is established abroad, the electronic invoice/receipt issued through Stripe for each payment does not replace a Turkish VAT e-invoice or e-archive invoice. If, under the law of the Buyer's country, the Buyer has further declaration, registration or payment obligations (e.g. a Business Buyer's bookkeeping of expenses or declarations on services obtained from abroad), assessing them is the Buyer's responsibility; the Seller does not provide tax advice.",
        "If, due to a change in law, the Seller is required to collect an additional tax, it will be applied only to subsequent period(s), notified to the Buyer in advance, and the Buyer may cancel before renewal.",
      ],
    },
    {
      h: "6. Term, Automatic Renewal and Cancellation",
      p: [
        "The subscription is paid in advance for the selected period (1 month or 1 year) and renews automatically at the end of each period at the then-current plan price, charged to the saved card, unless cancelled by the Buyer.",
        "The Buyer may cancel at any time in the panel (Settings → Subscription) or by emailing info@bysirius.com. Cancellation stops the next renewal; the Buyer keeps access until the end of the paid period. No pro-rata refund is given for a period that has started, without prejudice to the Consumer's statutory withdrawal and refund rights (see Article 7 and the Refund & Cancellation Policy).",
        "The Seller may change plan prices or scope. A price increase does not affect the current period and is announced by email/panel notice at least 30 days before the next renewal. If the Buyer does not accept the new price, they may cancel before renewal. Where the Seller has announced a fixed-price guarantee, the price will not be increased during that period.",
        "The free trial (14 days) is offered to evaluate the service without payment and may not require card details. When the trial ends, the service may be restricted unless the Buyer purchases a paid plan. A paid plan starts when payment is received.",
        "Plan changes: on an upgrade, the unused part of the current period is credited and the difference is charged, and a new period starts at the upgrade; on a downgrade, the current period is kept, the unused difference is applied as account credit and no cash refund is made. Details are in the Refund & Cancellation Policy.",
      ],
    },
    {
      h: "7. Right of Withdrawal (Consumers Only)",
      p: [
        "Under Turkish Consumer Protection Law No. 6502 and the Distance Contracts Regulation, a Consumer may withdraw within 14 days without giving any reason and without penalty. However, the legislation provides that the right of withdrawal cannot be exercised, or can be exercised only in a limited way, for services performed instantly in electronic form and for services whose performance begins with the Consumer's consent before the withdrawal period ends.",
        "By the separate consent given at checkout, the Consumer expressly confirms that they request the service to start immediately after payment (before the withdrawal period ends), that the service is performed instantly in electronic form, and that they will lose the right of withdrawal once performance has begun.",
        "If a competent authority or court holds that this consent/exception is not valid in the specific case, or if the Consumer withdraws in writing before performance begins: the Consumer sends the withdrawal notice to info@bysirius.com; the Seller refunds the amount for the unperformed (unused) part to the payment method used, within 14 days at the latest after receiving the notice. If the service has been used at the Consumer's request during that time, the Consumer bears the pro-rata (daily) price for the part actually used until the withdrawal date.",
        "The sample form in the Refund & Cancellation Policy may be used for the notice (it is not mandatory). Business Buyers are not consumers and have no right of withdrawal.",
      ],
    },
    {
      h: "8. Buyer's Obligations and Acceptable Use",
      p: [
        "The Buyer is responsible for protecting their account and password, using the service lawfully and in line with the Terms of Use, and for the content and personal data uploaded to the service (including data of their own customers) and its legal compliance (including KVKK/UK GDPR notice and consent obligations).",
        "The Buyer may not endanger system security, copy, reverse-engineer, scrape or unlawfully resell the service. In case of breach, the Seller may suspend or terminate the service.",
      ],
    },
    {
      h: "9. Seller's Liability and Limits",
      p: [
        "The Seller undertakes to provide the service with due care and reasonable technical standards; it does not guarantee uninterrupted or error-free service, or any particular business result or revenue increase. To the extent permitted by law, the Seller is not liable for disruptions caused by third-party services (WhatsApp/Meta, SMS carriers, payment institutions, hosting providers, etc.) or their rule changes.",
        "For Business Buyers, the Seller's total liability under this agreement is limited to the fees paid by the Buyer for the relevant plan in the 12 months before the event, save for wilful misconduct, gross negligence and cases where mandatory law does not allow limitation. Mandatory consumer-protection provisions for Consumers are not affected by this article.",
        "Neither party is liable for failure to perform due to force majeure (natural disasters, war, epidemics, network/infrastructure/power outages, legal changes, third-party platform restrictions, etc.).",
      ],
    },
    {
      h: "10. Personal Data",
      p: [
        "The Buyer's personal data is processed to provide the service, for payment and invoicing, legal obligations and communication, in accordance with KVKK No. 6698 and applicable law. See the Privacy Policy (https://siriplan.com/gizlilik) and the KVKK Notice (https://siriplan.com/kvkk).",
        "As evidence of consent, the consent date and time, the version of the accepted text, the Buyer's account ID, IP address and browser information are securely recorded and retained for the statutory retention periods.",
      ],
    },
    {
      h: "11. Dispute Resolution and Governing Law",
      p: [
        "Turkish law applies to this agreement. For Consumers, the right to apply to Consumer Arbitration Committees (within the monetary limits in force) or Consumer Courts at the Buyer's place of residence or where the service was purchased is reserved (these remedies are mandatory).",
        "For Business Buyers, the Courts and Enforcement Offices of Istanbul have jurisdiction.",
        "The parties agree that electronic records (server/log records, emails, payment records, consent records) are conclusive evidence under Article 193 of the Turkish Code of Civil Procedure No. 6100.",
      ],
    },
    {
      h: "12. Notices, Language, Severability and Effect",
      p: [
        "Notices to the Buyer are sent to the Buyer's registered email address or through an in-panel notice. The Buyer must keep their email address up to date; a notice is deemed given when sent.",
        "The Turkish text is authoritative; translations are for convenience and the Turkish text prevails in case of conflict. The invalidity of any provision does not affect the validity of the others.",
        "This agreement takes effect when the Buyer ticks the consent boxes at checkout and completes payment. The Buyer can always view a copy of the version in force at the time of consent on this page.",
      ],
    },
  ],
};

/* ───────────────────────── ÖN BİLGİLENDİRME FORMU ───────────────────────── */

const preinfoTr: LegalDoc = {
  title: "Ön Bilgilendirme Formu",
  subtitle: `Mesafeli Sözleşmeler Yönetmeliği kapsamında · Yürürlük: ${SELLER.effectiveDate.tr}`,
  intro: [
    "Bu form, siparişinizi tamamlamadan ve ödeme yapmadan önce, Mesafeli Sözleşmeler Yönetmeliği uyarınca bilgilendirilmeniz için sunulur. Tüketici olarak bu formu okuduğunuzu elektronik ortamda teyit etmeniz gerekir.",
  ],
  sections: [
    { h: "1. Satıcı Bilgileri", p: sellerTr },
    {
      h: "2. Hizmetin Temel Nitelikleri",
      p: [
        "SiriPlan; randevu, müşteri, personel, stok, kampanya, paket/seans, gelir-gider ve raporlama özelliklerini içeren, internet üzerinden erişilen bir randevu ve işletme yönetimi yazılım hizmetidir (SaaS).",
        "Seçtiğiniz planın (Mini, Starter, Pro, Business) kapsamı ve sınırları sipariş ekranında ve https://siriplan.com/fiyatlar adresinde gösterilir. Hizmet bir yazılıma çevrimiçi erişimdir; fiziksel ürün teslim edilmez.",
      ],
    },
    {
      h: "3. Toplam Fiyat, Ödeme Şekli ve Ek Maliyetler",
      p: [
        "Sipariş ekranında/ödeme sayfasında gösterilen tutar, seçtiğiniz plan ve dönem (aylık veya yıllık) için peşin tahsil edilecek toplam bedeldir; TRY, USD veya EUR cinsinden gösterilir.",
        "Gösterilen fiyatlara uygulanabilir KDV ve diğer vergiler dâhildir; gösterilen tutar dışında ayrıca vergi tahsil edilmez. Satıcı yurt dışında (İngiltere) yerleşiktir ve Türkiye'de vergi temsilcisi yoktur; Stripe makbuzu/faturası Türkiye'de düzenlenen e-faturanın yerine geçmez (Mesafeli Satış Sözleşmesi, madde 5).",
        "Ödeme kredi/banka kartıyla Stripe üzerinden alınır. Ödeme yurt dışı üye işyeri hesabından yapıldığından kartınızın bankası komisyon, kur farkı veya yurt dışı işlem bedeli uygulayabilir (banka tarafından belirlenir, Satıcı'ya ait değildir).",
      ],
    },
    {
      h: "4. Süre, Yenileme ve Fesih",
      p: [
        "Abonelik seçtiğiniz dönem için geçerlidir ve siz iptal etmedikçe her dönem sonunda güncel fiyatla otomatik yenilenir. Aboneliği istediğiniz zaman panelden (Ayarlar → Abonelik) veya info@bysirius.com adresinden iptal edebilirsiniz; iptal sonraki yenilemeyi durdurur ve ödediğiniz dönem sonuna kadar erişiminiz sürer.",
        "Fiyat artışları, en az 30 gün önceden bildirilir ve mevcut dönemi etkilemez.",
      ],
    },
    {
      h: "5. İfa / Teslim",
      p: [
        "Hizmet elektronik ortamda sunulur; ödemenin onaylanmasıyla planınız hesabınızda etkinleştirilir ve hizmetin ifasına anında başlanır. Fiziksel teslimat, kargo veya teslimat masrafı yoktur.",
      ],
    },
    {
      h: "6. Cayma Hakkı ve İstisnalar (Tüketici)",
      p: [
        "Tüketici olarak 14 gün içinde gerekçe göstermeden ve cezai şart ödemeden cayma hakkınız vardır. Ancak elektronik ortamda anında ifa edilen hizmetlerde ve cayma süresi dolmadan sizin onayınızla ifasına başlanan hizmetlerde cayma hakkı kullanılamaz.",
        "Ödeme adımında “hizmetin hemen başlamasını istiyorum ve ifa başlayınca cayma hakkımı kaybedeceğimi biliyorum” onayını verirseniz, ödemeden sonra cayma hakkınız bulunmaz. Onay vermezseniz ödeme yapılamaz. Mevzuata göre bu istisnanın geçerli sayılmadığı durumlarda iade koşulları Mesafeli Satış Sözleşmesi madde 7 ve İade ve İptal Politikası'nda belirtilmiştir.",
        "Cayma bildirimi muhatabı: Satıcı — info@bysirius.com. Ticari Alıcılar (işletmeler) tüketici sayılmaz ve cayma hakkına sahip değildir.",
      ],
    },
    {
      h: "7. Şikayet ve Başvuru Yolları",
      p: [
        "Şikayet ve talepleriniz için önce info@bysirius.com adresine yazabilirsiniz. Tüketici olarak uyuşmazlıklarda, yürürlükteki parasal sınırlar dâhilinde yerleşim yerinizdeki veya işlemi yaptığınız yerdeki Tüketici Hakem Heyeti'ne ya da Tüketici Mahkemesi'ne başvurabilirsiniz.",
      ],
    },
    {
      h: "8. Sözleşmenin Saklanması ve Erişim",
      p: [
        "Onayladığınız Mesafeli Satış Sözleşmesi ve bu form https://siriplan.com/mesafeli-satis-sozlesmesi ve https://siriplan.com/on-bilgilendirme-formu adreslerinden her zaman görüntülenebilir; ödeme belgesi (invoice/receipt) e-posta adresinize gönderilir. Onayınızın tarihi, sürümü ve teknik kaydı güvenli şekilde saklanır.",
      ],
    },
  ],
};

const preinfoEn: LegalDoc = {
  title: "Pre-Contract Information Form",
  subtitle: `Under the Turkish Distance Contracts Regulation · Effective: ${SELLER.effectiveDate.en}`,
  intro: [
    "This form is provided so that you are informed before completing your order and paying, as required by the Distance Contracts Regulation. As a consumer, you must confirm electronically that you have read it. The Turkish text is authoritative.",
  ],
  sections: [
    { h: "1. Seller", p: sellerEn },
    {
      h: "2. Main Characteristics of the Service",
      p: [
        "SiriPlan is an internet-accessed appointment and business-management software service (SaaS) with appointment, customer, staff, inventory, campaign, package/session, income-expense and reporting features.",
        "The scope and limits of your selected plan (Mini, Starter, Pro, Business) are shown at checkout and at https://siriplan.com/fiyatlar. The service is online access to software; no physical product is delivered.",
      ],
    },
    {
      h: "3. Total Price, Payment and Additional Costs",
      p: [
        "The amount shown at checkout is the total fee charged in advance for the plan and period (monthly or yearly) you selected, displayed in TRY, USD or EUR.",
        "Displayed prices include applicable VAT and other taxes; no further tax is charged beyond the amount shown. The Seller is established abroad (United Kingdom) and has no tax representative in Türkiye; the Stripe receipt/invoice does not replace a Turkish e-invoice (Distance Sales Agreement, Article 5).",
        "Payment is taken by credit/debit card through Stripe. As payment is processed through a merchant account outside Türkiye, your card issuer may charge commission, exchange-rate or foreign-transaction fees (set by the bank, not by the Seller).",
      ],
    },
    {
      h: "4. Term, Renewal and Termination",
      p: [
        "The subscription runs for the period you select and renews automatically at the end of each period at the then-current price unless you cancel. You may cancel at any time in the panel (Settings → Subscription) or at info@bysirius.com; cancellation stops the next renewal and you keep access until the end of the paid period.",
        "Price increases are notified at least 30 days in advance and do not affect the current period.",
      ],
    },
    {
      h: "5. Performance / Delivery",
      p: [
        "The service is provided electronically; once payment is confirmed, your plan is activated and performance begins immediately. There is no physical delivery, shipping or delivery cost.",
      ],
    },
    {
      h: "6. Right of Withdrawal and Exceptions (Consumers)",
      p: [
        "As a consumer you have a 14-day right of withdrawal without giving reasons or paying a penalty. However, the right cannot be exercised for services performed instantly in electronic form or whose performance begins with your consent before the withdrawal period ends.",
        "If you give the consent at checkout (“I want the service to start immediately and I understand I lose the right of withdrawal once performance begins”), you have no right of withdrawal after payment. Payment cannot be made without the consent. Where the law does not treat this exception as valid, refund terms are in Distance Sales Agreement Article 7 and the Refund & Cancellation Policy.",
        "Recipient of the withdrawal notice: the Seller — info@bysirius.com. Business Buyers are not consumers and have no right of withdrawal.",
      ],
    },
    {
      h: "7. Complaints and Remedies",
      p: [
        "For complaints and requests, write to info@bysirius.com first. As a consumer, within the monetary limits in force you may apply to the Consumer Arbitration Committee or Consumer Court at your place of residence or where the transaction took place.",
      ],
    },
    {
      h: "8. Retention of and Access to the Contract",
      p: [
        "The Distance Sales Agreement you accept and this form can always be viewed at https://siriplan.com/mesafeli-satis-sozlesmesi and https://siriplan.com/on-bilgilendirme-formu; a payment document (invoice/receipt) is emailed to you. The date, version and technical record of your consent are securely stored.",
      ],
    },
  ],
};

/* ───────────────────────── İADE VE İPTAL POLİTİKASI ───────────────────────── */

const refundTr: LegalDoc = {
  title: "İade ve İptal Politikası",
  subtitle: `SiriPlan abonelikleri ve ek paketler · Yürürlük: ${SELLER.effectiveDate.tr}`,
  intro: [
    "Bu politika, Mesafeli Satış Sözleşmesi'nin ayrılmaz parçasıdır. Tüketicinin kanundan doğan hakları saklıdır; bu politika bu hakları sınırlamaz.",
  ],
  sections: [
    {
      h: "1. Aboneliği İptal Etme",
      p: [
        "Aboneliğinizi istediğiniz zaman Ayarlar → Abonelik sayfasından veya info@bysirius.com adresine yazarak iptal edebilirsiniz. İptal, bir sonraki otomatik yenilemeyi durdurur; ödediğiniz dönemin sonuna kadar hizmeti kullanmaya devam edersiniz. Dönem sonunda hesabınız ücretsiz/kısıtlı duruma geçer; verilerinizi dışa aktarma hakkınız Kullanım Koşulları'nda belirtilmiştir.",
        "Ticari Alıcılar (işletmeler) için iptal yalnızca ileriye dönük etki doğurur; başlamış dönem ücreti iade edilmez.",
      ],
    },
    {
      h: "2. Ücret İadesi Hangi Durumlarda Yapılır?",
      p: [
        "Başlamış bir abonelik dönemi için kıst (orantılı) iade yapılmaz. Aşağıdaki durumlar saklıdır ve talep hâlinde değerlendirilir:",
        "a) Mükerrer veya hatalı tahsilat (aynı dönem için birden fazla çekim, yanlış tutar vb.): fazla tutarın tamamı iade edilir.",
        "b) Satıcı kaynaklı, hizmeti fiilen kullanılamaz kılan ve makul sürede giderilmeyen teknik arıza: etkilenen süreye orantılı iade veya kredi.",
        "c) Tüketicinin kanundan doğan cayma ve iade hakları (3. madde).",
        "d) Mevzuatın zorunlu kıldığı diğer hâller.",
        "İade talebi için info@bysirius.com adresine hesabınızın e-postası, tahsilat tarihi ve tutarıyla birlikte yazın. Talepler en geç 10 iş günü içinde yanıtlanır.",
      ],
    },
    {
      h: "3. Tüketici Cayma Hakkı ve Hizmetin Anında Başlaması",
      p: [
        "Hizmet elektronik ortamda anında ifa edilir. Ödeme adımında “hizmetin hemen başlamasını istiyorum ve ifa başlayınca cayma hakkımı kaybedeceğimi biliyorum” onayını veren tüketici, ifa başladıktan sonra cayma hakkını kullanamaz.",
        "Yetkili merci bu onayı somut olayda geçersiz sayarsa veya tüketici hizmet başlamadan önce cayarsa; cayma bildirimi Satıcı'ya ulaştıktan itibaren en geç 14 gün içinde, kullanılmamış kısım için ödeme, tahsilatta kullanılan ödeme aracına iade edilir. Cayma tarihine kadar fiilen kullanılan kısım (günlük orantılı) iade tutarından düşülür.",
        "İade, Stripe aracılığıyla aynı karta yapılır; bankanızın hesabınıza yansıtma süresi bankaya bağlıdır. Satıcı iade için ücret kesmez; ancak yurt dışı işlem/kur farkı kaynaklı bankanızın uyguladığı bedeller Satıcı tarafından geri ödenmez.",
      ],
    },
    {
      h: "4. Plan Değişiklikleri (Yükseltme / Düşürme)",
      p: [
        "Yükseltme: Mevcut dönemin kullanılmayan kısmı kredi olarak düşülür, aradaki fark hemen tahsil edilir ve yeni dönem yükseltme anında başlar.",
        "Düşürme: Mevcut dönem korunur; kullanılmayan fark, sonraki ödemelerden düşülmek üzere hesap kredisi olarak yansıtılır. Düşürme nakit iade doğurmaz.",
        "Mini plan 1 aktif personelle sınırlıdır; Mini'ye geçmeden önce fazla personelin pasife alınması gerekir.",
      ],
    },
    {
      h: "5. Ek Paketler (ör. SMS Kontörü)",
      p: [
        "SMS kontörü gibi tek seferlik satın alınan dijital ek paketler, satın alındığı anda hesaba tanımlanır ve anında ifa edilen elektronik içerik niteliğindedir. Kullanılmış kısım iade edilmez. Tüketicinin onayına ve mevzuata bağlı olarak, hiç kullanılmamış kontör için yasal cayma/iade hakları saklıdır. Ticari Alıcılar için kullanılmamış kontör iadesi Satıcı'nın takdirindedir.",
      ],
    },
    {
      h: "6. Başarısız Ödeme ve Kart Reddi",
      p: [
        "Yenileme ödemesi alınamazsa Satıcı ödemeyi makul sayıda yeniden deneyebilir ve Alıcı'yı bilgilendirir. Ödeme tamamlanmazsa abonelik sona erer ve hesap ücretsiz/kısıtlı duruma geçer.",
      ],
    },
    {
      h: "7. Örnek Cayma Bildirim Formu (Yalnızca Tüketici)",
      p: [
        "(Cayma hakkınızı kullanmak istiyorsanız aşağıdaki metni info@bysirius.com adresine gönderebilirsiniz. Kullanılması zorunlu değildir.)",
        "Kime: BY Sirius Group Ai and Technology Co Ltd. — info@bysirius.com",
        "Aşağıdaki hizmetin satımına ilişkin sözleşmeden cayma hakkımı kullandığımı beyan ederim.",
        "Sipariş tarihi / Hesap e-postası: …………………………",
        "Plan ve dönem: …………………………",
        "Tüketicinin adı-soyadı: …………………………",
        "Tarih: …………………………",
      ],
    },
  ],
};

const refundEn: LegalDoc = {
  title: "Refund & Cancellation Policy",
  subtitle: `SiriPlan subscriptions and add-ons · Effective: ${SELLER.effectiveDate.en}`,
  intro: [
    "This policy forms an integral part of the Distance Sales Agreement. A consumer's statutory rights are reserved and this policy does not limit them. The Turkish text is authoritative.",
  ],
  sections: [
    {
      h: "1. Cancelling Your Subscription",
      p: [
        "You can cancel at any time in Settings → Subscription or by emailing info@bysirius.com. Cancellation stops the next automatic renewal; you keep using the service until the end of the period you paid for. After that, your account moves to a free/restricted state; your right to export data is set out in the Terms of Use.",
        "For Business Buyers, cancellation only takes effect going forward; the fee for a period that has started is not refunded.",
      ],
    },
    {
      h: "2. When Are Refunds Given?",
      p: [
        "No pro-rata refund is made for a subscription period that has started. The following are reserved and will be assessed on request:",
        "a) Duplicate or erroneous charges (several charges for the same period, wrong amount, etc.): the excess is refunded in full.",
        "b) A Seller-side technical failure that makes the service effectively unusable and is not fixed within a reasonable time: pro-rata refund or credit for the affected time.",
        "c) The consumer's statutory withdrawal and refund rights (Section 3).",
        "d) Other cases required by law.",
        "To request a refund, email info@bysirius.com with your account email, charge date and amount. Requests are answered within 10 business days at the latest.",
      ],
    },
    {
      h: "3. Consumer Withdrawal and Immediate Start of the Service",
      p: [
        "The service is performed instantly in electronic form. A consumer who gives the consent at checkout (“I want the service to start immediately and I understand I lose the right of withdrawal once performance begins”) cannot withdraw after performance has begun.",
        "If a competent authority holds this consent not valid in the case, or the consumer withdraws before the service starts, the amount for the unused part is refunded to the payment method used within 14 days at the latest after the notice reaches the Seller; the part actually used until the withdrawal date (pro-rata daily) is deducted.",
        "Refunds are made to the same card through Stripe; how fast your bank posts it depends on the bank. The Seller does not charge a refund fee, but fees applied by your bank for foreign transactions/exchange rates are not reimbursed by the Seller.",
      ],
    },
    {
      h: "4. Plan Changes (Upgrade / Downgrade)",
      p: [
        "Upgrade: the unused part of the current period is credited, the difference is charged immediately and a new period starts at the upgrade.",
        "Downgrade: the current period is kept; the unused difference is applied as account credit against future payments. A downgrade does not result in a cash refund.",
        "The Mini plan is limited to 1 active staff member; extra staff must be deactivated before switching to Mini.",
      ],
    },
    {
      h: "5. Add-ons (e.g. SMS Credits)",
      p: [
        "One-off digital add-ons such as SMS credits are assigned to the account at purchase and are electronic content performed instantly. Used credits are not refunded. Subject to the consumer's consent and the law, statutory withdrawal/refund rights for entirely unused credits are reserved. For Business Buyers, refunds for unused credits are at the Seller's discretion.",
      ],
    },
    {
      h: "6. Failed Payments and Declined Cards",
      p: [
        "If a renewal payment cannot be collected, the Seller may retry a reasonable number of times and will notify the Buyer. If payment is not completed, the subscription ends and the account moves to a free/restricted state.",
      ],
    },
    {
      h: "7. Sample Withdrawal Form (Consumers Only)",
      p: [
        "(If you wish to withdraw, you may send the text below to info@bysirius.com. Use of this form is not mandatory.)",
        "To: BY Sirius Group Ai and Technology Co Ltd. — info@bysirius.com",
        "I hereby give notice that I withdraw from my contract for the sale of the following service.",
        "Order date / Account email: …………………………",
        "Plan and period: …………………………",
        "Name of consumer: …………………………",
        "Date: …………………………",
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDocKey, Record<LegalLang, LegalDoc>> = {
  contract: { tr: contractTr, en: contractEn },
  preinfo: { tr: preinfoTr, en: preinfoEn },
  refund: { tr: refundTr, en: refundEn },
};
