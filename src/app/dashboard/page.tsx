import { createClient, getSessionUser } from "@/lib/supabase/server";
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
  Clock, BarChart3, Wallet, Users, Scissors, Mic,
} from "lucide-react";
import type { Appointment, StaffPerformanceWeekly } from "@/types/database";
import { istanbulTimeStr, istanbulDateStr, DEFAULT_ORG_TIMEZONE } from "@/lib/istanbul-time";
import Link from "next/link";
import { LiveClock } from "@/components/ui/LiveClock";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { getUserShortcuts } from "@/app/actions/shortcuts";
import { getDashboardWidgetPrefs } from "@/app/actions/dashboard-widgets";
import { DashboardWidgetGrid, type DashboardWidget } from "@/components/dashboard/DashboardWidgetGrid";
import { getTranslations, getLocale } from "next-intl/server";
import { ApproveButton } from "@/components/dashboard/ApproveButton";

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
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");
  const orgId = member.org_id;
  const orgName = (member as { org_id: string; organizations?: { name?: string } }).organizations?.name ?? t("homePage.yourBusiness");

  // Saat dilimi üyelik sorgusuyla birlikte geliyor (bkz. active-org.ts
  // MEMBER_SELECT) — ayrı sorgu, ana sayfanın 16 paralel sorgusu başlamadan
  // önce beklenen fazladan bir seri gidiş-dönüştü.
  const orgTimeZone = member.organizations?.timezone || DEFAULT_ORG_TIMEZONE;

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();
  const monthStartDate = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEndDate = format(endOfMonth(now), "yyyy-MM-dd");
  const day7Start = startOfDay(subDays(now, 6)).toISOString();

  const isStaff = member.role === "staff";
  const staffId = member.staff_id;
  const settingsJson = (member.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffAllAppointments = settingsJson.staff_all_appointments !== false;

  let todayQuery = supabase
    .from("appointments")
    .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name, duration_minutes)")
    .eq("org_id", orgId)
    .gte("appointment_at", todayStart)
    .lte("appointment_at", todayEnd)
    .neq("status", "iptal")
    .order("appointment_at");

  let nextQuery = supabase
    .from("appointments")
    .select("id, customer_name, appointment_at, status, duration_minutes, service:services(name)")
    .eq("org_id", orgId)
    .gte("appointment_at", now.toISOString())
    .in("status", ["talep", "onaylandi"])
    .order("appointment_at", { ascending: true })
    .limit(5);

  let weekQuery = supabase
    .from("appointments")
    .select("price, tip, status")
    .eq("org_id", orgId)
    .gte("appointment_at", weekStart)
    .lte("appointment_at", weekEnd)
    .neq("status", "iptal");

  let last7Query = supabase
    .from("appointments")
    .select("appointment_at, price")
    .eq("org_id", orgId)
    .gte("appointment_at", day7Start)
    .lte("appointment_at", todayEnd)
    .eq("status", "tamamlandi");

  let monthApptsQuery = supabase
    .from("appointments")
    .select("price, tip, status")
    .eq("org_id", orgId)
    .gte("appointment_at", monthStart)
    .lte("appointment_at", monthEnd)
    .eq("status", "tamamlandi");

  if (isStaff && staffId && !staffAllAppointments) {
    todayQuery = todayQuery.eq("staff_id", staffId);
    nextQuery = nextQuery.eq("staff_id", staffId);
    weekQuery = weekQuery.eq("staff_id", staffId);
    last7Query = last7Query.eq("staff_id", staffId);
    monthApptsQuery = monthApptsQuery.eq("staff_id", staffId);
  }

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
    { count: staffCount },
    { count: activeServicesCount },
    { data: activeServices },
    { data: monthAppts },
    { data: monthExpenses },
    { data: recentCustomers },
  ] = await Promise.all([
    todayQuery,
    nextQuery,
    weekQuery,
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

    last7Query,

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

    supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_active", true),

    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_active", true),

    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("display_order")
      .limit(4),

    monthApptsQuery,

    supabase
      .from("expenses")
      .select("type, amount")
      .eq("org_id", orgId)
      .gte("date", monthStartDate)
      .lte("date", monthEndDate),

    supabase
      .from("customers")
      .select("id, full_name, phone, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(4),
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

  const todayInOrgTz = istanbulDateStr(now, orgTimeZone);
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const diff = differenceInCalendarDays(new Date(istanbulDateStr(d, orgTimeZone)), new Date(todayInOrgTz));
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

  /* Bugün çalışan personel — bugünkü randevulardan gruplanır */
  const staffTodayMap = new Map<string, number>();
  appts.forEach((a) => {
    const name = a.staff?.full_name;
    if (name) staffTodayMap.set(name, (staffTodayMap.get(name) ?? 0) + 1);
  });
  const staffToday = [...staffTodayMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  /* Bu ayki ciro/randevu (Raporlar kutucuğu) */
  const monthRows = (monthAppts ?? []) as { price: number; tip: number | null }[];
  const monthRevenue = monthRows.reduce((s, a) => s + Number(a.price) + Number(a.tip ?? 0), 0);
  const monthApptsCount = monthRows.length;

  /* Bu ayki gelir/gider (Gelir Gider kutucuğu) */
  const expenseRows = (monthExpenses ?? []) as { type: string; amount: number }[];
  const expenseTotal = expenseRows.filter((e) => e.type === "gider").reduce((s, e) => s + Number(e.amount), 0);
  const extraIncomeTotal = expenseRows.filter((e) => e.type === "gelir").reduce((s, e) => s + Number(e.amount), 0);
  const netTotal = monthRevenue + extraIncomeTotal - expenseTotal;

  /* Aktif hizmetler (Hizmetler kutucuğu) */
  const servicesList = (activeServices ?? []) as { id: string; name: string; price: number; duration_minutes: number }[];

  /* Son eklenen müşteriler (Yeni Müşteri kutucuğu) */
  const recentCustList = (recentCustomers ?? []) as { id: string; full_name: string; phone: string; created_at: string }[];

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
                      {dayLabel(a.appointment_at)}{istanbulTimeStr(new Date(a.appointment_at), orgTimeZone)}
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
      key: "daily_calendar",
      label: "Takvim (Bugün)",
      colSpanClass: "lg:col-span-7",
      node: (
        <GlassCard3D key="daily_calendar" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/takvim" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.dailyCalendar")}
          </CardTitle>
          <div className="px-4 py-3.5">
            {appts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t("homePage.todayScheduleEmpty")}</p>
            ) : (
              <div className="space-y-1.5">
                {appts.slice(0, 6).map((a) => (
                  <Link
                    key={a.id}
                    href={`/dashboard/randevular/${a.id}`}
                    className="flex items-center gap-2.5 text-[13px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="tabular-nums shrink-0 w-12 text-primary font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {istanbulTimeStr(new Date(a.appointment_at), orgTimeZone)}
                    </span>
                    <span className="truncate flex-1 text-foreground">{a.customer_name}</span>
                    {a.staff?.full_name && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0 text-muted-foreground"
                        style={{ background: "color-mix(in oklch, var(--accent) 30%, transparent)" }}
                      >
                        {a.staff.full_name}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "whatsapp_assistant",
      label: "Onay Bekleyenler",
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
                  <Link
                    key={r.id}
                    href="/dashboard/bekleyen-istekler"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:opacity-80 transition-opacity"
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
                        {format(new Date(r.appointment_at), "d MMM", { locale: dateFnsLocale })} {istanbulTimeStr(new Date(r.appointment_at), orgTimeZone)} · {t("homePage.autoMsgSent")}
                      </p>
                    </div>
                  </Link>
                ))}
                {appts.filter((a) => a.status === "talep").slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 hover:opacity-90 transition-opacity"
                    style={{ background: "color-mix(in oklch, var(--accent) 30%, transparent)", border: "1px solid color-mix(in oklch, var(--accent) 60%, transparent)" }}
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in oklch, var(--accent) 60%, transparent)" }}>
                      <Calendar className="h-4 w-4 text-accent-foreground" />
                    </span>
                    {/* Kayda tıklayınca detay sayfası açılır — Link kartın tamamını
                        kaplar (::before), "Onayla" düğmesi üstte kalır (relative z-10). */}
                    <Link
                      href={`/dashboard/randevular/${a.id}`}
                      className="min-w-0 flex-1 before:absolute before:inset-0 before:content-['']"
                    >
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {t("homePage.awaitingApprovalLabel", { name: a.customer_name })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("today")} {istanbulTimeStr(new Date(a.appointment_at), orgTimeZone)} · {a.service?.name}
                      </p>
                    </Link>
                    <div className="relative z-10 shrink-0">
                      <ApproveButton appointmentId={a.id} label={t("approve")} />
                    </div>
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
    {
      key: "new_customer",
      label: "Yeni Müşteriler",
      colSpanClass: "lg:col-span-5",
      node: (
        <GlassCard3D key="new_customer" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/musteriler" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.newCustomersTitle")}
          </CardTitle>
          <div className="flex gap-4 px-4 py-3.5">
            <div className="shrink-0 text-center">
              <p className="stat-number text-primary">{newCustCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">{t("homePage.newCustomersThisMonth", { count: newCustCount })}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {recentCustList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t("homePage.noNewCustomers")}</p>
              ) : (
                recentCustList.map((c) => (
                  <Link
                    key={c.id}
                    href="/dashboard/musteriler"
                    className="flex items-center justify-between gap-2 text-[13px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="truncate text-foreground">{c.full_name}</span>
                    <span className="tabular-nums shrink-0 text-muted-foreground text-[11px]">
                      {format(new Date(c.created_at), "d MMM", { locale: dateFnsLocale })}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "reports_summary",
      label: "Raporlar",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="reports_summary" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/raporlar" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.reportsTitle")}
          </CardTitle>
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground truncate">
                ₺{monthRevenue.toLocaleString("tr-TR")}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("homePage.monthRevenueLabel")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-foreground">{t("homePage.monthApptsCountLabel", { count: monthApptsCount })}</p>
            </div>
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "income_expense",
      label: "Gelir & Gider",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="income_expense" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/gelir-gider" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.incomeExpenseTitle")}
          </CardTitle>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
              >
                <Wallet className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-foreground truncate">₺{netTotal.toLocaleString("tr-TR")}</p>
                <p className="text-[11px] text-muted-foreground">{t("homePage.netLabel")}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[13px] py-1">
              <span className="text-muted-foreground">{t("homePage.extraIncomeLabel")}</span>
              <span className="font-semibold" style={{ color: "var(--chart-2)" }}>+₺{extraIncomeTotal.toLocaleString("tr-TR")}</span>
            </div>
            <div className="flex items-center justify-between text-[13px] py-1">
              <span className="text-muted-foreground">{t("homePage.expenseLabel")}</span>
              <span className="font-semibold" style={{ color: "var(--destructive)" }}>-₺{expenseTotal.toLocaleString("tr-TR")}</span>
            </div>
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "quick_actions",
      label: "Hızlı İşlemler",
      colSpanClass: "lg:col-span-4",
      node: <QuickActionsPanel key="quick_actions" initialShortcuts={userShortcuts} orgId={orgId} role={member.role} />,
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
      key: "staff_today",
      label: "Personel",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="staff_today" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/personel" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.staffTitle")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-2.5">
            <p className="text-[12px] text-muted-foreground">
              {t("homePage.activeStaffCountLabel", { count: staffCount ?? 0 })}
            </p>
            {staffToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("homePage.noStaffToday")}</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">{t("homePage.workingTodayLabel")}</p>
                {staffToday.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 text-foreground truncate">
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" /> {name}
                    </span>
                    <span className="tabular-nums shrink-0 text-muted-foreground text-[11px]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "services_summary",
      label: "Hizmetler",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="services_summary" className="glass-card h-full" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/hizmetler" className="text-[11px] font-medium flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.servicesTitle")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-2">
            <p className="text-[12px] text-muted-foreground">
              {t("homePage.activeServicesCountLabel", { count: activeServicesCount ?? 0 })}
            </p>
            {servicesList.map((s) => (
              <Link
                key={s.id}
                href="/dashboard/hizmetler"
                className="flex items-center justify-between gap-2 text-[13px] leading-snug hover:opacity-80 transition-opacity"
              >
                <span className="flex items-center gap-2 truncate text-foreground">
                  <Scissors className="h-3.5 w-3.5 text-primary shrink-0" /> {s.name}
                </span>
                <span className="tabular-nums shrink-0 text-muted-foreground text-[11px]">
                  ₺{Number(s.price).toLocaleString("tr-TR")} · {s.duration_minutes}{t("minutesShort")}
                </span>
              </Link>
            ))}
          </div>
        </GlassCard3D>
      ),
    },
  ];

  let displayWidgets = widgets;
  if (isStaff) {
    displayWidgets = widgets.filter(
      (w) => !["income_expense", "reports_summary", "revenue_summary", "staff_today", "campaigns_star", "services_summary"].includes(w.key)
    );
    const personalReportWidget = {
      key: "staff_personal_report",
      label: "Raporum",
      colSpanClass: "lg:col-span-12",
      node: (
        <GlassCard3D key="staff_personal_report" className="glass-card" glow intensity={4}>
          <CardTitle>
            Performans Raporum
          </CardTitle>
          <div className="px-4 py-4 flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground truncate">
                ₺{monthRevenue.toLocaleString("tr-TR")}
              </p>
              <p className="text-[11px] text-muted-foreground">Bu Ay Kazandırdığım Toplam Tutar</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-foreground">{monthApptsCount} Tamamlanan Randevu</p>
            </div>
          </div>
        </GlassCard3D>
      )
    };
    displayWidgets = [personalReportWidget, ...displayWidgets];
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Üst başlık: sıcak karşılama + canlı saat ── */}
      <header className="flex items-start justify-between px-4 pt-6 pb-5 max-w-6xl mx-auto">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground truncate text-balance">
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
        <DashboardWidgetGrid orgId={orgId} widgets={displayWidgets} initialPrefs={dashboardWidgetPrefs} />
      </div>

      {/* ── Sabit "+ Randevu" ve Sesli Arama düğmesi (mobil kullanım için) ── */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2">
        <Link
          href="/dashboard/randevular/yeni?voice=true"
          className="flex items-center justify-center w-12 h-12 rounded-full font-bold shadow-2xl hover:scale-105 transition-transform bg-red-600 text-white border border-red-500 animate-pulse"
          title="Sesle Randevu Oluştur"
        >
          <Mic className="h-5 w-5 animate-bounce" />
        </Link>
        <Link
          href="/dashboard/randevular/yeni"
          className="flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-sm shadow-2xl hover:scale-105 transition-transform bg-primary text-primary-foreground neon-primary"
        >
          <Plus className="h-4 w-4" /> {t("homePage.newApptButton")}
        </Link>
      </div>
    </div>
  );
}
