import type { Metadata } from "next";

// Davet linki WhatsApp/e-posta/SMS ile paylaşılıyor; önizleme kartı bu
// meta'dan üretilir. Bu olmadan kart, kök layout'un pazarlama başlığını
// ("Siriplan — Her Sektöre Özel…") gösteriyor ve davet edilen kişi linkin
// sadece pazarlama sitesine gittiğini sanıyordu. noindex: davet sayfası
// token'lı, arama motoruna girmemeli.
export const metadata: Metadata = {
  title: "İşletmeye Katıl — Siriplan",
  description:
    "Bir işletme sizi Siriplan'da ekibine davet etti. Bağlantıyı açıp hesabınızı oluşturun ve katılın.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "İşletmeye Katıl — Siriplan",
    description:
      "Bir işletme sizi Siriplan'da ekibine davet etti. Bağlantıyı açıp hesabınızı oluşturun ve katılın.",
  },
};

export default function DavetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
