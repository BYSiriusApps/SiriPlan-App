"use client";

import { useTranslations } from "next-intl";
import { QuickBookSheet } from "./QuickBookSheet";
import { HomeButton } from "./HomeButton";
import { CalendarDays } from "lucide-react";

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
  today: string;
  currentStaffId?: string | null;
}

export function TakvimHeader({ orgId, staff, services, today, currentStaffId }: Props) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">Takvim</span>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("calendar")}</h1>
        </div>
        <HomeButton />
      </div>
      <QuickBookSheet
        orgId={orgId}
        staff={staff}
        services={services}
        preselectedDate={today}
        currentStaffId={currentStaffId}
      />
    </div>
  );
}
