/**
 * İÇERİK GÜVENLİĞİ POLİTİKASI (CSP) — tek kaynak.
 *
 * Politika artık next.config.ts'te DEĞİL, proxy.ts'te üretiliyor. Sebep:
 * panel sayfalarına istek başına bir nonce basılması gerekiyor, bu da ancak
 * çalışma zamanında (proxy) mümkün. Politikanın iki yerde tanımlanması
 * tarayıcıya İKİ Content-Security-Policy başlığı gitmesine yol açardı;
 * tarayıcı bu durumda ikisinin KESİŞİMİNİ uygular ve hata ayıklaması çok zor
 * kırılmalar çıkar. Bu yüzden tek çıkış noktası burasıdır.
 *
 * İKİ VARYANT:
 *
 *   1) NONCE'LU (panel: /dashboard, /admin)
 *      script-src 'self' 'nonce-…' 'strict-dynamic'
 *      → 'unsafe-inline' YOK. Oturum çerezinin ve tüm müşteri verisinin
 *        bulunduğu yer burası olduğu için asıl sertleştirme buraya uygulanıyor.
 *        XSS ile sayfaya sokulan bir <script> nonce'u bilemeyeceği için çalışmaz.
 *
 *   2) NONCE'SUZ (pazarlama sayfaları, /r/[slug], /api/*)
 *      Mevcut davranışın aynısı ('unsafe-inline' korunur).
 *      → /api/export yazdırma HTML'i inline script kullanıyor; bu uçlar
 *        nonce alsaydı PDF/yazdırma çıktısı sessizce bozulurdu.
 *
 * NEDEN NONCE'A GEÇMEK BEDAVA: nonce, sayfayı dinamik render'a zorlar. Bu
 * projede zaten TÜM rotalar dinamik — root layout'taki getLocale() (bkz.
 * i18n/request.ts) cookies() ve headers() okuyor. Yani kaybedilecek statik
 * üretim yok; `next build` çıktısında robots.txt ve sitemap.xml dışında tek
 * bir ○ (Static) rota bulunmuyor.
 */

/** Nonce'un sunucu bileşenlerine taşındığı istek başlığı. */
export const CSP_NONCE_HEADER = "x-nonce";

/**
 * Acil durum kapatma anahtarı. Panelde beklenmedik bir CSP ihlali görülürse
 * Vercel'den `CSP_NONCE_ENABLED=0` verilip yeniden dağıtım beklenmeden
 * nonce'suz (eski) davranışa dönülebilir.
 */
export function isNonceEnabled(): boolean {
  return process.env.CSP_NONCE_ENABLED !== "0" && process.env.CSP_NONCE_ENABLED !== "false";
}

/** Nonce'lu politikanın uygulandığı yollar — oturum çerezinin yaşadığı yer. */
export function pathNeedsNonce(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
}

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * React, sunucu hata yığınlarını tarayıcıda yeniden kurmak için SADECE dev
 * modunda eval() kullanır; üretim derlemesinde ne React ne de Next.js eval'a
 * ihtiyaç duyar (bkz. node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md).
 */
const isDev = process.env.NODE_ENV === "development";

/** Tarayıcı ihlal raporlarının gönderileceği uç (bkz. api/csp-report). */
export const CSP_REPORT_URI = "/api/csp-report";

