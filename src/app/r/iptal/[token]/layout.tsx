import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Randevu İptali — SiriPlan",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IptalTokenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
