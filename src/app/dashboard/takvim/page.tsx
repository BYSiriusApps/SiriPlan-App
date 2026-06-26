import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfWeek, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import type { Appointment, Staff } from "@/types/database";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20

const STATUS_COLORS: Record<string, string> = {
  talep: "bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-200",
  onaylandi: "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200",
  tamamlandi: "bg-green-100 border-green-300 text-green-900 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200",
  iptal: "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-400 opacity-60",
  gelmedi: "bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 opacity-70",
};

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  const baseDate = params.date ? new Date(params.date) : new Date();
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [{ data: appointments }, { data: staff }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, staff(id, full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .gte("appointment_at", weekStart.toISOString())
      .lte("appointment_at", addDays(weekStart, 7).toISOString())
      .neq("status", "iptal"),

    supabase
      .from("staff")
      .select("id, full_name")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  // Group appointments by staff and day
  const apptMap: Record<string, Record<string, (Appointment & { staff?: Staff; service?: { name: string } })[]>> = {};
  (appointments || []).forEach((a: Appointment & { staff?: { id: string; full_name: string }; service?: { name: string } }) => {
    const sid = a.staff_id;
    const day = format(new Date(a.appointment_at), "yyyy-MM-dd");
    if (!apptMap[sid]) apptMap[sid] = {};
    if (!apptMap[sid][day]) apptMap[sid][day] = [];
    apptMap[sid][day].push(a);
  });

  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="p-6 space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Takvim</h1>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/takvim?date=${prevWeek}`} className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm">
            ← Önceki
          </Link>
          <span className="text-sm font-medium">
            {format(weekStart, "d MMM", { locale: tr })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: tr })}
          </span>
          <Link href={`/dashboard/takvim?date=${nextWeek}`} className="px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors text-sm">
            Sonraki →
          </Link>
          <Link href="/dashboard/takvim" className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Bu Hafta
          </Link>
        </div>
      </div>

      {/* Calendar grid per staff */}
      {!staff || staff.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Personel eklenmemiş. <Link href="/dashboard/personel/yeni" className="text-primary underline">Personel ekle</Link>
          </CardContent>
        </Card>
      ) : (
        (staff as Staff[]).map((s) => (
          <Card key={s.id} className="border-0 shadow-sm overflow-hidden">
            <div className="border-b p-3 flex items-center gap-2 bg-muted/30">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {s.full_name[0]}
              </div>
              <span className="font-medium text-sm">{s.full_name}</span>
            </div>
            <CardContent className="p-0 overflow-x-auto">
              <div className="grid grid-cols-8 min-w-[700px]">
                {/* Hour labels */}
                <div className="border-r">
                  <div className="h-10 border-b" />
                  {HOURS.map((h) => (
                    <div key={h} className="h-14 border-b flex items-center justify-center text-xs text-muted-foreground">
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const dayAppts = apptMap[s.id]?.[dayStr] || [];
                  const isToday = dayStr === today;

                  return (
                    <div key={dayStr} className="border-r last:border-r-0">
                      <div className={cn("h-10 border-b flex items-center justify-center text-xs font-medium", isToday && "bg-primary/10 text-primary")}>
                        {format(day, "EEE d", { locale: tr })}
                      </div>
                      <div className="relative">
                        {HOURS.map((h) => (
                          <div key={h} className="h-14 border-b border-border/50" />
                        ))}
                        {/* Appointment blocks */}
                        {dayAppts.map((appt) => {
                          const apptDate = new Date(appt.appointment_at);
                          const startMin = apptDate.getHours() * 60 + apptDate.getMinutes();
                          const top = ((startMin - 8 * 60) / 60) * 56; // 56px per hour
                          const height = Math.max(28, (appt.duration_minutes / 60) * 56);

                          return (
                            <Link
                              key={appt.id}
                              href={`/dashboard/randevular/${appt.id}`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                              className={cn(
                                "absolute left-1 right-1 rounded px-1 py-0.5 border text-[10px] leading-tight overflow-hidden cursor-pointer hover:shadow transition-shadow",
                                STATUS_COLORS[appt.status]
                              )}
                            >
                              <p className="font-semibold truncate">{format(apptDate, "HH:mm")} {appt.customer_name}</p>
                              <p className="truncate opacity-75">{(appt as { service?: { name: string } }).service?.name}</p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