/**
 * Cloudflare Turnstile (iletişim formu CAPTCHA'sı). Widget hem bir script
 * indirir hem de bulmacayı bir iframe içinde açar — bu yüzden hem script-src
 * hem frame-src'de olmak zorunda. NEXT_PUBLIC_TURNSTILE_SITE_KEY tanımlı
 * değilken hiçbir istek çıkmaz; kaynağın listede durması zarar vermez, ama
 * anahtar eklendiği gün CSP yüzünden sessizce bozulmayı da engeller.
 */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * FAZ 2 — yalnızca RAPORLAYAN aday politika.
 *
 * Faz 3'te uygulamayı düşündüğümüz sıkılaştırmaları, HİÇBİR ŞEYİ ENGELLEMEDEN
 * canlıda ölçmek için. Tarayıcı bu politikayı ihlal eden bir şey görürse
 * sayfayı bozmaz, sadece /api/csp-report'a bir rapor yollar.
 *
 * Aday sıkılaştırmalar:
 *   • style-src'den 'unsafe-inline' kaldırılır → recharts/sonner gerçekten
 *     nonce'suz <style> enjekte ediyor mu, VARSAYMAK yerine ölçeriz.
 *   • frame-ancestors 'self' → 'none' (panelin kendi iframe'ine bile gerek yok).
 *
 * Varsayılan KAPALI: açmak için CSP_REPORT_ONLY=1. Kapalıyken ikinci başlık
 * hiç gönderilmez, dolayısıyla ne ek bant genişliği ne de rapor trafiği olur.
 */
export function isReportOnlyEnabled(): boolean {
  return process.env.CSP_REPORT_ONLY === "1" || process.env.CSP_REPORT_ONLY === "true";
}

export function buildCandidateCsp(nonce?: string | null): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com ${TURNSTILE_ORIGIN}`;

  return [
    "default-src 'self'",
    scriptSrc,
    // ÖLÇÜLEN VARSAYIM: 'unsafe-inline' olmadan panel kaç ihlal üretiyor?
    nonce ? `style-src 'self' 'nonce-${nonce}'` : "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://www.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com https://graph.facebook.com https://www.google-analytics.com https://www.googletagmanager.com ${TURNSTILE_ORIGIN}`,
    // 'self': /dashboard/rehber sayfası kullanım kılavuzu sunumunu kendi
    // origin'imizdeki /api/docs/presentation ucundan iframe içinde gömüyor.
    // frame-src açıkça tanımlandığı için default-src 'self' devreye girmez —
    // 'self' burada olmazsa tarayıcı iframe'i tamamen engeller.
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com ${TURNSTILE_ORIGIN}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // upgrade-insecure-requests BİLEREK YOK: tarayıcı bu direktifi report-only
    // politikada yok sayar ve her sayfada konsola uyarı basar. Uygulanan
    // politikada (buildCsp) duruyor, orası zaten geçerli yer.
    `report-uri ${CSP_REPORT_URI}`,
  ].join("; ");
}
export function buildCsp(nonce?: string | null): string {
  // 'strict-dynamic': nonce'lu bir script'in YÜKLEDİĞİ script'lere de güvenilir.
  // Stripe.js, @stripe/stripe-js tarafından çalışma zamanında <script> olarak
  // enjekte edildiği için bu sayede çalışmaya devam eder.
  //
  // Alan adları (js.stripe.com vb.) nonce'lu varyantta da BIRAKILIYOR: CSP
  // Level 3 tarayıcıları 'strict-dynamic' varken bu listeyi zaten yok sayar,
  // ama strict-dynamic desteklemeyen eski Safari sürümleri (< 15.4) listeye
  // düşer ve Stripe ödeme akışı orada da bozulmaz.
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com`
    : `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com ${TURNSTILE_ORIGIN}`;

  return [
    "default-src 'self'",
    scriptSrc,
    // style-src'de 'unsafe-inline' BİLEREK duruyor: recharts, sonner ve bazı
    // Radix bileşenleri çalışma zamanında nonce'suz <style> enjekte ediyor.
    // Nonce'a zorlamak paneli görsel olarak bozar; stil enjeksiyonunun saldırı
    // değeri ise script enjeksiyonunun yanında ihmal edilebilir.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://www.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com https://graph.facebook.com https://www.google-analytics.com https://www.googletagmanager.com ${TURNSTILE_ORIGIN}`,
    // 'self': /dashboard/rehber sayfası kullanım kılavuzu sunumunu kendi
    // origin'imizdeki /api/docs/presentation ucundan iframe içinde gömüyor.
    // frame-src açıkça tanımlandığı için default-src 'self' devreye girmez —
    // 'self' burada olmazsa tarayıcı iframe'i tamamen engeller.
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com ${TURNSTILE_ORIGIN}`,
    // PWA service worker (kurulabilirlik + "ana ekrana ekle") aynı origin'den
    // kayıt oluyor — 'none' bunu tamamen engelliyordu.
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // X-Frame-Options'ın CSP karşılığı. Clickjacking'e karşı: siriplan.com
    // panelinin başka bir sitenin iframe'ine gömülüp tıklamaların çalınmasını
    // engeller.
    "frame-ancestors 'self'",
    // Sayfa içindeki http:// bir alt kaynak isteği tarayıcı tarafından
    // otomatik https'e yükseltilir — karışık içerik (mixed content) yoluyla
    // oturum çerezinin düz metin gitmesini engeller.
    "upgrade-insecure-requests",
    // Engellenen (enforce) bir ihlal canlıda bir şeyin BOZULDUĞU anlamına
    // gelir; report-uri olmadan bunu ancak kullanıcı şikâyetinden duyarız.
    `report-uri ${CSP_REPORT_URI}`,
  ].join("; ");
}
