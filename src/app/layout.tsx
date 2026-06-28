import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
};

export const metadata: Metadata = {
  title: {
    default: "Siriplan — Her Sektöre Özel Akıllı Randevu Yönetimi",
    template: "%s | Siriplan",
  },
  description:
    "Kuaför, berber, güzellik salonu, spa, klinik ve daha fazlası için AI destekli randevu, müşteri ve ciro yönetim platformu. BY Sirius Group tarafından geliştirildi.",
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
  authors: [{ name: "BY Sirius Group", url: "https://bysirius.com" }],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* PWA + Mobile */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Siriplan" />
        <meta name="msapplication-TileColor" content="#e11d48" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="mask-icon" href="/icons/icon.svg" color="#e11d48" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
