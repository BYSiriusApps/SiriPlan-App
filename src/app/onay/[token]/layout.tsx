import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Onay — SiriPlan",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnayTokenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
