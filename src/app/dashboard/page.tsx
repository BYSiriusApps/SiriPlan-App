import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import {
  TrendingUp, Calendar, Users, Star, Clock, AlertCircle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment, StaffPerformanceWeekly } from "@/types/database";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  talep:      { label: "Talep",      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  onaylandi:  { label: "Onaylandı",  className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  tamamlandi: { label: "Tamamlandı", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  iptal:      { label: "İptal",      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  gelmedi:    { label: "Gelmedi",    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/auth/kayit");
  const orgId = member.org_id;

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // Parallel fetches
  const [
    { data: todayAppts },
    { data: weekAppts },
    { data: monthRevAppts },
    { data: newCustomers },
    { data: champion },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, staff(full_name, avatar_url), service:services(name, duration_minutes)")
      .eq("org_id", orgId)
      .gte("appointment_at", todayStart)
      .lte("appointment_at", todayEnd)
      .neq("status", "iptal")
      .order("appointment_at"),

    supabase
      .from("appointments")
      .select("price, tip, status")
      .eq("org_id", orgId)
      .gte("appointment_at", weekStart)
      .lte("appointment_at", weekEnd)
      .neq("status", "iptal"),

    supabase
      .from("appointments")
      .select("price, tip, status")
      .eq("org_id", orgId)
      .gte("appointment_at", monthStart)
      .lte("appointment_at", monthEnd)
      .eq("status", "tamamlandi"),

    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", monthStart),

    supabase
      .from("staff_performance_weekly")
      .select("*, staff(full_name, avatar_url)")
      .eq("org_id", orgId)
      .eq("is_top", true)
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),
  ]);

  type ApptRow = { price: number; tip?: number; status: string };

  const todayRevenue = (todayAppts || [])
    .filter((a: ApptRow) => a.status === "tamamlandi")
    .reduce((s: number, a: ApptRow) => s + Number(a.price) + Number(a.tip || 0), 0);

  const weekRevenue = (weekAppts || [])
    .filter((a: ApptRow) => a.status === "tamamlandi")
    .reduce((s: number, a: ApptRow) => s + Number(a.price), 0);

  const monthRevenue = (monthRevAppts || [])
    .reduce((s: number, a: ApptRow) => s + Number(a.price), 0);

  const pendingAppts = (todayAppts || []).filter((a: ApptRow) => a.status === "talep").length;

  const stats = [
    {
      title: "Bugünkü Ciro",
      value: `₺${todayRevenue.toLocaleString("tr-TR")}`,
      icon: TrendingUp,
      description: `${(todayAppts || []).length} randevu bugün`,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: "Haftalık Ciro",
      value: `₺${weekRevenue.toLocaleString("tr-TR")}`,
      icon: Calendar,
      description: `${(weekAppts || []).length} randevu bu hafta`,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Aylık Ciro",
      value: `₺${monthRevenue.toLocaleString("tr-TR")}`,
      icon: TrendingUp,
      description: "Bu ay tamamlanan",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Yeni Müşteri",
      value: String((newCustomers as unknown as { count: number } | null)?.count || 0),
      icon: Users,
      description: "Bu ay kayıt olan",
      color: "text-primary",
      bg: "bg-rose-50 dark:bg-rose-900/20",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Genel Bakış</h1>
          <p className="text-muted-foreground text-sm">
            {format(now, "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
        </div>
        {pendingAppts > 0 && (
          <Badge className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">
            <AlertCircle className="h-3 w-3" />
            {pendingAppts} onay bekliyor
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                    <Icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Bugünkü Randevular</CardTitle>
                <Link href="/dashboard/randevular" className="text-xs text-primary hover:underline">
                  Tümünü gör →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!todayAppts || todayAppts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Bugün randevu yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(todayAppts as (Appointment & { staff?: { full_name: string; avatar_url?: string }; service?: { name: string; duration_minutes: number } })[]).map((appt) => (
                    <Link
                      key={appt.id}
                      href={`/dashboard/randevular/${appt.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className="text-center w-14 shrink-0">
                        <p className="text-sm font-semibold text-primary">
                          {format(new Date(appt.appointment_at), "HH:mm")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {appt.duration_minutes}dk
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{appt.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {appt.service?.name} • {appt.staff?.full_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">₺{Number(appt.price).toLocaleString("tr-TR")}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STATUS_LABELS[appt.status]?.className)}>
                          {STATUS_LABELS[appt.status]?.label}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Champion of the week */}
          {champion && (
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Haftanın Elemanı</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow">
                    <span className="text-white font-bold text-sm">
                      {(champion as StaffPerformanceWeekly & { staff?: { full_name: string } }).staff?.full_name?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{(champion as StaffPerformanceWeekly & { staff?: { full_name: string } }).staff?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(champion as StaffPerformanceWeekly).appointments_done} randevu • ₺{Number((champion as StaffPerformanceWeekly).total_revenue).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/dashboard/randevular?new=1", icon: CheckCircle2, label: "Randevu Ekle", color: "text-primary" },
                { href: "/dashboard/musteriler?new=1", icon: Users, label: "Müşteri Ekle", color: "text-blue-600" },
                { href: "/dashboard/takvim", icon: Clock, label: "Takvimi Gör", color: "text-purple-600" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <Icon className={cn("h-4 w-4", action.color)} />
                    <span className="text-sm font-medium">{action.label}</span>
                    <span className="ml-auto text-muted-foreground group-hover:text-foreground">→</span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
