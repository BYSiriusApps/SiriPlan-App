import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Randevu Önerisi — SiriPlan",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OneriTokenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
