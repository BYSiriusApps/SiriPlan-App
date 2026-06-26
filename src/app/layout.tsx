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
    default: "RandevuPro — Güzellik Sektörünün Yönetim Platformu",
    template: "%s | RandevuPro",
  },
  description:
    "Kuaför, berber, güzellik salonu ve spa işletmeleri için AI destekli randevu, müşteri ve ciro yönetim platformu.",
  keywords: [
    "randevu sistemi",
    "kuaför programı",
    "güzellik salonu yönetimi",
    "berber programı",
    "spa yönetim yazılımı",
    "salon management software",
  ],
  authors: [{ name: "BySirius", url: "https://bysirius.com" }],
  creator: "BySirius",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "RandevuPro",
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
