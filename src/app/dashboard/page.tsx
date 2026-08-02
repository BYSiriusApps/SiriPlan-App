import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import {
  format,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subDays, differenceInCalendarDays,
} from "date-fns";
import { tr, enUS, ru, ar } from "date-fns/locale";
import {
  Calendar, MessageCircle, Megaphone, Star, ChevronRight, Plus,
} from "lucide-react";
import type { Appointment, StaffPerformanceWeekly } from "@/types/database";
import Link from "next/link";
import { LiveClock } from "@/components/ui/LiveClock";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { getUserShortcuts } from "@/app/actions/shortcuts";
import { getDashboardWidgetPrefs } from "@/app/actions/dashboard-widgets";
import { DashboardWidgetGrid, type DashboardWidget } from "@/components/dashboard/DashboardWidgetGrid";
import { getTranslations, getLocale } from "next-intl/server";

const DATE_FNS_LOCALES = { tr, en: enUS, ru, ar } as const;

/* ─── Mini sparkline SVG — rengi aktif organizasyon temasından (currentColor) alır ─── */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 260, H = 64;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 6) - 3}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible text-primary" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dsg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#dsg)" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={H - (data[data.length - 1] / max) * (H - 6) - 3} r="3.5" fill="currentColor" />
    </svg>
  );
}

/* ─── Kart başlığı — mevcut .panel-header / token sistemiyle uyumlu ─── */
function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="panel-header">
      <span className="text-[13px] font-bold tracking-wider uppercase text-primary">
        {children}
      </span>
      {right}
    </div>
  );
}

