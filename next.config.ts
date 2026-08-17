import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// React, sunucu hata yığınlarını tarayıcıda yeniden kurmak için SADECE dev
// modunda eval() kullanır; üretim derlemesinde ne React ne de Next.js eval'a
// ihtiyaç duyar (bkz. node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md). 'unsafe-eval' üretimde açık kalırsa, XSS ile
// sayfaya sokulan bir string'in doğrudan kod olarak çalıştırılmasının önündeki
// en önemli engel kalkmış olur. Bu yüzden yalnızca dev'de veriliyor.
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts + RSC payloads.
      //
      // 'unsafe-inline' NEDEN DURUYOR: Next.js her sayfaya kendi bootstrap
      // inline script'ini (self.__next_f.push...) gömer. Bunu kaldırmanın tek
      // yolu nonce tabanlı CSP'dir; nonce ise TÜM sayfaları dinamik render'a
      // zorlar (statik üretim ve CDN önbelleği devre dışı kalır) — pazarlama
      // sayfalarının tamamı her istekte sunucuda üretilir. Vercel Hobby
      // planında bu hem yavaşlık hem maliyet demek. XSS'e karşı asıl savunma
      // katmanı bu yüzden çıktı kaçışlaması (bkz. /api/export escapeHtml) ve
      // React'in varsayılan escape davranışıdır; 'unsafe-eval'in kaldırılması
      // da injekte edilen string'in kod olarak çalıştırılmasını engeller.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com`,
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
      // X-Frame-Options'ın CSP karşılığı. Modern tarayıcılar X-Frame-Options
      // yerine bunu dikkate alır; ikisi birlikte tutuluyor (eski tarayıcılar
      // için XFO, yeni tarayıcılar ve Mozilla Observatory için frame-ancestors).
      // Clickjacking'e karşı: siriplan.com panelinin başka bir sitenin
      // iframe'ine gömülüp tıklamaların çalınmasını engeller.
      "frame-ancestors 'self'",
      // Sayfa içindeki http:// bir alt kaynak isteği tarayıcı tarafından
      // otomatik https'e yükseltilir — karışık içerik (mixed content) yoluyla
      // oturum çerezinin düz metin gitmesini engeller.
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // `X-Powered-By: Next.js` başlığını kaldırır. Tek başına bir açık değil ama
  // saldırganın hangi framework/sürüm ailesine karşı olduğunu ücretsiz
  // öğrenmesini engeller (bilinen CVE'lerin hedefli denenmesi).
  poweredByHeader: false,
  // next-intl@3.26.5 writes to experimental.turbo (Next.js 15 path).
  // Next.js 16 moved Turbopack config to the top-level `turbopack` key,
  // so we add the alias here explicitly to make getMessages() work at runtime.
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
  images: {
    remotePatterns: [
      { hostname: "*.supabase.co" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
