import type { Metadata } from "next";
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
  ],
  authors: [{ name: "BY Sirius Group", url: "https://bysirius.com" }],
  creator: "BY Sirius Group Ai & Technology Co Ltd.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Siriplan",
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
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
