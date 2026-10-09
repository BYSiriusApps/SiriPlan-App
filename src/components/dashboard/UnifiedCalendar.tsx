"use client";

import { useState, useTransition, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr, enUS, ru, ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  X, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink,
  ChevronLeft, ChevronRight, Users, CalendarDays, Phone, Plus,
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
import { isTerminalStatus } from "@/lib/appointment-status";
import { ContactLinks } from "./ContactLinks";
import { completeAppointmentRequest } from "@/lib/complete-appointment-client";

export type CalendarView = "day" | "staff" | "week" | "month";

const DATE_FNS_LOCALES = { tr, en: enUS, ru, ar } as const;
// Sabit referans hafta (Pzt→Paz) — ay görünümü başlığındaki gün kısaltmalarını
// aktif dile göre üretmek için kullanılır, yeni çeviri key'i gerektirmez.
const WEEKDAY_REF_DATES = [
  "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04",
  "2024-01-05", "2024-01-06", "2024-01-07",
];

// Personel renk paleti — 7 renkli tema, her personel dizindeki sırasına göre
// rengini alır (7'den fazla personelde döngüsel tekrar eder).
const STAFF_COLORS = [
  { solid: "#7C3AED", soft: "rgba(124,58,237,0.28)", border: "rgba(124,58,237,0.75)" },   // violet
  { solid: "#BE185D", soft: "rgba(190,24,93,0.28)", border: "rgba(190,24,93,0.75)" },     // berry
  { solid: "#0D9488", soft: "rgba(13,148,136,0.28)", border: "rgba(13,148,136,0.75)" },   // teal
  { solid: "#0284C7", soft: "rgba(2,132,199,0.28)", border: "rgba(2,132,199,0.75)" },     // sky
  { solid: "#D97706", soft: "rgba(217,119,6,0.30)", border: "rgba(217,119,6,0.78)" },    // amber
  { solid: "#059669", soft: "rgba(5,150,105,0.28)", border: "rgba(5,150,105,0.75)" },     // emerald
  { solid: "#4F46E5", soft: "rgba(79,70,229,0.28)", border: "rgba(79,70,229,0.75)" },     // indigo
];

interface Appointment {
  id: string;
  status: string;
  customer_name: string;
  customer_id?: string | null;
  customer_phone?: string | null;
  appointment_at: string;
  duration_minutes: number;
  staff_id: string;
  price?: number | null;
  service?: { name: string } | null;
}

interface Staff {
  id: string;
  full_name: string;
  /** Salon sahibinin atadığı kalıcı renk (hex). Boşsa palet sırası kullanılır. */
  color?: string | null;
  /** İşletmenin kendi belirlediği serbest metin grup etiketi (ör. "Makyöz", "Grup 1"). Kalabalık personel listesini takvimde hızlı filtrelemek için. */
  group_label?: string | null;
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
  // Aynı şeritteki bir sonraki randevunun (kenetlenmiş) başlangıç dakikası —
  // minimum kutu yüksekliği bunun üstüne taşıp görsel olarak çakışıyormuş gibi
  // görünmesin diye.
  capMinutes: number | null;
}

// Aynı gün içinde çakışan randevuları yan yana şeritlere yerleştirir.
// Şerit ataması gerçek randevu saatleri yerine EKRANDA GÖRÜNEN (grid saatlerine
// kenetlenmiş, en az minVisualMin yükseklikte) aralığa göre yapılır — aksi halde
// grid dışında kalan (ör. hatalı/gece yarısı verisi) veya çok kısa randevular
// aynı pikselde üst üste yığılıp okunaksız hale gelir, halbuki lanes hesabı
// bunları "çakışmıyor" sanıp tek şeride koyabilirdi.
function layoutDay(appts: Appointment[], gridStartMin: number, gridEndMin: number, minVisualMin: number): Positioned[] {
  const minOfDay = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };
  const sorted = [...appts].sort((a, b) => minOfDay(a.appointment_at) - minOfDay(b.appointment_at));
  const laneEnds: number[] = [];
  const placed: { appt: Appointment; lane: number; start: number; end: number }[] = [];

  for (const appt of sorted) {
    const rawStart = minOfDay(appt.appointment_at);
    const rawEnd = rawStart + appt.duration_minutes;
    const start = Math.max(rawStart, gridStartMin);
    const end = Math.max(start + minVisualMin, Math.min(rawEnd, gridEndMin));
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placed.push({ appt, lane, start, end });
  }

  // Kutular ekranda (apptBlockStyle) kendi saat satırının sonuna ya da aynı
  // şeritteki sonraki randevuya kadar uzatılarak çizilir; şerit sayısı da bu
  // GÖRSEL aralığa göre, birbirine değen kutular tek küme sayılarak hesaplanır —
  // aksi halde aynı kümedeki kutular farklı genişlikte olup üst üste biner.
  const withNext = placed.map((p) => {
    const nextInLane = placed
      .filter((q) => q.lane === p.lane && q.start > p.start)
      .sort((a, b) => a.start - b.start)[0];
    const rowEnd = (Math.floor(p.start / 60) + 1) * 60;
    const vEnd = Math.min(gridEndMin, Math.max(p.end, Math.min(nextInLane ? nextInLane.start : Infinity, rowEnd)));
    return { ...p, vEnd, nextStart: nextInLane ? nextInLane.start : null };
  });
  const comp = withNext.map((_, i) => i);
  const find = (i: number): number => (comp[i] === i ? i : (comp[i] = find(comp[i])));
  for (let i = 0; i < withNext.length; i++) {
    for (let j = i + 1; j < withNext.length; j++) {
      if (withNext[i].start < withNext[j].vEnd && withNext[i].vEnd > withNext[j].start) comp[find(i)] = find(j);
    }
  }
  const lanesOfComp = new Map<number, number>();
  withNext.forEach((p, i) => {
    const r = find(i);
    lanesOfComp.set(r, Math.max(lanesOfComp.get(r) ?? 0, p.lane + 1));
  });
  return withNext.map((p, i) => ({
    appt: p.appt, lane: p.lane, lanes: lanesOfComp.get(find(i)) ?? 1, capMinutes: p.nextStart,
  }));
}

