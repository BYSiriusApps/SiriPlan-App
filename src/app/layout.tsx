import type { Metadata, Viewport } from "next";
import { isMobileApp } from "@/lib/mobile-app";
import { Geist, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { CSP_NONCE_HEADER } from "@/lib/csp";
import { MobileAppCookieHealer } from "@/components/layout/MobileAppCookieHealer";

// Sayfa gövdesinde fiilen çizilen TEK aile Jakarta'dır (--font-sans zincirinin
// başı). Geist yalnızca Jakarta'da bulunmayan glif için yedek, Playfair ise
// sadece panel ve /r/[slug] başlıklarında (.font-heading) kullanılıyor.
// next/font ikisini de varsayılan olarak <link rel="preload"> ile indirtiyordu:
// pazarlama sayfaları mobilde hiç çizmeyecekleri iki font dosyasını kritik
// yolda bekliyordu. preload'ı kapatmak fontu silmez — yalnızca "gerçekten
// gerekince indir"e çevirir.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e11d48" },
    { media: "(prefers-color-scheme: dark)", color: "#be123c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Siriplan — Her Sektöre Özel Akıllı Randevu Yönetimi",
    template: "%s | Siriplan",
  },
  description:
    "Kuaför, berber, güzellik salonu, spa, klinik ve daha fazlası için AI destekli randevu, müşteri ve ciro yönetim platformu. BY Sirius Group Ai & Technology Co Ltd. tarafından geliştirildi.",
  keywords: [
    "randevu sistemi",
    "kuaför programı",
    "güzellik salonu yönetimi",
    "berber programı",
    "spa yönetim yazılımı",
    "salon management software",
    "siriplan",
    "akıllı randevu",
    "online randevu",
  ],
  authors: [{ name: "BY Sirius Group Ai & Technology Co Ltd.", url: "https://bysirius.com" }],
  creator: "BY Sirius Group Ai & Technology Co Ltd.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Siriplan",
    startupImage: [
      { url: "/icons/apple-touch-icon.png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Siriplan",
    title: "Siriplan — Akıllı Randevu Yönetimi",
    description: "Kuaför, berber, güzellik salonu ve spa için AI destekli randevu platformu",
    url: "https://siriplan.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Siriplan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Siriplan — Akıllı Randevu Yönetimi",
    description: "Kuaför, berber, güzellik salonu ve spa için AI destekli randevu platformu",
    images: ["/og-image.png"],
  },
  verification: {
    google: "tPF2cy7cKBikzsx38Q-N9o1SAbXi7LjJLFwUBZME5LE",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  // Panel sayfalarında (bkz. lib/csp.ts) CSP nonce'lu çalışır; buradaki inline
  // script'ler imzalanmazsa tarayıcı onları sessizce engeller. Nonce'suz
  // yollarda (pazarlama, /r/[slug]) başlık boştur ve öznitelik hiç basılmaz —
  // o sayfalarda politika zaten 'unsafe-inline' ile çalışıyor.
  const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? undefined;
  // JSON-LD'deki fiyat teklifi (SoftwareApplication.offers) arama motorları
  // içindir; native uygulamada sayfa kaynağında bile fiyat taşımamak için
  // düşürülür (App Store 3.1.1 "metadata" ifadesini geniş yorumlar). Arama
  // motoru tarayıcıları bu işaretçileri hiç göndermediği için SEO etkilenmez.
  const mobileApp = await isMobileApp();
  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${playfairDisplay.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        {/* PWA + Mobile */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Siriplan" />
        <meta name="msapplication-TileColor" content="#e11d48" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="mask-icon" href="/icons/icon.svg" color="#e11d48" />
        {/* JSON-LD: Organization + SoftwareApplication */}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://siriplan.com/#organization",
                  name: "Siriplan",
                  url: "https://siriplan.com",
                  logo: "https://siriplan.com/icons/icon-192x192.png",
                  sameAs: ["https://bysirius.com"],
                  contactPoint: {
                    "@type": "ContactPoint",
                    telephone: "+90-535-503-2634",
                    contactType: "customer support",
                    availableLanguage: ["Turkish", "English"],
                  },
                },
                {
                  "@type": "SoftwareApplication",
                  "@id": "https://siriplan.com/#software",
                  name: "Siriplan",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web, iOS, Android",
                  ...(mobileApp
                    ? {}
                    : {
                        offers: {
                          "@type": "Offer",
                          price: "1752",
                          priceCurrency: "TRY",
                          description: "Starter plan — 14 days free trial",
                        },
                      }),
                  description: "AI destekli randevu ve işletme yönetim platformu",
                  url: "https://siriplan.com",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://siriplan.com/#website",
                  url: "https://siriplan.com",
                  name: "Siriplan",
                  inLanguage: ["tr", "en"],
                  potentialAction: {
                    "@type": "SearchAction",
                    target: "https://siriplan.com/blog?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
        {/* TWA'dan normal Chrome'a sızan sp_app çerezini temizler — bu çerez
            yüzünden telefondan siriplan.com hiç açılmıyordu. */}
        <MobileAppCookieHealer />
        {/* PWA kurulabilirlik: fetch handler'lı service worker kaydı (Chrome/Android
            "Ana ekrana ekle" istemi bunu şart koşuyor — yoksa istem hiç tetiklenmiyor) */}
        <Script id="sw-register" strategy="afterInteractive" nonce={nonce}>
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
        {/* Google Analytics 4 — yalnızca çerez onayından sonra yüklenir, bkz CookieConsent */}
        <CookieConsent nonce={nonce} mobileApp={mobileApp} />
        {/* Vercel Analytics & Speed Insights */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
