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
    : `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com`;

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
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com https://graph.facebook.com https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
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
  ].join("; ");
}
