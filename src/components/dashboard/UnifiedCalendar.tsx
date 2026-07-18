"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  X, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink,
  ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type CalendarView = "day" | "week" | "month";

// Personel renk paleti — her personel dizindeki rengini alır
const STAFF_COLORS = [
  { solid: "#6366f1", soft: "rgba(99,102,241,0.16)", border: "rgba(99,102,241,0.55)" },   // indigo
  { solid: "#ec4899", soft: "rgba(236,72,153,0.16)", border: "rgba(236,72,153,0.55)" },   // pink
  { solid: "#10b981", soft: "rgba(16,185,129,0.16)", border: "rgba(16,185,129,0.55)" },   // emerald
  { solid: "#f59e0b", soft: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.6)" },    // amber
  { solid: "#06b6d4", soft: "rgba(6,182,212,0.16)", border: "rgba(6,182,212,0.55)" },     // cyan
  { solid: "#8b5cf6", soft: "rgba(139,92,246,0.16)", border: "rgba(139,92,246,0.55)" },   // violet
  { solid: "#ef4444", soft: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.5)" },      // red
  { solid: "#84cc16", soft: "rgba(132,204,22,0.18)", border: "rgba(132,204,22,0.55)" },   // lime
  { solid: "#f97316", soft: "rgba(249,115,22,0.16)", border: "rgba(249,115,22,0.55)" },   // orange
  { solid: "#14b8a6", soft: "rgba(20,184,166,0.16)", border: "rgba(20,184,166,0.55)" },   // teal
];

const STATUS_LABELS: Record<string, string> = {
  talep: "Bekliyor",
  onaylandi: "Onaylı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gelmedi: "Gelmedi",
};

const HOUR_PX = 56; // 1 saat = 56px → 15dk = 14px

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
  /** Salon sahibinin atadığı kalıcı renk (hex). Boşsa palet sırası kullanılır. */
  color?: string | null;
}

// "#rrggbb" → rgba(r,g,b,a)
function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

interface Props {
  view: CalendarView;
  label: string;
  viewDate: string;   // yyyy-MM-dd
  prevDate: string;
  nextDate: string;
  gridDays: string[]; // görünür günler (day:1, week:7, month:35-42)
  today: string;
  hours: number[];
  orgId: string;
  staff: Staff[];
  appointments: Appointment[];
  lockedStaffId: string | null; // staff rolü: sadece kendi randevuları
}

interface Popover {
  appt: Appointment;
  x: number;
  y: number;
}

interface Positioned {
  appt: Appointment;
  lane: number;
  lanes: number;
}

