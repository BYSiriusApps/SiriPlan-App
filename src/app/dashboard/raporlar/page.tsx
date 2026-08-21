import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfMonth, format, subMonths, startOfDay, endOfDay, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { TrendingUp, Users, Star, Download, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { HomeButton } from "@/components/dashboard/HomeButton";

export const dynamic = "force-dynamic";

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ gun?: string }>;
}) {
  const t = await getTranslations("dashboard");
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const orgId = member.org_id;
  const now = new Date();

  // ── Gün sonu özeti: geriye dönük tarih seçilebilir (?gun=yyyy-MM-dd) ──
  const dayParam = sp.gun && /^\d{4}-\d{2}-\d{2}$/.test(sp.gun) ? sp.gun : format(now, "yyyy-MM-dd");
  const reportDay = new Date(dayParam + "T12:00:00");
  const dayStart = startOfDay(reportDay).toISOString();
  const dayEnd = endOfDay(reportDay).toISOString();

  const [{ data: dayAppts }, { data: dayExpenses }, { count: dayNewCust }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, customer_name, appointment_at, status, price, tip, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
      .eq("org_id", orgId)
      .gte("appointment_at", dayStart)
      .lte("appointment_at", dayEnd)
      .order("appointment_at"),
    supabase
      .from("expenses")
      .select("type, amount")
      .eq("org_id", orgId)
      .eq("date", dayParam),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
  ]);

  type DayAppt = {
    id: string; customer_name: string; appointment_at: string; status: string;
    price: number; tip: number | null;
    staff?: { full_name: string } | null; service?: { name: string } | null;
  };
  const dAppts = (dayAppts ?? []) as unknown as DayAppt[];
  const dDone = dAppts.filter((a) => a.status === "tamamlandi");
  const dayRevenue = dDone.reduce((s, a) => s + Number(a.price) + Number(a.tip ?? 0), 0);
  const dayGider = (dayExpenses ?? []).filter((e) => e.type === "gider").reduce((s, e) => s + Number(e.amount), 0);
  const dayManuelGelir = (dayExpenses ?? []).filter((e) => e.type === "gelir").reduce((s, e) => s + Number(e.amount), 0);
  const prevDay = format(addDays(reportDay, -1), "yyyy-MM-dd");
  const nextDay = format(addDays(reportDay, 1), "yyyy-MM-dd");
  const isToday = dayParam === format(now, "yyyy-MM-dd");

  // Last 6 months stats
  const monthlyStats = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, i);
      const start = startOfMonth(d).toISOString();
      const end = endOfMonth(d).toISOString();
      return supabase
        .from("appointments")
        .select("price, tip, status")
        .eq("org_id", orgId)
        .gte("appointment_at", start)
        .lte("appointment_at", end)
        .neq("status", "iptal")
        .then(({ data }) => ({
          month: format(d, "MMM yyyy", { locale: tr }),
          revenue: (data || []).filter((a) => a.status === "tamamlandi").reduce((s, a) => s + Number(a.price) + Number(a.tip || 0), 0),
          total: (data || []).length,
          completed: (data || []).filter((a) => a.status === "tamamlandi").length,
        }));
    })
  );

  const [{ data: topServices }, { data: topStaff }, { data: noShowData }] = await Promise.all([
    supabase
      .from("appointments")
      .select("service_id, services(name), price, status")
      .eq("org_id", orgId)
      .eq("status", "tamamlandi")
      .gte("appointment_at", startOfMonth(now).toISOString()),

    supabase
      .from("appointments")
      .select("staff_id, staff:staff!appointments_staff_id_fkey(full_name), price, status")
      .eq("org_id", orgId)
      .eq("status", "tamamlandi")
      .gte("appointment_at", startOfMonth(now).toISOString()),

    supabase
      .from("appointments")
      .select("status")
      .eq("org_id", orgId)
      .gte("appointment_at", startOfMonth(now).toISOString()),
  ]);

  // Aggregate top services
  const serviceMap: Record<string, { name: string; revenue: number; count: number }> = {};
  (topServices || []).forEach((a) => {
    const name = (a as unknown as { services?: { name: string } }).services?.name || "Bilinmiyor";
    const sid = a.service_id;
    if (!serviceMap[sid]) serviceMap[sid] = { name, revenue: 0, count: 0 };
    serviceMap[sid].revenue += Number(a.price);
    serviceMap[sid].count++;
  });
  const topServicesArr = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Aggregate top staff
  const staffMap: Record<string, { name: string; revenue: number; count: number }> = {};
  (topStaff || []).forEach((a) => {
    const name = (a as unknown as { staff?: { full_name: string } }).staff?.full_name || "Bilinmiyor";
    const sid = a.staff_id;
    if (!staffMap[sid]) staffMap[sid] = { name, revenue: 0, count: 0 };
    staffMap[sid].revenue += Number(a.price);
    staffMap[sid].count++;
  });
  const topStaffArr = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // No-show rate
  const total = (noShowData || []).length;
  const noshows = (noShowData || []).filter((a) => a.status === "gelmedi").length;
  const noShowRate = total > 0 ? ((noshows / total) * 100).toFixed(1) : "0";

  const currentMonthRevenue = monthlyStats[0].revenue;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("reportsPage.eyebrow")}</span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("reports")}</h1>
            <p className="text-muted-foreground text-sm">{t("reportsPage.subtitle")}</p>
          </div>
          <HomeButton />
        </div>
        <a
          href={`/api/export?format=pdf&gun=${dayParam}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          {t("reportsPage.daySummaryPdf")}
        </a>
      </div>

      {/* ── GÜN SONU ÖZETİ — tarih seçilebilir (geçmiş günler dahil) ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              {t("reportsPage.daySummary")}
              <span className="text-sm font-normal text-muted-foreground capitalize">
                — {format(reportDay, "d MMMM yyyy, EEEE", { locale: tr })}{isToday ? " (bugün)" : ""}
              </span>
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/dashboard/raporlar?gun=${prevDay}`}
                className="p-2 rounded-lg border hover:bg-accent transition-colors"
                aria-label="Önceki gün"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              {/* Native date input GET formu — JS gerektirmez, geçmiş tarih seçilebilir */}
              <form method="GET" action="/dashboard/raporlar">
                <input
                  key={dayParam}
                  type="date"
                  name="gun"
                  defaultValue={dayParam}
                  max={format(now, "yyyy-MM-dd")}
                  className="px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                />
                <button type="submit" className="ml-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-accent transition-colors">
                  Getir
                </button>
              </form>
              <Link
                href={`/dashboard/raporlar?gun=${nextDay}`}
                className="p-2 rounded-lg border hover:bg-accent transition-colors"
                aria-label="Sonraki gün"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Günlük KPI'lar */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Randevu", value: String(dAppts.length) },
              { label: "Tamamlanan", value: String(dDone.length) },
              { label: t("reportsPage.dayRevenue"), value: `₺${(dayRevenue + dayManuelGelir).toLocaleString("tr-TR")}` },
              { label: "Gün Gideri", value: `₺${dayGider.toLocaleString("tr-TR")}` },
              { label: "Yeni Müşteri", value: String(dayNewCust ?? 0) },
            ].map((kpi) => (
              <div key={kpi.label} className="kpi-tile p-3 text-center">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold mt-0.5 tabular-nums tracking-tight">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Günün randevu dökümü */}
          {dAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">Bu günde randevu kaydı yok</p>
          ) : (
            <div className="space-y-1">
              <div className="hidden md:grid grid-cols-[64px_1fr_1fr_120px_90px] gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                <span>Saat</span>
                <span>Müşteri</span>
                <span>{t("reportsPage.serviceStaff")}</span>
                <span>Durum</span>
                <span className="text-right">Tutar</span>
              </div>
              {dAppts.map((a) => {
                const STATUS_TR: Record<string, { label: string; cls: string }> = {
                  talep: { label: "Bekliyor", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
                  onaylandi: { label: "Onaylı", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
                  tamamlandi: { label: "Tamamlandı", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
                  iptal: { label: "İptal", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
                  gelmedi: { label: "Gelmedi", cls: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
                };
                const st = STATUS_TR[a.status] ?? { label: a.status, cls: "bg-muted text-muted-foreground" };
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/randevular/${a.id}`}
                    className="data-row grid grid-cols-[1fr_auto] md:grid-cols-[64px_1fr_1fr_120px_90px] items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  >
                    <div className="md:contents">
                      <span className="hidden md:block text-sm font-semibold tabular-nums">
                        {format(new Date(a.appointment_at), "HH:mm")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          <span className="md:hidden font-semibold tabular-nums mr-1.5">{format(new Date(a.appointment_at), "HH:mm")}</span>
                          {a.customer_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate md:hidden">
                          {a.service?.name}{a.staff?.full_name ? ` · ${a.staff.full_name}` : ""}
                        </p>
                      </div>
                      <span className="hidden md:block text-xs text-muted-foreground truncate">
                        {a.service?.name}{a.staff?.full_name ? ` · ${a.staff.full_name}` : ""}
                      </span>
                      <span className={`hidden md:inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`md:hidden px-2 py-0.5 rounded-full text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                      <span className="text-sm font-semibold text-right tabular-nums">
                        ₺{Number(a.price).toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly revenue bars */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Aylık Ciro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...monthlyStats].reverse().map((m) => {
              const maxRevenue = Math.max(...monthlyStats.map((s) => s.revenue));
              const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground capitalize">{m.month}</span>
                  <div className="flex-1 h-7 rounded-lg bg-muted/60 overflow-hidden ring-1 ring-border/50">
                    <div
                      className="h-full rounded-lg transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, var(--primary), color-mix(in oklch, var(--accent) 65%, var(--primary)))",
                        boxShadow: pct > 0 ? "0 0 14px color-mix(in oklch, var(--primary) 45%, transparent)" : undefined,
                      }}
                    />
                  </div>
                  <span className="w-28 text-xs font-semibold text-right tabular-nums">₺{m.revenue.toLocaleString("tr-TR")}</span>
                  <span className="w-16 text-xs text-muted-foreground text-right tabular-nums">{m.completed}/{m.total}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top services */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              {t("reportsPage.topServices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServicesArr.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Veri yok</p>
            ) : (
              <div className="space-y-1">
                {topServicesArr.map((s, i) => (
                  <div key={s.name} className="data-row flex items-center gap-3 px-2 py-2 rounded-lg">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: i === 0 ? "color-mix(in oklch, var(--accent) 35%, transparent)" : "color-mix(in oklch, var(--primary) 12%, transparent)",
                        color: i === 0 ? "var(--brand-plum)" : "var(--primary)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} randevu</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">₺{s.revenue.toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top staff */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t("reportsPage.topStaff")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStaffArr.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Veri yok</p>
            ) : (
              <div className="space-y-1">
                {topStaffArr.map((s, i) => (
                  <div key={s.name} className="data-row flex items-center gap-3 px-2 py-2 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-accent/40 flex items-center justify-center font-bold text-primary text-sm shrink-0 ring-1 ring-primary/15">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} tamamlanan randevu</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">₺{s.revenue.toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Bu Ay Ciro", value: `₺${currentMonthRevenue.toLocaleString("tr-TR")}` },
          { label: t("reportsPage.noShowRate"), value: `%${noShowRate}` },
          { label: "Tamamlanma Oranı", value: total > 0 ? `%${((monthlyStats[0].completed / total) * 100).toFixed(0)}` : "-" },
          { label: "Toplam İşlem", value: String(total) },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-tile p-4 text-center">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
