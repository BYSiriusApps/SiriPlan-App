import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  format, startOfWeek, endOfWeek, addDays, addMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
} from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { UnifiedCalendar, type CalendarView } from "@/components/dashboard/UnifiedCalendar";
import { TakvimHeader } from "@/components/dashboard/TakvimHeader";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const view: CalendarView = ["day", "week", "month"].includes(params.view ?? "")
    ? (params.view as CalendarView)
    : "week";
  const baseDate = params.date ? new Date(params.date + "T12:00:00") : new Date();

  // Görünüme göre görünür gün aralığı + gezinme hedefleri
  let gridStart: Date;
  let gridEnd: Date;
  let label: string;
  let prevDate: Date;
  let nextDate: Date;

  if (view === "day") {
    gridStart = baseDate;
    gridEnd = baseDate;
    label = format(baseDate, "d MMMM yyyy, EEEE", { locale: tr });
    prevDate = addDays(baseDate, -1);
    nextDate = addDays(baseDate, 1);
  } else if (view === "month") {
    const mStart = startOfMonth(baseDate);
    const mEnd = endOfMonth(baseDate);
    gridStart = startOfWeek(mStart, { weekStartsOn: 1 });
    gridEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
    label = format(baseDate, "MMMM yyyy", { locale: tr });
    prevDate = addMonths(baseDate, -1);
    nextDate = addMonths(baseDate, 1);
  } else {
    gridStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    gridEnd = addDays(gridStart, 6);
    label = `${format(gridStart, "d MMM", { locale: tr })} – ${format(gridEnd, "d MMM yyyy", { locale: tr })}`;
    prevDate = addDays(gridStart, -7);
    nextDate = addDays(gridStart, 7);
  }

  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

  // Sorgu penceresi: zaman dilimi kaymalarını kaçırmamak için ±1 gün tampon.
  // Gün bazında gruplama istemcide YEREL saate göre yapılır.
  const queryStart = addDays(gridStart, -1);
  const queryEnd = addDays(gridEnd, 2);

  const [{ data: appointments }, { data: staff }, { data: services }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, status, customer_name, customer_phone, appointment_at, duration_minutes, staff_id, service:services(name)")
      .eq("org_id", member.org_id)
      .gte("appointment_at", queryStart.toISOString())
      .lt("appointment_at", queryEnd.toISOString())
      .neq("status", "iptal")
      .order("appointment_at"),

    // select("*"): color kolonu migration'a bağlı — yıldız seçimi kolon
    // henüz yokken de çalışır (varsa gelir, yoksa undefined kalır).
    supabase
      .from("staff")
      .select("*")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order"),

    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  const today = format(new Date(), "yyyy-MM-dd");

  // Personel rolündeki kullanıcı yalnızca kendi randevularını görür/filtreler
  const lockedStaffId = member.role === "staff" ? member.staff_id : null;

  return (
    <div className="p-6 space-y-4">
      <TakvimHeader
        orgId={member.org_id}
        staff={(staff ?? []).map((s) => ({
          id: s.id,
          full_name: s.full_name,
          avatar_url: (s as { avatar_url?: string | null }).avatar_url ?? null,
          role: (s as { role?: string }).role,
        }))}
        services={(services ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
        }))}
        today={today}
      />

      {!staff || staff.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Personel eklenmemiş.{" "}
            <Link href="/dashboard/personel/yeni" className="text-primary underline">Personel ekle</Link>
          </CardContent>
        </Card>
      ) : (
        <UnifiedCalendar
          view={view}
          label={label}
          viewDate={format(baseDate, "yyyy-MM-dd")}
          prevDate={format(prevDate, "yyyy-MM-dd")}
          nextDate={format(nextDate, "yyyy-MM-dd")}
          gridDays={gridDays}
          today={today}
          hours={HOURS}
          orgId={member.org_id}
          lockedStaffId={lockedStaffId}
          staff={staff.map((s) => ({
            id: s.id,
            full_name: s.full_name,
            color: (s as { color?: string | null }).color ?? null,
          }))}
          appointments={(appointments || []).map((a) => ({
            id: a.id,
            status: a.status,
            customer_name: a.customer_name,
            appointment_at: a.appointment_at,
            duration_minutes: a.duration_minutes,
            staff_id: a.staff_id,
            service: (a as unknown as { service?: { name: string } | null }).service ?? null,
          }))}
        />
      )}
    </div>
  );
}