// Aynı gün içinde çakışan randevuları yan yana şeritlere yerleştirir
function layoutDay(appts: Appointment[]): Positioned[] {
  const sorted = [...appts].sort(
    (a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime()
  );
  const laneEnds: number[] = [];
  const placed: { appt: Appointment; lane: number; start: number; end: number }[] = [];

  for (const appt of sorted) {
    const start = new Date(appt.appointment_at).getTime();
    const end = start + appt.duration_minutes * 60_000;
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placed.push({ appt, lane, start, end });
  }

  // Çakışma kümesi başına şerit sayısı
  return placed.map((p) => {
    const overlapping = placed.filter((q) => q.start < p.end && q.end > p.start);
    const lanes = Math.max(...overlapping.map((q) => q.lane)) + 1;
    return { appt: p.appt, lane: p.lane, lanes };
  });
}

export function UnifiedCalendar({
  view, label, viewDate, prevDate, nextDate, gridDays, today,
  hours, orgId, staff, appointments, lockedStaffId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [popover, setPopover] = useState<Popover | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | "all">(
    lockedStaffId ?? "all"
  );
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorOf = useMemo(() => {
    const map = new Map<string, (typeof STAFF_COLORS)[number]>();
    staff.forEach((s, i) => {
      // DB'de özel renk atanmışsa onu kullan; yoksa palet sırası
      if (s.color && /^#[0-9a-fA-F]{6}$/.test(s.color)) {
        map.set(s.id, {
          solid: s.color,
          soft: hexToRgba(s.color, 0.16),
          border: hexToRgba(s.color, 0.55),
        });
      } else {
        map.set(s.id, STAFF_COLORS[i % STAFF_COLORS.length]);
      }
    });
    return (id: string) => map.get(id) ?? STAFF_COLORS[0];
  }, [staff]);

  const staffName = useMemo(() => {
    const map = new Map(staff.map((s) => [s.id, s.full_name]));
    return (id: string) => map.get(id) ?? "";
  }, [staff]);

  // Supabase Realtime: dışarıdan eklenen/güncellenen randevuları yakala
  useEffect(() => {
    const supabase = createClient();

    function scheduleRefresh() {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        startTransition(() => router.refresh());
      }, 800);
    }

    const channel = supabase
      .channel(`calendar-appointments-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `org_id=eq.${orgId}` },
        () => scheduleRefresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointment_requests", filter: `org_id=eq.${orgId}` },
        () => scheduleRefresh()
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  // Filtre: kilitli personel (staff rolü) veya seçilen personel
  const visibleAppointments = useMemo(() => {
    const activeFilter = lockedStaffId ?? (selectedStaff === "all" ? null : selectedStaff);
    return activeFilter
      ? appointments.filter((a) => a.staff_id === activeFilter)
      : appointments;
  }, [appointments, selectedStaff, lockedStaffId]);

  // YEREL saate göre gün bazında grupla (UTC slice değil — tz kayması yapmaz)
  const byDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of visibleAppointments) {
      const day = format(new Date(a.appointment_at), "yyyy-MM-dd");
      (map[day] ??= []).push(a);
    }
    return map;
  }, [visibleAppointments]);

  async function updateStatus(apptId: string, newStatus: string) {
    setUpdatingId(apptId);
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
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
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ appt, x: rect.right + 8, y: rect.top });
  }

  const gridHeight = hours.length * HOUR_PX;

  function apptBlockStyle(appt: Appointment) {
    const d = new Date(appt.appointment_at);
    const startMin = d.getHours() * 60 + d.getMinutes();
    const rawTop = ((startMin - hours[0] * 60) / 60) * HOUR_PX;
    const height = Math.max(24, (appt.duration_minutes / 60) * HOUR_PX);
    // Grid dışına taşan randevular gizlenmesin — kenara kenetle
    const top = Math.min(Math.max(rawTop, 0), gridHeight - 24);
    return { top, height: Math.min(height, gridHeight - top) };
  }

  function renderApptBlock(p: Positioned, opts?: { showStaff?: boolean }) {
    const { appt, lane, lanes } = p;
    const c = colorOf(appt.staff_id);
    const { top, height } = apptBlockStyle(appt);
    const width = 100 / lanes;
    const done = appt.status === "tamamlandi";
    const noShow = appt.status === "gelmedi";
    const pending = appt.status === "talep";

    return (
      <button
        key={appt.id}
        onClick={(e) => openPopover(e, appt)}
        style={{
          top, height,
          left: `calc(${lane * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
          background: c.soft,
          borderLeft: `3px solid ${c.solid}`,
          borderTop: `1px solid ${c.border}`,
          borderRight: `1px solid ${c.border}`,
          borderBottom: `1px solid ${c.border}`,
          opacity: noShow ? 0.55 : done ? 0.75 : 1,
        }}
        className={cn(
          "absolute rounded-md px-1 py-0.5 text-[10px] leading-tight overflow-hidden cursor-pointer hover:shadow-md transition-shadow text-left z-10",
          pending && "border-dashed"
        )}
      >
        <p className="font-semibold truncate" style={{ color: c.solid }}>
          {format(new Date(appt.appointment_at), "HH:mm")} {appt.customer_name}
        </p>
        <p className="truncate opacity-80">
          {appt.service?.name}
          {opts?.showStaff ? ` · ${staffName(appt.staff_id)}` : ""}
        </p>
      </button>
    );
  }

  const hourRail = (
    <div className="border-r bg-muted/20">
      <div className="h-10 border-b" />
      {hours.map((h) => (
        <div
          key={h}
          className="border-b flex items-start justify-center pt-0.5 text-[10px] text-muted-foreground"
          style={{ height: HOUR_PX }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );

  // 15 dakikalık kılavuz çizgileri (saat çizgisi koyu, çeyrekler açık)
  const slotLines = (
    <>
      {hours.map((h) => (
        <div key={h} className="border-b border-border/60" style={{ height: HOUR_PX }}>
          <div style={{ height: HOUR_PX / 4 }} className="border-b border-border/15" />
          <div style={{ height: HOUR_PX / 4 }} className="border-b border-border/25" />
          <div style={{ height: HOUR_PX / 4 }} className="border-b border-border/15" />
        </div>
      ))}
    </>
  );

  return (
    <div className="space-y-3">
      {/* Kontrol çubuğu: görünüm + gezinme + personel filtresi */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-card">
          {([["day", "Gün"], ["week", "Hafta"], ["month", "Ay"]] as const).map(([v, l]) => (
            <Link
              key={v}
              href={`/dashboard/takvim?view=${v}&date=${viewDate}`}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
              )}
            >
              {l}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/takvim?view=${view}&date=${prevDate}`}
            className="p-2 rounded-lg border hover:bg-accent transition-colors"
            aria-label="Önceki"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold min-w-[180px] text-center capitalize">{label}</span>
          <Link
            href={`/dashboard/takvim?view=${view}&date=${nextDate}`}
            className="p-2 rounded-lg border hover:bg-accent transition-colors"
            aria-label="Sonraki"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/dashboard/takvim?view=${view}&date=${today}`}
            className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm"
          >
            Bugün
          </Link>
        </div>
      </div>

      {/* Personel filtre çipleri (renk lejantı) */}
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        {lockedStaffId ? (
          // Staff rolü: sadece kendi çipi, kilitli
          staff
            .filter((s) => s.id === lockedStaffId)
            .map((s) => {
              const c = colorOf(s.id);
              return (
                <span
                  key={s.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: c.soft, border: `1px solid ${c.border}`, color: c.solid }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.solid }} />
                  {s.full_name} (sizin randevularınız)
                </span>
              );
            })
        ) : (
          <>
            <button
              onClick={() => setSelectedStaff("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedStaff === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-accent text-muted-foreground"
              )}
            >
              Tümü
            </button>
            {staff.map((s) => {
              const c = colorOf(s.id);
              const active = selectedStaff === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStaff(active ? "all" : s.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    background: active ? c.soft : "transparent",
                    borderColor: active ? c.border : "var(--border)",
                    color: active ? c.solid : "var(--muted-foreground)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.solid }} />
                  {s.full_name}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* ─── HAFTA GÖRÜNÜMÜ ─────────────────────────────────── */}
      {view === "week" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
              {hourRail}
              {gridDays.map((dayStr) => {
                const dayAppts = byDay[dayStr] || [];
                const positioned = layoutDay(dayAppts);
                const isToday = dayStr === today;
                return (
                  <div key={dayStr} className="border-r last:border-r-0 min-w-0">
                    <Link
                      href={`/dashboard/takvim?view=day&date=${dayStr}`}
                      className={cn(
                        "h-10 border-b flex flex-col items-center justify-center text-xs font-medium hover:bg-accent transition-colors",
                        isToday && "bg-primary/10 text-primary"
                      )}
                    >
                      <span className="capitalize">{format(new Date(dayStr + "T12:00:00"), "EEE", { locale: tr })}</span>
                      <span className={cn("text-[10px]", isToday ? "font-bold" : "text-muted-foreground")}>
                        {format(new Date(dayStr + "T12:00:00"), "d MMM", { locale: tr })}
                      </span>
                    </Link>
                    <div className="relative" style={{ height: gridHeight }}>
                      {slotLines}
                      <div className="absolute inset-0">
                        {positioned.map((p) => renderApptBlock(p, { showStaff: selectedStaff === "all" }))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── GÜN GÖRÜNÜMÜ (personel sütunları) ───────────────── */}
      {view === "day" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            {(() => {
              const dayStr = gridDays[0];
              const dayAppts = byDay[dayStr] || [];
              const visibleStaff = lockedStaffId
                ? staff.filter((s) => s.id === lockedStaffId)
                : selectedStaff === "all"
                ? staff
                : staff.filter((s) => s.id === selectedStaff);

              return (
                <div
                  className="grid min-w-[560px]"
                  style={{ gridTemplateColumns: `48px repeat(${Math.max(visibleStaff.length, 1)}, 1fr)` }}
                >
                  {hourRail}
                  {visibleStaff.map((s) => {
                    const c = colorOf(s.id);
                    const staffAppts = dayAppts.filter((a) => a.staff_id === s.id);
                    const positioned = layoutDay(staffAppts);
                    return (
                      <div key={s.id} className="border-r last:border-r-0 min-w-0">
                        <div
                          className="h-10 border-b flex items-center justify-center gap-1.5 text-xs font-semibold"
                          style={{ background: c.soft, color: c.solid }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: c.solid }} />
                          <span className="truncate px-1">{s.full_name}</span>
                        </div>
                        <div className="relative" style={{ height: gridHeight }}>
                          {slotLines}
                          <div className="absolute inset-0">
                            {positioned.map((p) => renderApptBlock(p))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── AY GÖRÜNÜMÜ ────────────────────────────────────── */}
      {view === "month" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gridDays.map((dayStr) => {
              const dayAppts = (byDay[dayStr] || []).sort(
                (a, b) => a.appointment_at.localeCompare(b.appointment_at)
              );
              const isToday = dayStr === today;
              const inMonth = dayStr.slice(0, 7) === viewDate.slice(0, 7);
              const shown = dayAppts.slice(0, 3);
              const more = dayAppts.length - shown.length;
              return (
                <div
                  key={dayStr}
                  className={cn(
                    "min-h-[104px] border-b border-r last:border-r-0 p-1.5 space-y-1",
                    !inMonth && "bg-muted/20 opacity-60"
                  )}
                >
                  <Link
                    href={`/dashboard/takvim?view=day&date=${dayStr}`}
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium hover:bg-accent transition-colors",
                      isToday && "bg-primary text-primary-foreground font-bold"
                    )}
                  >
                    {Number(dayStr.slice(8, 10))}
                  </Link>
                  {shown.map((a) => {
                    const c = colorOf(a.staff_id);
                    return (
                      <button
                        key={a.id}
                        onClick={(e) => openPopover(e, a)}
                        className="w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-pointer hover:shadow transition-shadow"
                        style={{ background: c.soft, borderLeft: `2px solid ${c.solid}` }}
                      >
                        <span className="font-semibold" style={{ color: c.solid }}>
                          {format(new Date(a.appointment_at), "HH:mm")}
                        </span>{" "}
                        {a.customer_name}
                      </button>
                    );
                  })}
                  {more > 0 && (
                    <Link
                      href={`/dashboard/takvim?view=day&date=${dayStr}`}
                      className="block text-[10px] text-primary font-medium hover:underline px-1"
                    >
                      +{more} daha
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Durum Popover ──────────────────────────────────── */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 w-56 rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: Math.min(popover.x, typeof window !== "undefined" ? window.innerWidth - 240 : popover.x),
              top: Math.min(popover.y, typeof window !== "undefined" ? window.innerHeight - 320 : popover.y),
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="px-3 py-2.5 border-b flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{popover.appt.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {popover.appt.service?.name}
                  {staffName(popover.appt.staff_id) ? ` · ${staffName(popover.appt.staff_id)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(popover.appt.appointment_at), "d MMM HH:mm", { locale: tr })} · {popover.appt.duration_minutes}dk
                </p>
              </div>
              <button onClick={() => setPopover(null)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-3 py-2 border-b">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                style={{
                  background: colorOf(popover.appt.staff_id).soft,
                  borderColor: colorOf(popover.appt.staff_id).border,
                  color: colorOf(popover.appt.staff_id).solid,
                }}
              >
                {STATUS_LABELS[popover.appt.status] ?? popover.appt.status}
              </span>
            </div>

            <div className="p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground px-1 pb-0.5">Hızlı Güncelle</p>

              {popover.appt.status !== "onaylandi" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "onaylandi")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Onayla
                </button>
              )}

              {popover.appt.status !== "tamamlandi" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "tamamlandi")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Tamamlandı
                </button>
              )}

              {popover.appt.status !== "gelmedi" && (
                <button
                  onClick={() => updateStatus(popover.appt.id, "gelmedi")}
                  disabled={!!updatingId}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  Gelmedi
                </button>
              )}

              {popover.appt.status !== "iptal" && (
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
    </div>
  );
}