/* Router önbelleği bayat veri göstermesin — rakamlar her girişte güncel gelsin */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ─── Sayfa ─── */
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const dateFnsLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? tr;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");
  const orgId = member.org_id;
  const orgName = (member as { org_id: string; organizations?: { name?: string } }).organizations?.name ?? t("homePage.yourBusiness");

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();
  const day7Start = startOfDay(subDays(now, 6)).toISOString();

  const [
    { data: todayAppts },
    { data: nextAppts },
    { data: weekAppts },
    { data: newCustomers },
    { data: champion },
    { data: last7 },
    { data: pendingRequests },
    { data: latestCampaign },
    userShortcuts,
    dashboardWidgetPrefs,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name, duration_minutes)")
      .eq("org_id", orgId)
      .gte("appointment_at", todayStart)
      .lte("appointment_at", todayEnd)
      .neq("status", "iptal")
      .order("appointment_at"),

    // Yaklaşan randevular: bugünle sınırlı değil — şu andan itibaren
    // en yakın tarih/saate göre sıralı ilk 5 (bekleyen + onaylı)
    supabase
      .from("appointments")
      .select("id, customer_name, appointment_at, status, duration_minutes, service:services(name)")
      .eq("org_id", orgId)
      .gte("appointment_at", now.toISOString())
      .in("status", ["talep", "onaylandi"])
      .order("appointment_at", { ascending: true })
      .limit(5),

    supabase
      .from("appointments")
      .select("price, tip, status")
      .eq("org_id", orgId)
      .gte("appointment_at", weekStart)
      .lte("appointment_at", weekEnd)
      .neq("status", "iptal"),

    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", monthStart),

    supabase
      .from("staff_performance_weekly")
      .select("*, staff(full_name)")
      .eq("org_id", orgId)
      .eq("is_top", true)
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("appointments")
      .select("appointment_at, price")
      .eq("org_id", orgId)
      .gte("appointment_at", day7Start)
      .lte("appointment_at", todayEnd)
      .eq("status", "tamamlandi"),

    supabase
      .from("appointment_requests")
      .select("id, customer_name, appointment_at, status, created_at")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3),

    supabase
      .from("campaigns")
      .select("id, name, status, sent_count, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    getUserShortcuts(),
    getDashboardWidgetPrefs(),
  ]);

  type FullAppt = Appointment & {
    staff?: { full_name: string };
    service?: { name: string; duration_minutes: number };
  };
  const appts = (todayAppts ?? []) as FullAppt[];

  /* Durum sayıları */
  const isLive = (a: { status: string; appointment_at: string; duration_minutes: number }) => {
    if (a.status !== "onaylandi") return false;
    const s = new Date(a.appointment_at).getTime();
    return now.getTime() >= s && now.getTime() < s + a.duration_minutes * 60_000;
  };
  const liveCount = appts.filter(isLive).length;
  const pendingCount = appts.filter((a) => a.status === "talep").length;
  const doneCount = appts.filter((a) => a.status === "tamamlandi").length;

  /* Sıradaki randevular: şu andan itibaren en yakın tarih/saat sırasıyla.
     Ayrıca şu an devam eden bugünkü randevu varsa listenin başına al. */
  type NextAppt = {
    id: string; customer_name: string; appointment_at: string;
    status: string; duration_minutes: number; service?: { name: string } | null;
  };
  const liveNow = appts.filter(isLive).map((a) => ({
    id: a.id, customer_name: a.customer_name, appointment_at: a.appointment_at,
    status: a.status, duration_minutes: a.duration_minutes,
    service: a.service ? { name: a.service.name } : null,
  }));
  const futureList = ((nextAppts ?? []) as unknown as NextAppt[]).filter(
    (a) => !liveNow.some((l) => l.id === a.id)
  );
  const upcoming: NextAppt[] = [...liveNow, ...futureList].slice(0, 5);

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const diff = differenceInCalendarDays(d, now);
    if (diff === 0) return "";
    if (diff === 1) return `${t("homePage.tomorrow")} `;
    return `${format(d, "d MMM", { locale: dateFnsLocale })} `;
  };

  /* Haftalık doluluk (verimlilik): tamamlanan / toplam */
  const weekRows = (weekAppts ?? []) as { price: number; status: string }[];
  const weekDone = weekRows.filter((a) => a.status === "tamamlandi").length;
  const efficiency = weekRows.length ? Math.round((weekDone / weekRows.length) * 100) : 0;
  const newCustCount = (newCustomers as unknown as { count: number } | null)?.count ?? 0;

  /* Son 7 gün ciro grafiği */
  const dailyRev: number[] = Array(7).fill(0);
  ((last7 ?? []) as { appointment_at: string; price: number }[]).forEach((a) => {
    const diff = differenceInCalendarDays(new Date(a.appointment_at), subDays(now, 6));
    if (diff >= 0 && diff < 7) dailyRev[diff] += Number(a.price);
  });

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ?? "";

  const champ = champion as (StaffPerformanceWeekly & { staff?: { full_name: string } }) | null;
  const camp = latestCampaign as { id: string; name: string; status: string; sent_count: number } | null;
  const CAMP_STATUS: Record<string, string> = {
    draft: t("homePage.campStatus.draft"),
    scheduled: t("homePage.campStatus.scheduled"),
    sending: t("homePage.campStatus.sending"),
    sent: t("homePage.campStatus.sent"),
    failed: t("homePage.campStatus.failed"),
  };

  const widgets: DashboardWidget[] = [
    {
      key: "quick_actions",
      label: "Hızlı İşlemler",
      colSpanClass: "lg:col-span-4",
      node: <QuickActionsPanel key="quick_actions" initialShortcuts={userShortcuts} orgId={orgId} />,
    },
    {
      key: "revenue_summary",
      label: "Ciro Özeti",
      colSpanClass: "lg:col-span-8",
      node: (
        <GlassCard3D key="revenue_summary" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <span className="text-[11px] text-muted-foreground capitalize">
                {format(now, "MMM yyyy", { locale: dateFnsLocale })}
              </span>
            }
          >
            {t("homePage.campaignStatus")}
          </CardTitle>
          <div className="px-4 py-3.5">
            <Sparkline data={dailyRev} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-bold text-primary">
                {t("homePage.efficiencyLabel", { value: efficiency })}
              </span>
              <span className="text-sm font-bold text-foreground">
                {t("homePage.newCustomersLabel", { count: newCustCount })}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {t("homePage.chartCaption")}
            </p>
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "active_appointments",
      label: "Aktif Randevular",
      colSpanClass: "lg:col-span-12",
      node: (
        <GlassCard3D key="active_appointments" className="glass-card" glow intensity={3}>
          <CardTitle
            right={
              <Link href="/dashboard/randevular" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.activeAppointments")}
          </CardTitle>
          <div className="flex gap-4 px-4 py-3.5">
            <div className="shrink-0 text-center">
              <p className="stat-number text-primary">
                {appts.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">{t("today")}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t("homePage.noUpcoming")}</p>
              ) : (
                upcoming.map((a) => (
                  <Link
                    key={a.id}
                    href={`/dashboard/randevular/${a.id}`}
                    className="flex items-center justify-between gap-2 text-[13px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="truncate text-foreground">
                      {isLive(a) && <span className="status-dot active pulse-live inline-block mr-1.5 align-middle" />}
                      {a.customer_name}
                      <span className="text-muted-foreground"> ({a.service?.name ?? "—"})</span>
                    </span>
                    <span className="tabular-nums shrink-0 text-primary">
                      {dayLabel(a.appointment_at)}{format(new Date(a.appointment_at), "HH:mm")}
                    </span>
                  </Link>
                ))
              )}
              <Link
                href="/dashboard/randevular"
                className="inline-flex items-center gap-1 mt-1 text-[12px] font-semibold px-2.5 py-1 rounded-lg text-primary hover:opacity-80 transition-opacity"
                style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)" }}
              >
                {t("viewAll")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap px-4 pb-3.5 text-[11px] text-muted-foreground">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="status-dot active pulse-live" /> {liveCount} {t("inProgress")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="status-dot pending" /> {t("homePage.pendingCountLabel", { count: pendingCount })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="status-dot done" /> {t("homePage.doneCountLabel", { count: doneCount })}
            </span>
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "whatsapp_assistant",
      label: "WhatsApp Asistanı",
      colSpanClass: "lg:col-span-5",
      node: (
        <GlassCard3D key="whatsapp_assistant" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/randevular" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.whatsappAssistant")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-2.5">
            <p className="text-[12px] text-muted-foreground">
              {t("homePage.pendingRequestsLabel", { count: (pendingRequests ?? []).length + pendingCount })}
            </p>
            {(pendingRequests ?? []).length === 0 && pendingCount === 0 ? (
              <p className="text-sm text-muted-foreground">{t("homePage.noPendingRequests")}</p>
            ) : (
              <>
                {(pendingRequests ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "color-mix(in oklch, var(--chart-4) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--chart-4) 30%, transparent)" }}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "color-mix(in oklch, var(--chart-4) 22%, transparent)" }}
                    >
                      <MessageCircle className="h-4 w-4" style={{ color: "var(--chart-4)" }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {t("homePage.apptApprovalLabel", { name: r.customer_name })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(r.appointment_at), "d MMM HH:mm", { locale: dateFnsLocale })} · {t("homePage.autoMsgSent")}
                      </p>
                    </div>
                  </div>
                ))}
                {appts.filter((a) => a.status === "talep").slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "color-mix(in oklch, var(--accent) 30%, transparent)", border: "1px solid color-mix(in oklch, var(--accent) 60%, transparent)" }}
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in oklch, var(--accent) 60%, transparent)" }}>
                      <Calendar className="h-4 w-4 text-accent-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {t("homePage.awaitingApprovalLabel", { name: a.customer_name })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("today")} {format(new Date(a.appointment_at), "HH:mm")} · {a.service?.name}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/randevular/${a.id}`}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 bg-primary text-primary-foreground"
                    >
                      {t("approve")}
                    </Link>
                  </div>
                ))}
              </>
            )}
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "campaigns_star",
      label: "Kampanyalar",
      colSpanClass: "lg:col-span-7",
      node: (
        <div key="campaigns_star" className="rounded-2xl bg-primary text-primary-foreground h-full relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklch, var(--primary-foreground) 20%, transparent)" }}
          />
          <div className="relative z-10 px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold tracking-wider uppercase opacity-90">
                {t("homePage.campaignPerformance")}
              </span>
              <Link href="/dashboard/kampanyalar" className="text-[11px] font-medium flex items-center gap-0.5 opacity-80 hover:opacity-100">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {camp ? (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "color-mix(in oklch, var(--primary-foreground) 12%, transparent)" }}>
                <Megaphone className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{t("homePage.campaignLabel", { name: camp.name })}</p>
                  {camp.sent_count > 0 && (
                    <p className="text-[11px] opacity-75">{t("homePage.reachedCustomers", { count: camp.sent_count })}</p>
                  )}
                </div>
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 bg-primary-foreground"
                  style={{ color: "var(--primary)" }}
                >
                  {CAMP_STATUS[camp.status] ?? camp.status}
                </span>
              </div>
            ) : (
              <Link
                href="/dashboard/kampanyalar/yeni"
                className="flex items-center gap-2 text-[13px] opacity-85 hover:opacity-100 transition-opacity"
              >
                <Plus className="h-4 w-4" /> {t("homePage.createFirstCampaign")}
              </Link>
            )}

            {champ?.staff?.full_name && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "color-mix(in oklch, var(--primary-foreground) 12%, transparent)" }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: "color-mix(in oklch, var(--primary-foreground) 20%, transparent)" }}>
                  <Star className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">
                    {t("homePage.weeklyStarLabel", { name: champ.staff.full_name })}
                  </p>
                  <p className="text-[11px] opacity-75">
                    {t("homePage.staffStatsLabel", { count: champ.appointments_done, revenue: Number(champ.total_revenue).toLocaleString("tr-TR") })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Üst başlık: sıcak karşılama + canlı saat ── */}
      <header className="flex items-start justify-between px-4 pt-6 pb-5 max-w-6xl mx-auto">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate text-balance">
            {orgName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("homePage.greeting", { name: firstName })}</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-2xl font-bold tabular-nums text-foreground leading-none">
            <LiveClock />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {format(now, "d MMMM", { locale: dateFnsLocale })}
          </p>
        </div>
      </header>

      {/* ── Bento ızgara: mobil tek sütun, geniş ekran 12 sütun — kişiselleştirilebilir ── */}
      <div className="px-4 pb-24 max-w-6xl mx-auto">
        <DashboardWidgetGrid orgId={orgId} widgets={widgets} initialPrefs={dashboardWidgetPrefs} />
      </div>

      {/* ── Sabit "+ Randevu" düğmesi (mobil kullanım için) ── */}
      <Link
        href="/dashboard/randevular/yeni"
        className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-sm shadow-2xl hover:scale-105 transition-transform bg-primary text-primary-foreground neon-primary"
      >
        <Plus className="h-4 w-4" /> {t("homePage.newApptButton")}
      </Link>
    </div>
  );
}
