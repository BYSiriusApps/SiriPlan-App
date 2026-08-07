"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { QuickBookSheet } from "./QuickBookSheet";
import { HomeButton } from "./HomeButton";
import { LayoutList } from "lucide-react";

interface StaffCard {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Props {
  orgId: string;
  staff: StaffCard[];
  services: ServiceItem[];
}

export function RandevularHeader({ orgId, staff, services }: Props) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <LayoutList className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">Randevular</span>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("appointments")}</h1>
        </div>
        <HomeButton />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/randevular/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
        >
          {t("detailedForm")}
        </Link>
        <QuickBookSheet orgId={orgId} staff={staff} services={services} />
      </div>
    </div>
  );
}
