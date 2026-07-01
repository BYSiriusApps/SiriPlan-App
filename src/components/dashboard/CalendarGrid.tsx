"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  talep: "bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-200",
  onaylandi: "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200",
  tamamlandi: "bg-green-100 border-green-300 text-green-900 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200",
  iptal: "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-400 opacity-60",
  gelmedi: "bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 opacity-70",
};

const STATUS_LABELS: Record<string, string> = {
  talep: "Bekliyor",
  onaylandi: "Onaylı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gelmedi: "Gelmedi",
};

interface Appointment {
  id: string;
  status: string;
  customer_name: string;
  appointment_at: string;
  duration_minutes: number;
  staff_id: string;
  service?: { name: string } | null;
}

interface Staff {
  id: string;
  full_name: string;
}

interface Props {
  staff: Staff[];
  appointments: Appointment[];
  weekDays: string[]; // ISO date strings yyyy-MM-dd
  today: string;
  hours: number[];
}

interface Popover {
  appt: Appointment;
  x: number;
  y: number;
}

export function CalendarGrid({ staff, appointments, weekDays, today, hours }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [popover, setPopover] = useState<Popover | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Group appointments by staff and day
  const apptMap: Record<string, Record<string, Appointment[]>> = {};
  for (const a of appointments) {
    const sid = a.staff_id;
    const day = a.appointment_at.slice(0, 10);
    if (!apptMap[sid]) apptMap[sid] = {};
    if (!apptMap[sid][day]) apptMap[sid][day] = [];
    apptMap[sid][day].push(a);
  }

  async function updateStatus(apptId: string, newStatus: string) {
    setUpdatingId(apptId);
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLocalStatuses((prev) => ({ ...prev, [apptId]: newStatus }));
        toast.success(`Durum: ${STATUS_LABELS[newStatus]}`);
        setPopover(null);
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast.error(err.error || "Güncellenemedi");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function openPopover(e: React.MouseEvent, appt: Appointment) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ appt, x: rect.right + 8, y: rect.top });
  }

  return (
    <>
      {staff.map((s) => (
        <div key={s.id} className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="border-b p-3 flex items-center gap-2 bg-muted/30">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {s.full_name[0]}
            </div>
            <span className="font-medium text-sm">{s.full_name}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 min-w-[700px]">
              {/* Hour labels */}
              <div className="border-r">
                <div className="h-10 border-b" />
                {hours.map((h) => (
                  <div key={h} className="h-14 border-b flex items-center justify-center text-xs text-muted-foreground">
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((dayStr) => {
                const dayAppts = apptMap[s.id]?.[dayStr] || [];
                const isToday = dayStr === today;
                const dayLabel = format(new Date(dayStr + "T12:00:00"), "EEE d", { locale: tr });

                return (
                  <div key={dayStr} className="border-r last:border-r-0">
                    <div className={cn("h-10 border-b flex items-center justify-center text-xs font-medium", isToday && "bg-primary/10 text-primary")}>
                      {dayLabel}
                    </div>
                    <div className="relative">
                      {hours.map((h) => (
                        <div key={h} className="h-14 border-b border-border/50" />
                      ))}
                      {dayAppts.map((appt) => {
                        const apptDate = new Date(appt.appointment_at);
                        const startMin = apptDate.getHours() * 60 + apptDate.getMinutes();
                        const top = ((startMin - hours[0] * 60) / 60) * 56;
                        const height = Math.max(28, (appt.duration_minutes / 60) * 56);
                        const status = localStatuses[appt.id] ?? appt.status;

                        return (
                          <button
                            key={appt.id}
                            onClick={(e) => openPopover(e, { ...appt, status })}
                            style={{ top: `${top}px`, height: `${height}px` }}
                            className={cn(
                              "absolute left-1 right-1 rounded px-1 py-0.5 border text-[10px] leading-tight overflow-hidden cursor-pointer hover:shadow transition-shadow text-left",
                              STATUS_COLORS[status]
                            )}
                          >
                            <p className="font-semibold truncate">{format(apptDate, "HH:mm")} {appt.customer_name}</p>
                            <p className="truncate opacity-75">{appt.service?.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Popover */}
      {popover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-50 w-56 rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: Math.min(popover.x, window.innerWidth - 240),
              top: Math.min(popover.y, window.innerHeight - 300),
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{popover.appt.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{popover.appt.service?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(popover.appt.appointment_at), "HH:mm")} · {popover.appt.duration_minutes}dk
                </p>
              </div>
              <button onClick={() => setPopover(null)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Status badge */}
            <div className="px-3 py-2 border-b">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", STATUS_COLORS[localStatuses[popover.appt.id] ?? popover.appt.status])}>
                {STATUS_LABELS[localStatuses[popover.appt.id] ?? popover.appt.status]}
              </span>
            </div>

            {/* Quick actions */}
            <div className="p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground px-1 pb-0.5">Hızlı Güncelle</p>

              {(localStatuses[popover.appt.id] ?? popover.appt.status) !== "onaylandi" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "onaylandi")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Onayla
                </button>
              )}

              {(localStatuses[popover.appt.id] ?? popover.appt.status) !== "tamamlandi" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "tamamlandi")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Tamamlandı
                </button>
              )}

              {(localStatuses[popover.appt.id] ?? popover.appt.status) !== "gelmedi" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "gelmedi")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  Gelmedi
                </button>
              )}

              {(localStatuses[popover.appt.id] ?? popover.appt.status) !== "iptal" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "iptal")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  İptal Et
                </button>
              )}

              <div className="border-t pt-1 mt-1">
                <Link
                  href={`/dashboard/randevular/${popover.appt.id}`}
                  onClick={() => setPopover(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Detaya Git
                </Link>
              </div>
            </div>
            {isPending && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