export function UnifiedCalendar({
  view, label, viewDate, prevDate, nextDate, gridDays, today,
  hours, orgId, staff, appointments, timeOff, lockedStaffId, slotMinutes,
  userRole, currentStaffId,
}: Props) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  // Saat satırları excel tablosu gibi kompakt: gün/personel görünümü tek
  // sütun/az sütun olduğu için biraz daha yüksek, hafta görünümü 7 sütun
  // aynı anda göründüğü için daha da sıkı. Önceki değerler (112/64) satırları
  // gereksiz yere şişiriyor, gereksiz kaydırma yaratıyordu.
  // Telefonda (dar ekran) gün/personel görünümü saat satırı daha alçak: 10-12
  // saatlik mesai kaydırmadan tek ekrana sığsın. Geniş ekranda eski değer.
  const [narrow, setNarrow] = useState(false);
  // Son bakılan görünümü hatırla (gün/hafta/personel/ay) — takvim sayfası ?view= yoksa çerezden okur.
  useEffect(() => {
    try {
      document.cookie = `sp_cal_view=${view}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      /* çerez yazılamazsa sessizce geç */
    }
  }, [view]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // ── Excel tablosu gibi "otomatik satır yüksekliği" ──
  // Her saat satırı boşken kompakt (BASE_PX), o saatteki randevuların metni
  // sığmıyorsa satır DİKEY büyür (aşağıdaki layout effect kutuların gerçek
  // içerik yüksekliğini ölçüp satırları hesaplar). Randevu konumu/tıklama/
  // sürükleme hesapları yOfMin/minOfY ile bu değişken yüksekliklere göre yapılır.
  const BASE_PX = narrow ? 30 : view === "day" || view === "staff" ? 56 : 44;
  const MAX_ROW_PX = 180;
  const gridStartMin = hours[0] * 60;
  const gridEndMin = (hours[hours.length - 1] + 1) * 60;
  const [fit, setFit] = useState<number[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [, setSizeTick] = useState(0);
  const rows = useMemo(
    () => (fit && fit.length === hours.length ? fit : hours.map(() => BASE_PX)),
    [fit, hours, BASE_PX]
  );
  const rowTops = useMemo(() => {
    const tops: number[] = [];
    let acc = 0;
    for (const h of rows) { tops.push(acc); acc += h; }
    return tops;
  }, [rows]);
  const gridHeight = rows.reduce((a, b) => a + b, 0);
  function yOfMin(min: number) {
    const rel = (min - gridStartMin) / 60;
    if (rel <= 0) return 0;
    if (rel >= rows.length) return gridHeight;
    const i = Math.floor(rel);
    return rowTops[i] + (rel - i) * rows[i];
  }
  function minOfY(y: number) {
    if (y <= 0) return gridStartMin;
    for (let i = 0; i < rows.length; i++) {
      if (y < rowTops[i] + rows[i]) return gridStartMin + i * 60 + ((y - rowTops[i]) / rows[i]) * 60;
    }
    return gridEndMin;
  }
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
  // Popover'ı ölçülen boyutuna göre ekran içine sıkıştır — telefonda alt
  // kısmı (durum düğmeleri) ekran dışında kalıyordu.
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // "Hücre Detayı" kartı — son tıklanan randevu, popover kapansa bile takvimin
  // altında görünmeye devam eder (excel-tablosu mockup'ındaki kalıcı detay kartı).
  // Salt görsel/bilgilendirici: mevcut popover'ın hiçbir davranışını değiştirmez,
  // aynı tıklama olayına ek olarak ayrıca bu state'i de günceller.
  const [lastSelected, setLastSelected] = useState<Appointment | null>(null);
  // Hafta görünümünün altındaki gün-bazlı randevu listesinde tek seferde bir
  // günün açık olması (akordeon) — mobilde 7 günün tamamı aynı anda dökülmesin.
  const [expandedAgendaDay, setExpandedAgendaDay] = useState<string | null>(null);
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

  // Kalabalık personel listesini (ör. 20 kişi) hızlı daraltmak için —
  // işletmenin personel sayfasında kendi belirlediği serbest metin grup
  // etiketleri (ör. "Makyöz", "Grup 1"). Yalnızca en az 2 farklı etiket
  // fiilen kullanılıyorsa gösterilir, aksi halde tek personel çipleri yeterli.
  const staffGroups = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((s) => {
      const g = s.group_label?.trim();
      if (g) set.add(g);
    });
    return Array.from(set);
  }, [staff]);

  function selectGroup(group: string) {
    const ids = staff.filter((s) => s.group_label?.trim() === group).map((s) => s.id);
    setSelectedStaffIds(ids);
  }

  // Seçili küme tam olarak bir grubun personeline denk düşüyorsa o grup
  // çipini aktif göster (elle tek tek seçimden ayırt etmek için).
  const activeGroup = useMemo(() => {
    if (isAllStaff) return null;
    const currentKey = [...selectedStaffIds].sort().join(",");
    return (
      staffGroups.find((g) => {
        const groupKey = staff
          .filter((s) => s.group_label?.trim() === g)
          .map((s) => s.id)
          .sort()
          .join(",");
        return groupKey === currentKey;
      }) ?? null
    );
  }, [staffGroups, staff, selectedStaffIds, isAllStaff]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorOf = useMemo(() => {
    const map = new Map<string, (typeof STAFF_COLORS)[number]>();
    staff.forEach((s, i) => {
      // DB'de özel renk atanmışsa onu kullan; yoksa palet sırası
      if (s.color && /^#[0-9a-fA-F]{6}$/.test(s.color)) {
        map.set(s.id, {
          solid: s.color,
          soft: hexToRgba(s.color, 0.28),
          border: hexToRgba(s.color, 0.75),
        });
      } else {
        map.set(s.id, STAFF_COLORS[i % STAFF_COLORS.length]);
      }
    });
    return (id: string) => map.get(id) ?? STAFF_COLORS[0];
  }, [staff]);

  // Personel sütununun tamamına verilen çok soluk renk zemini — randevu
  // bloklarının önde kalması için düşük opaklık.
  const columnTintOf = (id: string) => hexToRgba(colorOf(id).solid, 0.11);

  const staffName = useMemo(() => {
    const map = new Map(staff.map((s) => [s.id, s.full_name]));
    return (id: string) => map.get(id) ?? "";
  }, [staff]);

  // Avatar rozetlerinde kullanılan kısa baş harfler (ör. "Selin Üstün" → "SÜ")
  function initials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toLocaleUpperCase(locale) ?? "")
      .join("");
  }

  // Personel filtre çiplerinde gösterilen "o günkü randevu sayısı" — seçili
  // personel filtresinden BAĞIMSIZ, görünen tarih aralığındaki (gridDays)
  // ham randevu sayısı.
  const gridDaysJoined = gridDays.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gridDaysSet = useMemo(() => new Set(gridDays), [gridDaysJoined]);
  function apptCountOnGrid(staffId: string) {
    let n = 0;
    for (const a of appointments) {
      if (a.staff_id !== staffId) continue;
      if (gridDaysSet.has(format(new Date(a.appointment_at), "yyyy-MM-dd"))) n++;
    }
    return n;
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, dayStr: string, staffIdOverride?: string) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const minutesFromStart = Math.floor(minOfY(clickY) - gridStartMin);
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

  // Ay görünümünde seçili gün — hücreler artık randevu metnini değil sadece
  // renkli nokta göstergesi taşır; seçilen günün randevuları takvimin ALTINDA
  // ayrı bir listede gösterilir (mobil uygulama tasarımıyla aynı desen).
  // Ay değiştirildiğinde (gridDays farklı bir ay olur) seçim, görünürdeyse
  // bugüne, değilse ayın görünen ilk gününe düşer.
  const gridDaysKey = gridDays.join(",");
  const [selectedMonthDay, setSelectedMonthDay] = useState<string>(() =>
    gridDays.includes(today) ? today : (gridDays[0] ?? today)
  );
  useEffect(() => {
    setSelectedMonthDay((prev) =>
      gridDays.includes(prev) ? prev : gridDays.includes(today) ? today : (gridDays[0] ?? today)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridDaysKey]);
  useEffect(() => {
    setExpandedAgendaDay(gridDays.includes(today) ? today : (gridDays[0] ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridDaysKey]);

  async function updateStatus(apptId: string, newStatus: string) {
    setUpdatingId(apptId);
    try {
      // "Tamamlandı" için /complete uç noktası kullanılır — düz PATCH yalnızca
      // status kolonunu değiştirir; müşteri istatistikleri (ziyaret/ciro),
      // sadakat damgası ve paket seansı düşümü atlanmış olurdu.
      const res =
        newStatus === "tamamlandi"
          ? await completeAppointmentRequest(apptId)
          : await fetch(`/api/appointments/${apptId}`, {
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

  // Popover açıldığında / içerik değiştiğinde ölçüp ekran içine sıkıştır.
  // (Konum belirlenene kadar kutu `visibility:hidden` — sıçrama görünmez.)
  useEffect(() => {
    if (!popover) { setPopoverPos(null); return; }
    const el = popoverRef.current;
    if (!el || typeof window === "undefined") return;
    const margin = 8;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = popover.x;
    let top = popover.y;
    // Sağa sığmıyorsa randevu bloğunun soluna al, yine de kenara kenetle.
    if (left + width > vw - margin) left = popover.x - width - 16;
    if (left < margin) left = margin;
    if (left + width > vw - margin) left = Math.max(margin, vw - width - margin);
    if (top + height > vh - margin) top = vh - height - margin;
    if (top < margin) top = margin;
    setPopoverPos({ left, top });
  }, [popover]);

  function openPopover(e: React.MouseEvent, appt: Appointment) {
    e.preventDefault();
    e.stopPropagation();
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverPos(null); // yeni konum ölçülene kadar gizle — eski yerde belirmesin
    setPopover({ appt, x: rect.right + 8, y: rect.top });
    setLastSelected(appt);
  }

  // layoutDay için: grid'in görünen saat aralığı + minimum kutu yüksekliğinin
  // dakika karşılığı (bkz. apptBlockStyle'daki aynı minimum).
  // Çok kısa (ör. 5 dk) randevular bile en az bu kadar dakikalık yer kaplar —
  // satır yüksekliği bu aralığa göre metne yetecek şekilde büyütülür.
  const minVisualMin = 15;

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
  // Kapanış animasyonu sırasında da içerik görünsün diye son değer state'te
  // tutulur — render sırasında koşullu setState, React'in "adjust state
  // while rendering" deseni (bkz. react.dev/learn/you-might-not-need-an-effect).
  const [rescheduleDisplay, setRescheduleDisplay] = useState<{ appt: Appointment; origAt: string; newDate: Date } | null>(null);
  if (rescheduleConfirm && rescheduleConfirm !== rescheduleDisplay) {
    setRescheduleDisplay(rescheduleConfirm);
  }
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

      const origDate = new Date(cur.origAt);
      const origMin = origDate.getHours() * 60 + origDate.getMinutes();
      const rawMinDelta = minOfY(yOfMin(origMin) + dy) - origMin;
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
      const top = Math.min(yOfMin(previewMin), gridHeight - 24);
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

  // Kutuların gerçek (sarılmış) içerik yüksekliğini ölçüp satırları büyütür.
  // Ölçüm satır yüksekliğinden BAĞIMSIZ (yalnızca genişliğe bağlı; metin asla
  // kırpılmıyor) olduğu için tek geçişte oturur, döngüye girmez.
  useLayoutEffect(() => {
    if (view === "month" || dragRef.current?.dragging) return;
    const root = rootRef.current;
    if (!root) return;
    const n = hours.length;
    const cons = Array.from(root.querySelectorAll<HTMLElement>("[data-fit]")).map((el) => ({
      s: Number(el.dataset.s),
      e: Number(el.dataset.e),
      need: ((el.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0) + 8,
    }));
    const next: number[] = hours.map(() => BASE_PX);
    for (let iter = 0; iter < 8; iter++) {
      let changed = false;
      for (const c of cons) {
        let span = 0;
        let fsum = 0;
        const parts: number[] = [];
        for (let i = 0; i < n; i++) {
          const rs = gridStartMin + i * 60;
          const ov = Math.max(0, Math.min(c.e, rs + 60) - Math.max(c.s, rs));
          if (ov > 0) { span += (ov / 60) * next[i]; fsum += ov / 60; parts.push(i); }
        }
        if (fsum > 0 && span + 0.5 < c.need) {
          const d = (c.need - span) / fsum;
          for (const i of parts) next[i] = Math.min(MAX_ROW_PX, next[i] + d);
          changed = true;
        }
      }
      if (!changed) break;
    }
    const rounded = next.map((v) => Math.ceil(v));
    const same = fit && fit.length === rounded.length && fit.every((v, i) => v === rounded[i]);
    if (!same && !(fit === null && rounded.every((v) => v === BASE_PX))) setFit(rounded);
  });

  // Genişlik değişince (döndürme/yeniden boyutlama) ve yazı tipleri yüklenince
  // metin farklı sarılır → yeniden ölç.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let lastW = root.clientWidth;
    const ro = new ResizeObserver(() => {
      if (root.clientWidth !== lastW) { lastW = root.clientWidth; setSizeTick((x) => x + 1); }
    });
    ro.observe(root);
    document.fonts?.ready.then(() => setSizeTick((x) => x + 1)).catch(() => {});
    return () => ro.disconnect();
  }, []);

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

  // Görünen aralığın tahmini cirosu — iptal edilenler zaten appointments
  // sorgusuna hiç gelmiyor (bkz. takvim/page.tsx .neq("status","iptal")),
  // "gelmedi" de dahil edilmez (gerçekleşmemiş ciro).
  const periodRevenue = useMemo(() => {
    let total = 0;
    for (const a of visibleAppointments) {
      if (a.status === "gelmedi") continue;
      if (a.price != null) total += Number(a.price);
    }
    return total;
  }, [visibleAppointments]);

  // Görünen aralık için tahmini doluluk % — gerçek verilerden hesaplanır
  // (uydurma bir sayı değil): kapasite = kapalı olmayan her gün × izinli
  // olmayan her personel × açık saat sayısı × 60dk; doluluk = iptal/gelmedi
  // dışındaki randevuların toplam süresi. Personel izni/işletme kapalı günü
  // hesaba katıldığı için gerçekçi bir üst sınır verir.
  const periodCapacityMinutes = useMemo(() => {
    let total = 0;
    for (const dayStr of gridDays) {
      if (orgClosedOn(dayStr)) continue;
      for (const s of staffColumns) {
        if (staffOffOn(dayStr, s.id)) continue;
        total += hours.length * 60;
      }
    }
    return total;
  }, [gridDays, staffColumns, hours, orgClosedOn, staffOffOn]);
  const periodOccupiedMinutes = useMemo(() => {
    let total = 0;
    for (const a of visibleAppointments) {
      if (a.status === "gelmedi") continue;
      // Doluluk %'nin paydası (periodCapacityMinutes) yalnızca gridDays'i
      // kapsıyor — pay da aynı güne ait olmalı, aksi halde appointments
      // prop'unun (bkz. sayfa sorgusu) görünenden geniş tarih aralığı
      // taşıması oranı yapay şekilde şişirir.
      if (!gridDaysSet.has(format(new Date(a.appointment_at), "yyyy-MM-dd"))) continue;
      total += a.duration_minutes;
    }
    return total;
  }, [visibleAppointments, gridDaysSet]);
  const occupancyPct = periodCapacityMinutes > 0
    ? Math.min(100, Math.round((periodOccupiedMinutes / periodCapacityMinutes) * 100))
    : 0;

  // Kırmızı "şu an" çizgisi (bugün görünürken)
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = yOfMin(nowMin);
  const nowVisible = nowMin >= gridStartMin && nowMin <= gridEndMin;
  const nowLine = nowVisible ? (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
      <div className="flex items-center">
        <span className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
        <div className="flex-1 h-[2px] bg-red-500/80" />
      </div>
    </div>
  ) : null;

  function apptBlockStyle(appt: Appointment, capMinutes: number | null) {
    const d = new Date(appt.appointment_at);
    const startMin = d.getHours() * 60 + d.getMinutes();
    // layoutDay ile aynı kenetleme: grid dışı randevular gizlenmesin
    const sMin = Math.min(Math.max(startMin, gridStartMin), gridEndMin - minVisualMin);
    const nominalEnd = Math.max(sMin + minVisualMin, Math.min(startMin + appt.duration_minutes, gridEndMin));
    // Excel hücresi gibi: kısa randevu kendi saat satırının sonuna kadar (ya da
    // aynı şeritteki sonraki randevuya kadar) uzayabilir — böylece metin için
    // gereken yükseklik satırı gereğinden fazla şişirmez. Gerçek süreden uzun
    // çizilen kısmı yalnızca görsel; randevu saati/süresi değişmez.
    const rowEnd = (Math.floor(sMin / 60) + 1) * 60;
    const eMin = Math.min(gridEndMin, Math.max(nominalEnd, Math.min(capMinutes ?? Infinity, rowEnd)));
    const top = yOfMin(sMin);
    const height = Math.max(20, yOfMin(eMin) - top - 2);
    return { top, height, sMin, eMin };
  }

  function renderApptBlock(p: Positioned, opts?: { showStaff?: boolean; dayIndex?: number; compact?: boolean }) {
    const { appt, lane, lanes, capMinutes } = p;
    const c = colorOf(appt.staff_id);
    const { top, height, sMin, eMin } = apptBlockStyle(appt, capMinutes);
    const width = 100 / lanes;
    const done = appt.status === "tamamlandi";
    const noShow = appt.status === "gelmedi";
    const pending = appt.status === "talep";
    const live = isLive(appt);
    const beingDragged = dragPreview?.apptId === appt.id;

    return (
      <button
        key={appt.id}
        data-fit=""
        data-s={sMin}
        data-e={eMin}
        onClick={(e) => openPopover(e, appt)}
        onPointerDown={(e) => onApptPointerDown(e, appt, opts?.dayIndex ?? 0)}
        onPointerMove={(e) => onApptPointerMove(e, appt, height)}
        onPointerUp={(e) => onApptPointerUp(e, appt)}
        onPointerCancel={() => { dragRef.current = null; setDragPreview(null); }}
        style={{
          top, height,
          left: `calc(${lane * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
          background: done ? "rgba(16,185,129,0.32)" : noShow ? "rgba(245,158,11,0.36)" : c.soft,
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
          view === "day" ? "px-2 py-1 text-[12.5px] leading-snug" : "px-1 py-px text-[11px] leading-tight",
          pending && "border-dashed"
        )}
      >
        {/* İç sarmalayıcı: kutu sabit yükseklikte/overflow-hidden olsa da bu div
            metnin DOĞAL yüksekliğini taşır — satır yüksekliği hesabı bunu ölçer.
            Metin hiçbir zaman kırpılmaz (truncate yok), sarılır. Kutu rengi
            personelin rengini taşır; yazılar okunabilirlik için koyu/siyah. */}
        <div className="block">
          {opts?.compact ? (
            <>
              <div className="flex items-baseline gap-1 min-w-0 font-bold text-foreground">
                {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0 self-center" />}
                {done && <span className="shrink-0">✓</span>}
                {noShow && <span className="shrink-0">⚠</span>}
                <span className="shrink-0 tabular-nums">{format(new Date(appt.appointment_at), "HH:mm")}</span>
              </div>
              <p className="font-bold text-foreground break-words">{appt.service?.name}</p>
              <p className="text-[10px] text-foreground/70 font-semibold break-words">{appt.customer_name}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-foreground break-words">
                {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1 align-middle" />}
                {done && <span className="mr-0.5">✓</span>}
                {noShow && <span className="mr-0.5">⚠</span>}
                {format(new Date(appt.appointment_at), "HH:mm")} {appt.customer_name}
              </p>
              <p className="font-bold text-foreground break-words">
                {live ? `● ${t("liveNow")} · ` : ""}
                {appt.service?.name}
                {appt.duration_minutes ? ` · ${appt.duration_minutes}${t("minutesShort")}` : ""}
                {opts?.showStaff && staffName(appt.staff_id) && (
                  <span> · <span style={{ color: c.solid }}>{staffName(appt.staff_id)}</span></span>
                )}
              </p>
            </>
          )}
        </div>
      </button>
    );
  }

  // ─── Gün ajandası: seçili günün randevuları müşteri bazlı, iletişim
  // bilgisi ve randevu detaylarıyla (hizmet, tutar, telefon, personel) ───
  // day/staff/month görünümlerinin ALTINDA ortak kullanılır. Bugünse
  // "en yakın randevudan itibaren" sıralanır: henüz geçmemiş randevular
  // saate göre artan, ardından geçmiş randevular.
  function renderDayAgenda(dayStr: string) {
    const dayAppts = (byDay[dayStr] || [])
      .slice()
      .sort((a, b) => a.appointment_at.localeCompare(b.appointment_at));
    const isTodayDay = dayStr === today;
    const ordered = isTodayDay
      ? [
          ...dayAppts.filter((a) => new Date(a.appointment_at).getTime() + a.duration_minutes * 60_000 >= now.getTime()),
          ...dayAppts.filter((a) => new Date(a.appointment_at).getTime() + a.duration_minutes * 60_000 < now.getTime()),
        ]
      : dayAppts;

    if (ordered.length === 0) {
      return <p className="px-4 py-6 text-sm text-muted-foreground text-center">{t("monthDayEmpty")}</p>;
    }

    return (
      <div className="divide-y divide-border/50">
        {ordered.map((a) => {
          const c = colorOf(a.staff_id);
          const past = isTodayDay && new Date(a.appointment_at).getTime() + a.duration_minutes * 60_000 < now.getTime();
          return (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={(e) => openPopover(e, a)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openPopover(e as unknown as React.MouseEvent, a); }}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-3 hover:bg-accent/40 transition-colors cursor-pointer",
                past && "opacity-55"
              )}
            >
              <div className="flex flex-col items-center justify-center w-12 shrink-0">
                <span className="text-sm font-bold tabular-nums" style={{ color: c.solid }}>
                  {format(new Date(a.appointment_at), "HH:mm")}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">{a.duration_minutes}{t("minutesShort")}</span>
              </div>
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: c.solid, color: "#fff" }}
              >
                {initials(a.customer_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {a.customer_id ? (
                    <Link
                      href={`/dashboard/musteriler/${a.customer_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-sm truncate hover:underline"
                    >
                      {a.customer_name}
                    </Link>
                  ) : (
                    <span className="font-bold text-sm truncate">{a.customer_name}</span>
                  )}
                  {a.status === "tamamlandi" && <span className="text-xs shrink-0">✓</span>}
                  {a.status === "gelmedi" && <span className="text-xs shrink-0">⚠</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate font-bold">
                  {a.service?.name}
                  {staffName(a.staff_id) ? ` · ${staffName(a.staff_id)}` : ""}
                  {a.price != null ? ` · ₺${Number(a.price).toLocaleString("tr-TR")}` : ""}
                </p>
                {a.customer_phone && (
                  <p className="text-[11px] text-muted-foreground truncate font-bold">{a.customer_phone}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border"
                  style={{ background: c.soft, borderColor: c.border, color: c.solid }}
                >
                  {statusLabel(a.status)}
                </span>
                {a.customer_phone && <ContactLinks phone={a.customer_phone} size="md" />}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Hafta/personel görünümünde yatay kaydırmada saat sütunu ekranda sabit
  // kalır (excel tablosu gibi "dondurulmuş sütun") — kaydırırken hangi saate
  // baktığını kaybetmemek için.
  const hourRail = (
    <div className={cn("border-r bg-muted/20", (view === "week" || view === "staff") && "sticky left-0 z-20 shadow-[2px_0_6px_-1px_rgba(0,0,0,0.08)]")}>
      <div className={cn("border-b bg-muted/20 flex items-center justify-center text-[9px] font-bold text-muted-foreground tracking-wide", view === "staff" ? "h-14" : "h-10")}>
        {(view === "week" || view === "staff") && "SAAT"}
      </div>
      {hours.map((h, hi) => (
        <div
          key={h}
          className={cn(
            "border-b flex items-start justify-center pt-0.5 text-muted-foreground bg-muted/20 font-mono font-bold",
            view === "day" || view === "staff" ? "text-[10.5px] sm:text-xs pt-1 sm:pt-1.5" : "text-[10px]"
          )}
          style={{ height: rows[hi] }}
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
      {hours.map((h, hi) => (
        <div key={h} className="border-b border-border/60 relative" style={{ height: rows[hi] }}>
          {/* Boş hücrelerde excel tablosu hissi veren "+" ipucu — salt görsel,
              tıklama zaten üst kapsayıcının onClick'i ile çalışıyor. */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground/20">
            <Plus className="h-3 w-3" />
          </span>
          {Array.from({ length: divisionsPerHour - 1 }, (_, i) => (
            <div
              key={i}
              style={{ height: rows[hi] / divisionsPerHour }}
              // Yarım saat çizgisi (i.e. saat başından 30dk sonrası) biraz daha belirgin
              className={cn("border-b", (i + 1) * slotMinutes === 30 ? "border-border/25" : "border-border/15")}
            />
          ))}
        </div>
      ))}
    </>
  );

  // Görünen aralığın toplam randevu + tahmini ciro + tahmini doluluk özeti —
  // salt bilgilendirici, hiçbir aksiyon tetiklemez. Başlık görünüme göre
  // değişir (mockup'taki "Haftalık Kapasite & Ciro Barı" hafta görünümünde
  // birebir aynı metinle görünür).
  const capacityTitle =
    view === "week" ? t("weeklyCapacityTitle")
    : view === "day" ? t("dailyCapacityTitle")
    : view === "staff" ? t("staffCapacityTitle")
    : t("monthlyCapacityTitle");
  const periodSummaryBar = (
    <div className="rounded-2xl bg-gradient-to-r from-foreground to-primary/80 text-background p-3.5 shadow-md space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-background/80">{capacityTitle}</span>
        <span className="text-[11px] font-bold text-background/80">{t("occupancyLabel")}: %{occupancyPct}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-background/60 text-[10px] block">{t("apptCountLabel", { count: visibleAppointments.length })}</span>
          <span className="font-extrabold text-lg">{visibleAppointments.length}</span>
        </div>
        <div className="text-right">
          <span className="text-background/60 text-[10px] block">Tahmini Ciro</span>
          <span className="text-background font-extrabold text-lg font-mono">₺{periodRevenue.toLocaleString("tr-TR")}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-background/20 overflow-hidden">
        <div className="h-full rounded-full bg-background/70" style={{ width: `${occupancyPct}%` }} />
      </div>
    </div>
  );

  // "Hücre Detayı" — son tıklanan randevunun takvimin altında kalıcı özeti
  // (mockup'taki bottom card). Randevu blokları/ajanda satırları üzerindeki
  // mevcut tıklama davranışı (popover açma) DEĞİŞMEDİ, bu kart yalnızca ek
  // bir görsel yansıma.
  const cellDetailCard = lastSelected ? (
    <div className="rounded-xl border bg-card shadow-sm p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide truncate"
          style={{ color: colorOf(lastSelected.staff_id).solid }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorOf(lastSelected.staff_id).solid }} />
          {t("cellDetailLabel")} · {format(new Date(lastSelected.appointment_at), "EEEE HH:mm", { locale: dateFnsLocale })}
        </span>
        {lastSelected.price != null && (
          <span className="text-sm font-extrabold font-mono shrink-0" style={{ color: colorOf(lastSelected.staff_id).solid }}>
            ₺{Number(lastSelected.price).toLocaleString("tr-TR")}
          </span>
        )}
      </div>
      <div>
        <p className="font-bold text-sm truncate">{lastSelected.customer_name}</p>
        <p className="text-xs text-muted-foreground truncate font-bold">
          {lastSelected.service?.name}
          {lastSelected.duration_minutes ? ` · ${lastSelected.duration_minutes}${t("minutesShort")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: colorOf(lastSelected.staff_id).solid, color: "#fff" }}
        >
          {initials(staffName(lastSelected.staff_id))}
        </span>
        <span className="text-xs font-bold truncate">{staffName(lastSelected.staff_id)}</span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        {lastSelected.customer_phone ? (
          <a
            href={`tel:${lastSelected.customer_phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold hover:bg-accent transition-colors"
          >
            <Phone className="h-3.5 w-3.5" /> {t("callCustomer")}
          </a>
        ) : <span className="flex-1" />}
        <Link
          href={`/dashboard/randevular/${lastSelected.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {t("viewDetail")}
        </Link>
      </div>
    </div>
  ) : null;

  // Hafta görünümü: her gün sütununun genişliği yan yana şerit (çakışan randevu)
  // sayısına göre açılır — şerit başına en az ~88px, böylece metin harf harf
  // kırılmaz; dar ekranda Excel gibi yatay kaydırma zaten var.
  const weekPositioned = view === "week"
    ? gridDays.map((d) => layoutDay(byDay[d] || [], gridStartMin, gridEndMin, minVisualMin))
    : [];
  const weekColTemplate = weekPositioned
    .map((pos) => `minmax(${Math.max(104, Math.max(1, ...pos.map((q) => q.lanes)) * 88)}px, 1fr)`)
    .join(" ");

  return (
    <div ref={rootRef} className="space-y-3">
      {/* Kontrol çubuğu: görünüm + gezinme + personel filtresi */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-center sm:justify-start">
          <div className="flex items-center gap-1 rounded-full bg-muted/70 p-1 shadow-inner">
            {([["day", t("day")], ["staff", "👥 Personel"], ["week", t("week")], ["month", t("month")]] as const).map(([v, l]) => (
              <Link
                key={v}
                href={`/dashboard/takvim?view=${v}&date=${viewDate}`}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95",
                  view === v ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                )}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 bg-card rounded-xl px-2.5 py-2 shadow-sm border border-border/60">
          <Link
            href={`/dashboard/takvim?view=${view}&date=${prevDate}`}
            className="p-2 rounded-full hover:bg-accent transition-colors active:scale-90 shrink-0"
            aria-label={t("previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-bold flex-1 text-center capitalize truncate px-1">{label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/dashboard/takvim?view=${view}&date=${today}`}
              className="px-3 py-1.5 rounded-full border hover:bg-accent transition-colors text-xs font-bold active:scale-95"
            >
              {t("today")}
            </Link>
            <Link
              href={`/dashboard/takvim?view=${view}&date=${nextDate}`}
              className="p-2 rounded-full hover:bg-accent transition-colors active:scale-90"
              aria-label={t("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Durum özeti — görünen aralıktaki randevu durumları */}
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
        {statusCounts.devam > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
            {statusCounts.devam} {t("inProgress")}
          </span>
        )}
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          {statusCounts.talep} {t("awaiting")}
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-300 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          {statusCounts.onaylandi} {t("approved")}
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          {statusCounts.tamamlandi} {t("completedChip")}
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
                  className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-bold shadow-sm"
                  style={{ background: c.soft, border: `1px solid ${c.border}`, color: c.solid }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: c.solid, color: "#fff" }}
                  >
                    {initials(s.full_name)}
                  </span>
                  {s.full_name} ({t("yourAppointments")})
                </span>
              );
            })
        ) : (
          <>
            <button
              onClick={() => setSelectedStaffIds([])}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95",
                isAllStaff
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "hover:bg-accent text-muted-foreground"
              )}
            >
              {t("all")} ({staff.length})
            </button>
            {staff.map((s) => {
              const c = colorOf(s.id);
              const active = selectedStaffIds.includes(s.id);
              const count = apptCountOnGrid(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 shrink-0"
                  style={{
                    background: active ? c.soft : "transparent",
                    borderColor: active ? c.border : "var(--border)",
                    color: active ? c.solid : "var(--muted-foreground)",
                    boxShadow: active ? "0 1px 3px 0 rgba(15,23,42,0.08)" : undefined,
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: c.solid, color: "#fff" }}
                  >
                    {initials(s.full_name)}
                  </span>
                  <span className="font-bold truncate max-w-[92px]">{s.full_name}</span>
                  {count > 0 && (
                    <span
                      className="px-1.5 py-0 rounded-full text-[10px] font-bold leading-[16px]"
                      style={{ background: active ? "rgba(255,255,255,0.35)" : c.soft, color: active ? c.solid : c.solid }}
                    >
                      {count}
                    </span>
                  )}
                  {active && <span className="opacity-70">✓</span>}
                </button>
              );
            })}
            {!isAllStaff && (
              <span className="text-[11px] text-muted-foreground font-bold">
                {selectedStaffIds.length}/{staff.length}
              </span>
            )}
          </>
        )}
      </div>

      {/* Grup filtre çipleri — kalabalık personel listesinde (ör. 20 kişi)
          "Makyöz"/"Kuaför" gibi işletmenin kendi tanımladığı gruplar arasında
          tek tıkla geçiş. Personel rolü zaten kendine kilitli olduğu için
          gösterilmez. */}
      {!lockedStaffId && staffGroups.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          <span className="text-[11px] text-muted-foreground shrink-0 font-bold">{t("groupsLabel")}</span>
          {staffGroups.map((g) => {
            const active = activeGroup === g;
            return (
              <button
                key={g}
                onClick={() => selectGroup(g)}
                aria-pressed={active}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "hover:bg-accent text-muted-foreground border-border"
                )}
              >
                {g}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── HAFTA GÖRÜNÜMÜ ─────────────────────────────────── */}
      {view === "week" && (
        <>
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/60 text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {t("excelGridHint")}
            </span>
            <span className="font-bold">↔ {t("scrollRight")}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `48px ${weekColTemplate}` }}>
              {hourRail}
              {gridDays.map((dayStr, dayIndex) => {
                const dayAppts = byDay[dayStr] || [];
                const positioned = weekPositioned[dayIndex];
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
                        "h-10 border-b flex flex-col items-center justify-center text-xs font-bold hover:bg-accent transition-colors",
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
                        {positioned.map((p) => renderApptBlock(p, { showStaff: !lockedStaffId && selectedStaffIds.length !== 1, dayIndex, compact: true }))}
                        {dragPreview && dragPreview.dayIndex === dayIndex && (
                          <div
                            className="absolute inset-x-1 rounded-md border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-30 flex items-start justify-center"
                            style={{ top: dragPreview.top, height: dragPreview.height }}
                          >
                            <span className="text-[10px] font-bold text-primary bg-card/80 px-1 rounded">{dragPreview.label}</span>
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

          {cellDetailCard}

          {/* ─── Gün bazlı randevu listesi (Pzt/Sal/Çar...) — akordeon ───
              Her gün başlığına tıklayınca o günün müşteri bazlı randevu
              listesi (renderDayAgenda) açılır/kapanır. */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-3.5 py-2.5 border-b">
              <p className="text-sm font-bold">{t("dailyAgendaTitle")}</p>
            </div>
            <div className="divide-y divide-border/60">
              {gridDays.map((dayStr) => {
                const dayAppts = byDay[dayStr] || [];
                const isOpen = expandedAgendaDay === dayStr;
                const isToday = dayStr === today;
                return (
                  <div key={dayStr}>
                    <button
                      type="button"
                      onClick={() => setExpandedAgendaDay(isOpen ? null : dayStr)}
                      aria-expanded={isOpen}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-accent/40 transition-colors",
                        isToday && "bg-primary/5"
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={cn("text-sm font-bold capitalize truncate", isToday && "text-primary")}>
                          {format(new Date(dayStr + "T12:00:00"), "EEEE d MMMM", { locale: dateFnsLocale })}
                        </span>
                        {dayAppts.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold text-muted-foreground shrink-0">
                            {dayAppts.length}
                          </span>
                        )}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-90")} />
                    </button>
                    {isOpen && renderDayAgenda(dayStr)}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── PERSONEL SÜTUN GÖRÜNÜMÜ (SWIMLANE) ───────────────────
          Tüm personel aynı anda, tek ekranda, eşit genişlikte sütunlarda
          gösterilir — sayfalama/tıklanan ok yok, işletme sahibi ekranda
          yeterli genişlik olduğunda hiç kaydırmaz (excel tablosu gibi
          sütunlar daralarak sığar). Sütun sayısı ekrana gerçekten sığmayacak
          kadar çoksa (ör. dar telefon ekranında çok personelli salon) her
          sütun okunaklı bir minimum genişliğin altına inmez, bu durumda
          doğal yatay kaydırma devreye girer — zorla sayfalama yerine. */}
      {view === "staff" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
          {/* Sütun genişliği clamp() ile daralır: dar telefon ekranında en az
              5 personel yatay kaydırma olmadan tek ekrana sığar, geniş
              ekranda ise 130px'e kadar rahatça açılır. */}
          <div className="grid" style={{ gridTemplateColumns: `34px repeat(${staffColumns.length || 1}, minmax(clamp(48px, 16vw, 130px), 1fr))` }}>
            {hourRail}
            {staffColumns.map((s) => {
              const c = colorOf(s.id);
              const dayStr = gridDays[0] || today;
              const staffAppts = (byDay[dayStr] || []).filter((a) => a.staff_id === s.id);
              const positioned = layoutDay(staffAppts, gridStartMin, gridEndMin, minVisualMin);
              const isToday = dayStr === today;
              const offNames = offStaffNamesOn(dayStr);
              const isOff = offNames.includes(s.full_name);

              return (
                <div
                  key={s.id}
                  className="border-r last:border-r-0 min-w-0 relative"
                  style={{ background: columnTintOf(s.id) }}
                >
                  <div
                    className="h-14 border-b flex flex-col items-center justify-center gap-0.5 px-0.5 text-center"
                    style={{ background: c.soft, borderBottomColor: c.border }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: c.solid, color: "#fff" }}
                    >
                      {initials(s.full_name)}
                    </span>
                    <span className="truncate max-w-full text-[10.5px] font-bold leading-tight" style={{ color: c.solid }}>{s.full_name}</span>
                    <span className="text-[9px] font-bold text-muted-foreground leading-none">
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
                      {positioned.map((p) => renderApptBlock(p, { showStaff: false, compact: true }))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {view === "staff" && cellDetailCard}

      {/* ─── Gün ajandası (Personel görünümü altı) — müşteri bazlı, iletişim
          bilgisiyle, en yakın randevudan itibaren sıralı ───────────────── */}
      {view === "staff" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between">
            <p className="text-sm font-bold">
              {t("apptCountLabel", { count: (byDay[gridDays[0] || today] || []).length })}
            </p>
          </div>
          {renderDayAgenda(gridDays[0] || today)}
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
              const positioned = layoutDay(dayAppts, gridStartMin, gridEndMin, minVisualMin);
              const isToday = dayStr === today;
              const closed = orgClosedOn(dayStr);
              const offNames = offStaffNamesOn(dayStr);

              return (
                <div className="grid sm:min-w-[420px]" style={{ gridTemplateColumns: "48px minmax(0, 1fr)" }}>
                  {hourRail}
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "h-10 border-b flex items-center justify-center gap-2 text-xs font-bold",
                        isToday && "bg-primary/10 text-primary",
                        closed && "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      <span className="capitalize">
                        {format(new Date(dayStr + "T12:00:00"), "d MMMM EEEE", { locale: dateFnsLocale })}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
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
                            <span className="text-[10px] font-bold text-primary bg-card/80 px-1 rounded">{dragPreview.label}</span>
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

      {view === "day" && cellDetailCard}

      {/* ─── Gün ajandası (Gün görünümü altı) — müşteri bazlı, iletişim
          bilgisiyle, en yakın randevudan itibaren sıralı ───────────────── */}
      {view === "day" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between">
            <p className="text-sm font-bold">
              {t("apptCountLabel", { count: (byDay[gridDays[0]] || []).length })}
            </p>
          </div>
          {renderDayAgenda(gridDays[0])}
        </div>
      )}

      {/* ─── AY GÖRÜNÜMÜ ──────────────────────────────────────
          Hücreler artık randevu metni taşımaz (küçük hücrelerde saat/isim
          üst üste biniyordu) — sadece gün numarası + personel renginde
          nokta göstergesi. Seçili günün randevuları takvimin ALTINDA ayrı
          bir listede gösterilir (mobil uygulamadaki takvim ekranıyla aynı
          desen): müşteri adı müşteri kartına, satırın geneli randevu
          detayına (hizmet/personel/durum) götürür. */}
      {view === "month" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekdayShort.map((d, i) => (
              <div key={i} className="py-2 text-center text-xs font-bold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gridDays.map((dayStr) => {
              const dayAppts = byDay[dayStr] || [];
              const isToday = dayStr === today;
              const isSelected = dayStr === selectedMonthDay;
              const inMonth = dayStr.slice(0, 7) === viewDate.slice(0, 7);
              const dots: (typeof STAFF_COLORS)[number][] = [];
              const seenStaff = new Set<string>();
              for (const a of dayAppts) {
                if (seenStaff.has(a.staff_id)) continue;
                seenStaff.add(a.staff_id);
                dots.push(colorOf(a.staff_id));
                if (dots.length >= 4) break;
              }
              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => setSelectedMonthDay(dayStr)}
                  className={cn(
                    "min-h-[64px] border-b border-r last:border-r-0 p-1.5 flex flex-col items-center gap-1 hover:bg-accent/40 transition-colors",
                    !inMonth && "bg-muted/20 opacity-50",
                    isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                      isToday && "bg-primary text-primary-foreground font-bold",
                      !isToday && isSelected && "font-bold text-primary"
                    )}
                  >
                    {Number(dayStr.slice(8, 10))}
                  </span>
                  {dots.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      {dots.map((c, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c.solid }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Seçili günün randevu listesi — müşteri bazlı, iletişim
              bilgisiyle, en yakın randevudan itibaren sıralı (bkz. renderDayAgenda) */}
          <div className="border-t bg-muted/10">
            <p className="px-3.5 pt-3 pb-1 text-sm font-bold capitalize">
              {format(new Date(selectedMonthDay + "T12:00:00"), "d MMMM", { locale: dateFnsLocale })}
              {" — "}
              {t("apptCountLabel", { count: (byDay[selectedMonthDay] || []).length })}
            </p>
            {renderDayAgenda(selectedMonthDay)}
          </div>
        </div>
      )}

      {periodSummaryBar}

      {/* ─── Durum Popover ──────────────────────────────────── */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            ref={popoverRef}
            className="fixed z-50 w-56 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-xl shadow-2xl"
            style={{
              left: popoverPos ? popoverPos.left : popover.x,
              top: popoverPos ? popoverPos.top : popover.y,
              visibility: popoverPos ? "visible" : "hidden",
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="px-3 py-2.5 border-b flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{popover.appt.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate font-bold">
                  {popover.appt.service?.name}
                  {staffName(popover.appt.staff_id) ? ` · ${staffName(popover.appt.staff_id)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground font-bold">
                  {format(new Date(popover.appt.appointment_at), "d MMM HH:mm", { locale: dateFnsLocale })} · {popover.appt.duration_minutes}{t("minutesShort")}
                </p>
              </div>
              <button onClick={() => setPopover(null)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-3 py-2 border-b">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
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
              <p className="text-[10px] text-muted-foreground px-1 pb-0.5 font-bold">{t("quickUpdate")}</p>
              {(() => {
                const isStaffUser = userRole === "staff";
                const canQuickAct = !isStaffUser || popover.appt.staff_id === currentStaffId;
                // Kapanmış (tamamlandı/iptal/gelmedi) bir randevuyu geriye dönük
                // değiştirmek sahte işlem görüntüsü riski taşır — personele değil,
                // yalnızca owner/manager'a açık.
                const canChangeStatus = canQuickAct && (!isTerminalStatus(popover.appt.status) || !isStaffUser);
                const disabled = !!updatingId || !canChangeStatus;
                return (
                  <>
                    {!canQuickAct && (
                      <p className="text-[10px] text-amber-600 px-1 pb-0.5">
                        {t("cannotChangeStatus")}
                      </p>
                    )}
                    {canQuickAct && !canChangeStatus && (
                      <p className="text-[10px] text-amber-600 px-1 pb-0.5">
                        {t("cannotReopenStatus")}
                      </p>
                    )}
                    {popover.appt.status !== "onaylandi" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "onaylandi")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {t("approve")}
                      </button>
                    )}

                    {popover.appt.status !== "tamamlandi" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "tamamlandi")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {t("markCompleted")}
                      </button>
                    )}

                    {popover.appt.status !== "gelmedi" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "gelmedi")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {updatingId === popover.appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {t("noShow")}
                      </button>
                    )}

                    {popover.appt.status !== "iptal" && (
                      <button
                        onClick={() => updateStatus(popover.appt.id, "iptal")}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
