"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, User, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Appointment, AppointmentStatus } from "@/types/database";
import { STATUS_LABEL_KEYS, STATUS_BADGE_CLASSES } from "@/lib/appointment-status";

type ApptWithRelations = Appointment & {
  staff?: { full_name: string };
  service?: { name: string; duration_minutes: number };
};

const QUICK_ACTIONS: { key: AppointmentStatus; labelKey: string; icon: typeof CheckCircle2; className: string }[] = [
  { key: "onaylandi", labelKey: "approve", icon: CheckCircle2, className: "text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/20" },
  { key: "tamamlandi", labelKey: "markCompleted", icon: CheckCircle2, className: "text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-900/20" },
  { key: "gelmedi", labelKey: "statusGelmedi", icon: AlertCircle, className: "text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-900/20" },
  { key: "iptal", labelKey: "cancelAction", icon: XCircle, className: "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20" },
];

export function RandevuCard({ appt: initial, canQuickAct }: { appt: ApptWithRelations; canQuickAct: boolean }) {
  const t = useTranslations("dashboard");
  const [appt, setAppt] = useState(initial);
  const [updating, setUpdating] = useState(false);

  async function updateStatus(newStatus: AppointmentStatus) {
    if (updating) return;
    setUpdating(true);
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json().catch(() => ({}));
    setUpdating(false);
    if (!res.ok) {
      toast.error(data.error ?? "Durum güncellenemedi");
      return;
    }
    setAppt((a) => ({ ...a, status: newStatus }));
    toast.success("Durum güncellendi");
  }

  const actions = QUICK_ACTIONS.filter((a) => a.key !== appt.status);

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <Link href={`/dashboard/randevular/${appt.id}`} className="block">
          <div className="flex items-center gap-4 cursor-pointer">
            <div className="text-center w-16 shrink-0">
              <p className="text-xs text-muted-foreground">
                {format(new Date(appt.appointment_at), "d MMM", { locale: tr })}
              </p>
              <p className="text-base font-bold text-primary">
                {format(new Date(appt.appointment_at), "HH:mm")}
              </p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{appt.customer_name}</p>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_BADGE_CLASSES[appt.status])}>
                  {t(STATUS_LABEL_KEYS[appt.status])}
                </Badge>
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 min-w-0">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{appt.staff?.full_name}</span>
                </span>
                <span className="truncate">• {appt.service?.name}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Phone className="h-3 w-3 shrink-0" />
                  {appt.customer_phone}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-semibold">₺{Number(appt.price).toLocaleString("tr-TR")}</p>
              <p className="text-xs text-muted-foreground">{appt.duration_minutes}dk</p>
            </div>
          </div>
        </Link>

        {canQuickAct && actions.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-border">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                disabled={updating}
                onClick={() => updateStatus(a.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  a.className
                )}
              >
                {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <a.icon className="h-3 w-3" />}
                {t(a.labelKey)}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
