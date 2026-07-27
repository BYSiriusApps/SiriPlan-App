"use client";

import { useTranslations } from "next-intl";
import { QuickBookSheet } from "./QuickBookSheet";
import { HomeButton } from "./HomeButton";

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
}

export function TakvimHeader({ orgId, staff, services, today }: Props) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("calendar")}</h1>
        <HomeButton />
      </div>
      <QuickBookSheet
        orgId={orgId}
        staff={staff}
        services={services}
        preselectedDate={today}
      />
    </div>
  );
}
