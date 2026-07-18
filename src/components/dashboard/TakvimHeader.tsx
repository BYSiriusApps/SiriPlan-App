"use client";

import { QuickBookSheet } from "./QuickBookSheet";

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
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h1 className="text-2xl font-bold">Takvim</h1>
      <QuickBookSheet
        orgId={orgId}
        staff={staff}
        services={services}
        preselectedDate={today}
      />
    </div>
  );
}
