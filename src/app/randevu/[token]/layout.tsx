import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Randevu Detayı — SiriPlan",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RandevuTokenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
