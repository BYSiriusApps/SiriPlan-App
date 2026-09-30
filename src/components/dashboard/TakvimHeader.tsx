"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HomeButton } from "./HomeButton";
import { CalendarDays, Plus } from "lucide-react";

// QuickBookSheet (~950 satır) mount'ta hem kendi (mic/ses) mantığını hem de
// gereksiz bir /api/org çağrısını tetikliyor; her panel açılışında değil,
// yalnızca butona tıklanınca yüklenmesi için code-split edildi (bkz.
// src/app/dashboard/stok/page.tsx'teki BarcodeScanner ile aynı desen).
// Fallback, gerçek SheetTrigger butonuyla (QuickBookSheet.tsx satır ~547-552)
// birebir aynı boyut/görünümde — yoksa tıklamadan önce/sonra CLS/sıçrama olur.
const QuickBookSheet = dynamic(
  () => import("./QuickBookSheet").then((mod) => mod.QuickBookSheet),
  {
    ssr: false,
    loading: () => <QuickBookSheetFallback />,
  }
);

function QuickBookSheetFallback() {
  const tqb = useTranslations("dashboard.quickBook");
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" className="gap-1.5" disabled>
        <Plus className="h-4 w-4" />
        {tqb("addButton")}
      </Button>
    </div>
  );
}

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
        <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("calendar")}</h1>
      </div>
      <div className="flex items-center gap-2">
        <QuickBookSheet
          orgId={orgId}
          staff={staff}
          services={services}
          preselectedDate={today}
          currentStaffId={currentStaffId}
        />
        <HomeButton corner />
      </div>
    </div>
  );
}
