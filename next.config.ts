import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// NOT: Content-Security-Policy artık BURADA DEĞİL, src/proxy.ts'te üretiliyor
// (bkz. src/lib/csp.ts). Sebep: panel sayfaları istek başına bir nonce
// gerektiriyor ve nonce ancak çalışma zamanında üretilebilir. Politikanın
// hem burada hem proxy'de tanımlanması tarayıcıya iki ayrı CSP başlığı
// gönderirdi; tarayıcı bu durumda ikisinin kesişimini uygular ve teşhisi çok
// zor kırılmalar çıkar. Aşağıdaki başlıklar nonce'tan bağımsız oldukları için
// burada kalmaya devam ediyor.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Permissions-Policy yola göre değişir, bu yüzden securityHeaders'tan ayrı:
//  - Varsayılan (pazarlama, /r/[slug] müşteri sayfaları, API): mikrofon TAMAMEN
//    kapalı. Bu yüzeylerin hiçbiri getUserMedia çağırmıyor.
//  - Yalnızca /dashboard/*: mikrofon=(self) — sesli randevu (Web Speech API /
//    getUserMedia) sadece kendi origin'imizde çalışabilsin. Cross-origin iframe'ler
//    yine erişemez ve tarayıcı izin penceresi yine kullanıcıya sorar.
// NOT: `microphone=()` genel değerken tarayıcı getUserMedia'yı sessizce
// reddediyor, izin penceresi HİÇ açılmıyor ve site Chrome mikrofon ayarları
// listesinde bile görünmüyordu (bkz. 28 Ağu düzeltmesi).
const PERMISSIONS_POLICY_DEFAULT =
  "camera=(), microphone=(), geolocation=(), interest-cohort=()";
const PERMISSIONS_POLICY_DASHBOARD =
  "camera=(), microphone=(self), geolocation=(), interest-cohort=()";

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
  // /api/docs/presentation çalışma zamanında docs/ altındaki HTML dosyasını
  // fs ile okuyor. NFT tracer process.cwd() ile kurulan yolu göremediği için
  // dosya Vercel serverless paketine girmez ve uçta 404'e düşerdi — açıkça
  // pakete dahil ediyoruz.
  outputFileTracingIncludes: {
    "/api/docs/presentation": ["./docs/kullanim-kilavuzu-sunum.html"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY_DEFAULT },
        ],
      },
      {
        // Aynı yolu eşleyen SON header kazanır (Next.js davranışı) — /dashboard/*
        // altında mikrofonu (self) olarak geçersiz kılar, başka her yerde kapalı kalır.
        source: "/dashboard/:path*",
        headers: [
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY_DASHBOARD },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
