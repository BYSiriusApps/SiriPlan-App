"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr, enUS, ru, ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  X, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink,
  ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CalendarView = "day" | "staff" | "week" | "month";

const DATE_FNS_LOCALES = { tr, en: enUS, ru, ar } as const;
// Sabit referans hafta (Pzt→Paz) — ay görünümü başlığındaki gün kısaltmalarını
// aktif dile göre üretmek için kullanılır, yeni çeviri key'i gerektirmez.
const WEEKDAY_REF_DATES = [
  "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04",
  "2024-01-05", "2024-01-06", "2024-01-07",
];

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

interface TimeOff {
  staff_id: string | null; // null = işletme geneli kapalı gün
  starts_on: string;       // yyyy-MM-dd
  ends_on: string;
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
  timeOff: TimeOff[];
  lockedStaffId: string | null; // staff rolü: sadece kendi randevuları
  /** Randevu dilimi (dk) — Ayarlar > Randevu Dilimi Aralığı'ndan gelir. Varsayılan 15. */
  slotMinutes: number;
  userRole?: string;
  currentStaffId?: string | null;
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
  hours, orgId, staff, appointments, timeOff, lockedStaffId, slotMinutes,
  userRole, currentStaffId,
}: Props) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  // Gün görünümü saat bazında çok daha büyük gösterilir (tek gün, tüm genişlik boş kalmasın);
  // hafta görünümü de öncekinden biraz büyütüldü.
  const HOUR_PX = view === "day" || view === "staff" ? 112 : 64;
  const dateFnsLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? tr;
  const weekdayShort = useMemo(
    () => WEEKDAY_REF_DATES.map((d) => format(new Date(d + "T12:00:00"), "EEE", { locale: dateFnsLocale })),
    [dateFnsLocale]
  );
  const statusLabel = (status: string) => {
    switch (status) {
      case "talep": return t("statusTalep");
      case "onaylandi": return t("statusOnaylandi");
      case "tamamlandi": return t("statusTamamlandi");
      case "iptal": return t("statusIptal");
      case "gelmedi": return t("noShow");
      default: return status;
    }
  };
  const [isPending, startTransition] = useTransition();
  const [popover, setPopover] = useState<Popover | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Çoklu personel seçimi. Boş küme = "tümü". Staff rolü kendine kilitli.
  // Set yerine sıralı diziyle tutmak, useMemo bağımlılıklarında referans
  // kıyası yapılabilsin diye string'e serilenebilir olmasını sağlar.
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    lockedStaffId ? [lockedStaffId] : []
  );
  const selectedStaffKey = selectedStaffIds.join(",");
  const isAllStaff = selectedStaffIds.length === 0;

  function toggleStaff(id: string) {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
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

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, dayStr: string, staffIdOverride?: string) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const minutesFromStart = Math.floor((clickY / HOUR_PX) * 60);
    const roundedMinutes = Math.floor(minutesFromStart / slotMinutes) * slotMinutes;
    const targetHour = hours[0] + Math.floor(roundedMinutes / 60);
    const targetMinute = roundedMinutes % 60;
    const formattedTime = `${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}`;

    const params = new URLSearchParams({
      date: dayStr,
      time: formattedTime,
    });
    if (staffIdOverride) params.set("staff_id", staffIdOverride);
    else if (lockedStaffId) params.set("staff_id", lockedStaffId);
    else if (selectedStaffIds.length === 1) params.set("staff_id", selectedStaffIds[0]);

    router.push(`/dashboard/randevular/yeni?${params.toString()}`);
  }

  // Bir günde işletme geneli kapalı mı, hangi personel izinli?
  const orgClosedOn = useMemo(
    () => (dayStr: string) => timeOff.some((t) => t.staff_id === null && t.starts_on <= dayStr && t.ends_on >= dayStr),
    [timeOff]
  );
  const staffOffOn = useMemo(
    () => (dayStr: string, staffId: string) =>
      timeOff.some((t) => t.staff_id === staffId && t.starts_on <= dayStr && t.ends_on >= dayStr),
    [timeOff]
  );
  const offStaffNamesOn = useMemo(
    () => (dayStr: string) =>
      staff.filter((s) => staffOffOn(dayStr, s.id)).map((s) => s.full_name),
    [staff, staffOffOn]
  );

  // Supabase Realtime: dışarıdan eklenen/güncellenen randevuları yakala.
  // Realtime salt bir "canlı yenile" kolaylığı — CSP/ağ/tarayıcı engellerse
  // (ör. WebSocket kurulumu bazı WebKit sürümlerinde senkron fırlatabiliyor)
  // sayfanın tamamı çökmemeli, sadece canlı yenileme sessizce devre dışı kalmalı.
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    function scheduleRefresh() {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        startTransition(() => router.refresh());
      }, 800);
    }

    try {
      supabase = createClient();
      channel = supabase
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
        .subscribe((_status, err) => {
          if (err) console.warn("Takvim canlı yenileme devre dışı:", err);
        });
    } catch (err) {
      console.warn("Takvim canlı yenileme başlatılamadı:", err);
    }

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  // Filtre: kilitli personel (staff rolü) veya seçilen personel kümesi.
  // Boş küme (isAllStaff) → tüm personel gösterilir.
  const visibleAppointments = useMemo(() => {
    if (lockedStaffId) return appointments.filter((a) => a.staff_id === lockedStaffId);
    if (selectedStaffIds.length === 0) return appointments;
    const set = new Set(selectedStaffIds);
    return appointments.filter((a) => set.has(a.staff_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, selectedStaffKey, lockedStaffId]);

  // Personel sütun görünümünde gösterilecek personeller (çoklu seçim)
  const staffColumns = useMemo(() => {
    if (lockedStaffId) return staff.filter((s) => s.id === lockedStaffId);
    if (selectedStaffIds.length === 0) return staff;
    const set = new Set(selectedStaffIds);
    return staff.filter((s) => set.has(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, selectedStaffKey, lockedStaffId]);

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
        toast.success(t("statusUpdatedToast", { status: statusLabel(newStatus) }));
        setPopover(null);
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast.error(err.error || t("updateFailed"));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function openPopover(e: React.MouseEvent, appt: Appointment) {
    e.preventDefault();
    e.stopPropagation();
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ appt, x: rect.right + 8, y: rect.top });
  }

  const gridHeight = hours.length * HOUR_PX;

  // ── Sürükle-bırak: randevuyu farklı bir saate (hafta/gün görünümü) veya
  // farklı bir güne (yalnızca hafta görünümü) taşımak için. Personel/lane
  // değişmez — kapsamı büyütmemek için o kısım popover/düzenleme formunda kalır.
  const justDraggedRef = useRef(false);
  const columnRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragRef = useRef<{
    apptId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origAt: string;
    dayIndex: number;
    dragging: boolean;
    pendingDate: Date | null;
    pendingDayIndex: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ apptId: string; dayIndex: number; top: number; height: number; label: string } | null>(null);
  // Sürükleme bitince direkt kaydetmek yerine onay ekranı gösterilir —
  // yanlışlıkla kaydırma ya da hızlı hareket, saat/gün elle düzeltilebilsin
  // diye burada yakalanır; API'ye ancak kullanıcı onaylayınca istek gider
  // (aksi halde her yanlış sürüklemede WhatsApp mesajı da gidiyordu).
  const [rescheduleConfirm, setRescheduleConfirm] = useState<{ appt: Appointment; origAt: string; newDate: Date } | null>(null);
  const rescheduleDisplayRef = useRef<{ appt: Appointment; origAt: string; newDate: Date } | null>(null);
  if (rescheduleConfirm) rescheduleDisplayRef.current = rescheduleConfirm;
  const rescheduleDisplay = rescheduleConfirm ?? rescheduleDisplayRef.current;
  // Pointer move her piksel hareketinde tetiklenir; setState'i rAF'a
  // sıkıştırmadan tüm takvim ağacı saniyede onlarca kez yeniden render
  // edilip donma hissi yaratıyordu.
  const moveRafRef = useRef<number | null>(null);

  function onApptPointerDown(e: React.PointerEvent, appt: Appointment, dayIndex: number) {
    if (view === "month") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      apptId: appt.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origAt: appt.appointment_at,
      dayIndex,
      dragging: false,
      pendingDate: null,
      pendingDayIndex: dayIndex,
    };
  }

  function onApptPointerMove(e: React.PointerEvent, appt: Appointment, height: number) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId || d.apptId !== appt.id) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.dragging && Math.hypot(dx, dy) < 6) return;
    d.dragging = true;

    const clientX = e.clientX;
    if (moveRafRef.current != null) return;
    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = null;
      const cur = dragRef.current;
      if (!cur || cur.apptId !== appt.id) return;

      const rawMinDelta = (dy / HOUR_PX) * 60;
      const snappedMinDelta = Math.round(rawMinDelta / slotMinutes) * slotMinutes;

      let newDayIndex = cur.dayIndex;
      if (view === "week") {
        const idx = columnRefs.current.findIndex((el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return clientX >= r.left && clientX < r.right;
        });
        if (idx !== -1) newDayIndex = idx;
      }

      const origStart = new Date(cur.origAt);
      const totalMinAtDay = origStart.getHours() * 60 + origStart.getMinutes() + snappedMinDelta;
      const baseDayStr = view === "week" ? gridDays[newDayIndex] : format(origStart, "yyyy-MM-dd");
      const newDate = new Date(baseDayStr + "T00:00:00");
      newDate.setMinutes(totalMinAtDay);

      cur.pendingDate = newDate;
      cur.pendingDayIndex = newDayIndex;

      const previewMin = newDate.getHours() * 60 + newDate.getMinutes();
      const rawTop = ((previewMin - hours[0] * 60) / 60) * HOUR_PX;
      const top = Math.min(Math.max(rawTop, 0), gridHeight - 24);
      setDragPreview({
        apptId: appt.id,
        dayIndex: newDayIndex,
        top,
        height: Math.min(height, gridHeight - top),
        label: format(newDate, "HH:mm"),
      });
    });
  }

  function onApptPointerUp(e: React.PointerEvent, appt: Appointment) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId || d.apptId !== appt.id) return;
    if (moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    dragRef.current = null;
    setDragPreview(null);
    if (!d.dragging || !d.pendingDate) return;
    justDraggedRef.current = true;

    if (d.pendingDate.getTime() === new Date(d.origAt).getTime()) return;

    // Direkt kaydetme yok — kullanıcı onay ekranında saati/günü teyit
    // (ya da düzeltip onaylar) etmeden hiçbir API isteği gitmez.
    setRescheduleConfirm({ appt, origAt: d.origAt, newDate: d.pendingDate });
  }

  async function confirmReschedule() {
    if (!rescheduleConfirm) return;
    const { appt, newDate } = rescheduleConfirm;
    setUpdatingId(appt.id);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_at: newDate.toISOString() }),
      });
      if (res.ok) {
        toast.success(t("rescheduleUpdatedToast"));
        setRescheduleConfirm(null);
        startTransition(() => router.refresh());
      } else {
        const err = await res.json();
        toast.error(err.error || t("updateFailed"));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // Dakikada bir tazelenen "şimdi" — devam eden randevu ve kırmızı çizgi için
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      if (moveRafRef.current != null) cancelAnimationFrame(moveRafRef.current);
    };
  }, []);

  // Randevu şu an devam ediyor mu? (onaylı + saat aralığının içindeyiz)
  const isLive = (a: Appointment) => {
    if (a.status !== "onaylandi") return false;
    const start = new Date(a.appointment_at).getTime();
    return now.getTime() >= start && now.getTime() < start + a.duration_minutes * 60_000;
  };

  // Görünen aralık için durum özeti
  const statusCounts = useMemo(() => {
    const c = { talep: 0, devam: 0, onaylandi: 0, tamamlandi: 0 };
    for (const a of visibleAppointments) {
      if (isLive(a)) c.devam++;
      else if (a.status === "talep") c.talep++;
      else if (a.status === "onaylandi") c.onaylandi++;
      else if (a.status === "tamamlandi") c.tamamlandi++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAppointments, now]);

  // Kırmızı "şu an" çizgisi (bugün görünürken)
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - hours[0] * 60) / 60) * HOUR_PX;
  const nowVisible = nowTop >= 0 && nowTop <= gridHeight;
  const nowLine = nowVisible ? (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
      <div className="flex items-center">
        <span className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
        <div className="flex-1 h-[2px] bg-red-500/80" />
      </div>
    </div>
  ) : null;

  function apptBlockStyle(appt: Appointment) {
    const d = new Date(appt.appointment_at);
    const startMin = d.getHours() * 60 + d.getMinutes();
    const rawTop = ((startMin - hours[0] * 60) / 60) * HOUR_PX;
    // Not: yüksekliği gerçek süreden fazla şişirmiyoruz — art arda kısa randevular
    // birbirinin üzerine taşar. Bunun yerine kısa kutularda 2. satır (hizmet) gizlenir.
    const height = Math.max(view === "day" ? 32 : 24, (appt.duration_minutes / 60) * HOUR_PX);
    // Grid dışına taşan randevular gizlenmesin — kenara kenetle
    const top = Math.min(Math.max(rawTop, 0), gridHeight - 24);
    return { top, height: Math.min(height, gridHeight - top) };
  }

  function renderApptBlock(p: Positioned, opts?: { showStaff?: boolean; dayIndex?: number }) {
    const { appt, lane, lanes } = p;
    const c = colorOf(appt.staff_id);
    const { top, height } = apptBlockStyle(appt);
    const width = 100 / lanes;
    const done = appt.status === "tamamlandi";
    const noShow = appt.status === "gelmedi";
    const pending = appt.status === "talep";
    const live = isLive(appt);
    const beingDragged = dragPreview?.apptId === appt.id;
    // Kutu çok kısaysa (kısa süreli randevu) 2. satırı (hizmet) gizle —
    // saat + isim (başlık) her koşulda kesilmeden tam görünsün.
    const canShowServiceLine = height >= (view === "day" || view === "staff" ? 46 : 34);

    return (
      <button
        key={appt.id}
        onClick={(e) => openPopover(e, appt)}
        onPointerDown={(e) => onApptPointerDown(e, appt, opts?.dayIndex ?? 0)}
        onPointerMove={(e) => onApptPointerMove(e, appt, height)}
        onPointerUp={(e) => onApptPointerUp(e, appt)}
        onPointerCancel={() => { dragRef.current = null; setDragPreview(null); }}
        style={{
          top, height,
          left: `calc(${lane * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
          background: done ? "rgba(16,185,129,0.18)" : noShow ? "rgba(245,158,11,0.22)" : c.soft,
          borderLeft: `3px solid ${c.solid}`,
          borderTop: `1px solid ${live ? c.solid : c.border}`,
          borderRight: `1px solid ${live ? c.solid : c.border}`,
          borderBottom: `1px solid ${live ? c.solid : c.border}`,
          opacity: beingDragged ? 0.35 : 1,
          boxShadow: live ? `0 0 0 1px ${c.solid}, 0 2px 10px ${c.border}` : undefined,
          touchAction: view === "month" ? undefined : "none",
        }}
        className={cn(
          "absolute rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-shadow text-left z-10 select-none",
          view === "day" || view === "staff" ? "px-2 py-1.5 text-[13px] leading-snug" : "px-1.5 py-1 text-[11px] leading-tight",
          pending && "border-dashed"
        )}
      >
        <p className="font-semibold truncate" style={{ color: c.solid }}>
          {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1 align-middle" />}
          {done && <span className="mr-0.5">✓</span>}
          {noShow && <span className="mr-0.5">⚠</span>}
          {format(new Date(appt.appointment_at), "HH:mm")} {appt.customer_name}
        </p>
        {canShowServiceLine && (
          <p className="truncate opacity-80">
            {live ? `● ${t("liveNow")} · ` : ""}
            {appt.service?.name}
            {opts?.showStaff ? ` · ${staffName(appt.staff_id)}` : ""}
          </p>
        )}
      </button>
    );
  }

  const hourRail = (
    <div className="border-r bg-muted/20">
      <div className="h-10 border-b" />
      {hours.map((h) => (
        <div
          key={h}
          className={cn(
            "border-b flex items-start justify-center pt-0.5 text-muted-foreground",
            view === "day" || view === "staff" ? "text-xs font-medium pt-1.5" : "text-[10px]"
          )}
          style={{ height: HOUR_PX }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );

  // Randevu dilimi kılavuz çizgileri (saat çizgisi koyu, ara dilimler açık) —
  // dilim sayısı Ayarlar'daki booking_slot_minutes'e göre değişir (15dk→4, 30dk→2, 60dk→1).
  const divisionsPerHour = 60 / slotMinutes;
  const slotLines = (
    <>
      {hours.map((h) => (
        <div key={h} className="border-b border-border/60" style={{ height: HOUR_PX }}>
          {Array.from({ length: divisionsPerHour - 1 }, (_, i) => (
            <div
              key={i}
              style={{ height: HOUR_PX / divisionsPerHour }}
              // Yarım saat çizgisi (i.e. saat başından 30dk sonrası) biraz daha belirgin
              className={cn("border-b", (i + 1) * slotMinutes === 30 ? "border-border/25" : "border-border/15")}
            />
          ))}
        </div>
      ))}
    </>
  );

  return (
    <div className="space-y-3">
      {/* Kontrol çubuğu: görünüm + gezinme + personel filtresi */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-card">
          {([["day", t("day")], ["staff", "👥 Personel"], ["week", t("week")], ["month", t("month")]] as const).map(([v, l]) => (
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
            aria-label={t("previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold min-w-[180px] text-center capitalize">{label}</span>
          <Link
            href={`/dashboard/takvim?view=${view}&date=${nextDate}`}
            className="p-2 rounded-lg border hover:bg-accent transition-colors"
            aria-label={t("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/dashboard/takvim?view=${view}&date=${today}`}
            className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm"
          >
            {t("today")}
          </Link>
        </div>
      </div>

      {/* Durum özeti — görünen aralıktaki randevu durumları */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {statusCounts.devam > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {statusCounts.devam} {t("inProgress")}
          </span>
        )}
        <span className="px-2.5 py-1 rounded-full font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
          {statusCounts.talep} {t("awaiting")}
        </span>
        <span className="px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
          {statusCounts.onaylandi} {t("approved")}
        </span>
        <span className="px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          ✓ {statusCounts.tamamlandi} {t("completedChip")}
        </span>
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
                  {s.full_name} ({t("yourAppointments")})
                </span>
              );
            })
        ) : (
          <>
            <button
              onClick={() => setSelectedStaffIds([])}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                isAllStaff
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-accent text-muted-foreground"
              )}
            >
              {t("all")}
            </button>
            {staff.map((s) => {
              const c = colorOf(s.id);
              const active = selectedStaffIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    background: active ? c.soft : "transparent",
                    borderColor: active ? c.border : "var(--border)",
                    color: active ? c.solid : "var(--muted-foreground)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.solid }} />
                  {s.full_name}
                  {active && <span className="ml-0.5 opacity-70">✓</span>}
                </button>
              );
            })}
            {!isAllStaff && (
              <span className="text-[11px] text-muted-foreground">
                {selectedStaffIds.length}/{staff.length}
              </span>
            )}
          </>
        )}
      </div>

      {/* ─── HAFTA GÖRÜNÜMÜ ─────────────────────────────────── */}
      {view === "week" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
              {hourRail}
              {gridDays.map((dayStr, dayIndex) => {
                const dayAppts = byDay[dayStr] || [];
                const positioned = layoutDay(dayAppts);
                const isToday = dayStr === today;
                const closed = orgClosedOn(dayStr);
                const offNames = offStaffNamesOn(dayStr);
                return (
                  <div
                    key={dayStr}
                    ref={(el) => { columnRefs.current[dayIndex] = el; }}
                    className="border-r last:border-r-0 min-w-0"
                  >
                    <Link
                      href={`/dashboard/takvim?view=day&date=${dayStr}`}
                      className={cn(
                        "h-10 border-b flex flex-col items-center justify-center text-xs font-medium hover:bg-accent transition-colors",
                        isToday && "bg-primary/20 text-primary font-bold border-b-2 border-primary shadow-sm",
                        closed && "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      <span className="capitalize">{format(new Date(dayStr + "T12:00:00"), "EEE", { locale: dateFnsLocale })}</span>
                      <span className={cn("text-[10px]", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                        {format(new Date(dayStr + "T12:00:00"), "d MMM", { locale: dateFnsLocale })}
                      </span>
                    </Link>
                    {(closed || offNames.length > 0) && (
                      <div className="px-1 py-0.5 text-[9px] leading-tight text-center truncate bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-b">
                        {closed ? "Kapalı" : `İzinli: ${offNames.join(", ")}`}
                      </div>
                    )}
                    <div
                      className="relative cursor-pointer"
                      style={{ height: gridHeight }}
                      onClick={(e) => handleGridClick(e, dayStr)}
                    >
                      {slotLines}
                      {isToday && nowLine}
                      <div className="absolute inset-0">
                        {positioned.map((p) => renderApptBlock(p, { showStaff: !lockedStaffId && selectedStaffIds.length !== 1, dayIndex }))}
                        {dragPreview && dragPreview.dayIndex === dayIndex && (
                          <div
                            className="absolute inset-x-1 rounded-md border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-30 flex items-start justify-center"
                            style={{ top: dragPreview.top, height: dragPreview.height }}
                          >
                            <span className="text-[10px] font-semibold text-primary bg-card/80 px-1 rounded">{dragPreview.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── PERSONEL SÜTUN GÖRÜNÜMÜ (SWIMLANE) ─────────────────── */}
      {view === "staff" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            {/* minmax tabanlı, sabit min-w YOK: mobilde en az 3 personel sütunu
                kaydırmadan sığar, sütun sayısı azsa 1fr kalan alanı doldurur;
                4+ personelde taşan kısım için yatay kaydırma devreye girer. */}
            <div className="grid" style={{ gridTemplateColumns: `40px repeat(${staffColumns.length || 1}, minmax(76px, 1fr))` }}>
              {hourRail}
              {staffColumns.map((s) => {
                const c = colorOf(s.id);
                const dayStr = gridDays[0] || today;
                const staffAppts = (byDay[dayStr] || []).filter((a) => a.staff_id === s.id);
                const positioned = layoutDay(staffAppts);
                const isToday = dayStr === today;
                const offNames = offStaffNamesOn(dayStr);
                const isOff = offNames.includes(s.full_name);

                return (
                  <div key={s.id} className="border-r last:border-r-0 min-w-0 relative">
                    <div
                      className="h-10 border-b flex flex-col items-center justify-center text-xs font-semibold px-2 text-center"
                      style={{ background: c.soft, borderBottomColor: c.border }}
                    >
                      <span className="truncate" style={{ color: c.solid }}>{s.full_name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {t("apptCountLabel", { count: staffAppts.length })}
                      </span>
                    </div>
                    {isOff && (
                      <div className="px-1 py-0.5 text-[9px] leading-tight text-center bg-red-50 dark:bg-red-950/20 text-red-600 border-b">
                        İzinli
                      </div>
                    )}
                    <div
                      className="relative cursor-pointer"
                      style={{ height: gridHeight }}
                      onClick={(e) => handleGridClick(e, dayStr, s.id)}
                    >
                      {slotLines}
                      {isToday && nowLine}
                      <div className="absolute inset-0">
                        {positioned.map((p) => renderApptBlock(p, { showStaff: false }))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── GÜN GÖRÜNÜMÜ (tek birleşik tablo) ───────────────────
          Personel başına ayrı sütun YOK: günün tüm randevuları tek
          zaman çizelgesinde, çakışanlar yan yana şeritlerde. Personel
          rengi ve adı her blokta görünür; filtre çipleriyle daraltılır. */}
      {view === "day" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            {(() => {
              const dayStr = gridDays[0];
              const dayAppts = byDay[dayStr] || [];
              const positioned = layoutDay(dayAppts);
              const isToday = dayStr === today;
              const closed = orgClosedOn(dayStr);
              const offNames = offStaffNamesOn(dayStr);

              return (
                <div className="grid min-w-[420px]" style={{ gridTemplateColumns: "48px 1fr" }}>
                  {hourRail}
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "h-10 border-b flex items-center justify-center gap-2 text-xs font-semibold",
                        isToday && "bg-primary/10 text-primary",
                        closed && "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      <span className="capitalize">
                        {format(new Date(dayStr + "T12:00:00"), "d MMMM EEEE", { locale: dateFnsLocale })}
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {t("apptCountLabel", { count: dayAppts.length })}
                      </span>
                    </div>
                    {(closed || offNames.length > 0) && (
                      <div className="px-1 py-0.5 text-[10px] leading-tight text-center bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-b">
                        {closed ? "İşletme bugün kapalı" : `İzinli: ${offNames.join(", ")}`}
                      </div>
                    )}
                    <div
                      className="relative cursor-pointer"
                      style={{ height: gridHeight }}
                      onClick={(e) => handleGridClick(e, dayStr)}
                    >
                      {slotLines}
                      {isToday && nowLine}
                      <div className="absolute inset-0">
                        {positioned.map((p) => renderApptBlock(p, { showStaff: true, dayIndex: 0 }))}
                        {dragPreview && (
                          <div
                            className="absolute inset-x-1 rounded-md border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-30 flex items-start justify-center"
                            style={{ top: dragPreview.top, height: dragPreview.height }}
                          >
                            <span className="text-[10px] font-semibold text-primary bg-card/80 px-1 rounded">{dragPreview.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
            {weekdayShort.map((d, i) => (
              <div key={i} className="py-2 text-center text-xs font-medium text-muted-foreground">
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
                        style={{
                          background: a.status === "tamamlandi" ? "rgba(16,185,129,0.18)" : a.status === "gelmedi" ? "rgba(245,158,11,0.22)" : c.soft,
                          borderLeft: `2px solid ${c.solid}`,
                        }}
                      >
                        <span className="font-semibold" style={{ color: c.solid }}>
                          {a.status === "tamamlandi" && "✓ "}
                          {a.status === "gelmedi" && "⚠ "}
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
                      {t("moreCount", { count: more })}
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
                  {format(new Date(popover.appt.appointment_at), "d MMM HH:mm", { locale: dateFnsLocale })} · {popover.appt.duration_minutes}{t("minutesShort")}
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
                {statusLabel(popover.appt.status)}
              </span>
            </div>

            <div className="p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground px-1 pb-0.5">{t("quickUpdate")}</p>
              {(() => {
                const isStaffUser = userRole === "staff";
                const canQuickAct = !isStaffUser || popover.appt.staff_id === currentStaffId;
                const disabled = !!updatingId || !canQuickAct;
                return (
                  <>
                    {!canQuickAct && (
                      <p className="text-[10px] text-amber-600 px-1 pb-0.5">
                        {t("cannotChangeStatus")}
                      </p>
                    )}
                    {popover.appt.status !== "onaylandi" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "onaylandi")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {t("approve")}
                      </button>
                    )}

                    {popover.appt.status !== "tamamlandi" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "tamamlandi")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {t("markCompleted")}
                      </button>
                    )}

                    {popover.appt.status !== "gelmedi" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "gelmedi")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {t("noShow")}
                      </button>
                    )}

                    {popover.appt.status !== "iptal" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "iptal")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        {t("cancelAction")}
                      </button>
                    )}
                  </>
                );
              })()}

              <div className="border-t pt-1 mt-1">
                <Link
                  href={`/dashboard/randevular/${popover.appt.id}`}
                  onClick={() => setPopover(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("viewDetail")}
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

      {/* ─── Sürükle-bırak onay ekranı ─────────────────────── */}
      {/* rescheduleDisplay, dialog kapanırken (rescheduleConfirm null olunca)
          son değeri saklar — böylece kapanış animasyonu içerik aniden
          kaybolmadan oynar. */}
      <Dialog
        open={!!rescheduleConfirm}
        onOpenChange={(open) => { if (!open) setRescheduleConfirm(null); }}
      >
        {rescheduleDisplay && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("rescheduleConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("rescheduleConfirmDesc", {
                  customer: rescheduleDisplay.appt.customer_name,
                  date: format(rescheduleDisplay.newDate, "d MMMM yyyy", { locale: dateFnsLocale }),
                  time: format(rescheduleDisplay.newDate, "HH:mm"),
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("rescheduleDateLabel")}</label>
                <input
                  type="date"
                  value={format(rescheduleDisplay.newDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m, dd] = e.target.value.split("-").map(Number);
                    setRescheduleConfirm((prev) => {
                      if (!prev) return prev;
                      const nd = new Date(prev.newDate);
                      nd.setFullYear(y, m - 1, dd);
                      return { ...prev, newDate: nd };
                    });
                  }}
                  className="mt-1 w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("rescheduleTimeLabel")}</label>
                <input
                  type="time"
                  value={format(rescheduleDisplay.newDate, "HH:mm")}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [hh, mm] = e.target.value.split(":").map(Number);
                    setRescheduleConfirm((prev) => {
                      if (!prev) return prev;
                      const nd = new Date(prev.newDate);
                      nd.setHours(hh, mm, 0, 0);
                      return { ...prev, newDate: nd };
                    });
                  }}
                  className="mt-1 w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={updatingId === rescheduleDisplay.appt.id}
                onClick={() => setRescheduleConfirm(null)}
              >
                {t("rescheduleCancelButton")}
              </Button>
              <Button
                disabled={updatingId === rescheduleDisplay.appt.id}
                onClick={confirmReschedule}
              >
                {updatingId === rescheduleDisplay.appt.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : t("rescheduleConfirmButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
