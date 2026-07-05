"use client";

import Link from "next/link";
import { QuickBookSheet } from "./QuickBookSheet";
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
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <LayoutList className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Randevular</h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/randevular/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
        >
          Detaylı Form
        </Link>
        <QuickBookSheet orgId={orgId} staff={staff} services={services} />
      </div>
    </div>
  );
}
