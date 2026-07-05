"use client";

import Link from "next/link";
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
  weekLabel: string;
  prevWeek: string;
  nextWeek: string;
  today: string;
}

export function TakvimHeader({ orgId, staff, services, weekLabel, prevWeek, nextWeek, today }: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h1 className="text-2xl font-bold">Takvim</h1>
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/dashboard/takvim?date=${prevWeek}`} className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm">
          ← Önceki
        </Link>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Link href={`/dashboard/takvim?date=${nextWeek}`} className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm">
          Sonraki →
        </Link>
        <Link href="/dashboard/takvim" className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm">
          Bu Hafta
        </Link>
        <QuickBookSheet
          orgId={orgId}
          staff={staff}
          services={services}
          preselectedDate={today}
        />
      </div>
    </div>
  );
}
