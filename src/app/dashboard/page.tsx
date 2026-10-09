import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import {
  format,
  differenceInCalendarDays,
} from "date-fns";
import { tr, enUS, ru, ar } from "date-fns/locale";
import {
  Calendar, MessageCircle, Megaphone, Star, ChevronRight, Plus,
  BarChart3, Wallet, Users, Scissors, Package, AlertTriangle,
} from "lucide-react";
import type { Appointment, StaffPerformanceWeekly } from "@/types/database";
import {
  istanbulTimeStr, istanbulDateStr, istanbulDayOfWeek,
  zonedWallTimeToUtc, DEFAULT_ORG_TIMEZONE,
} from "@/lib/istanbul-time";
import Link from "next/link";
import { LiveClock } from "@/components/ui/LiveClock";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { getDashboardWidgetPrefs } from "@/app/actions/dashboard-widgets";
import { DashboardWidgetGrid, type DashboardWidget } from "@/components/dashboard/DashboardWidgetGrid";
import { getTranslations, getLocale } from "next-intl/server";
import { ApproveButton } from "@/components/dashboard/ApproveButton";
import { RejectButton } from "@/components/dashboard/RejectButton";
import { ContactLinks } from "@/components/dashboard/ContactLinks";
import { HomeHeaderActions } from "@/components/dashboard/HomeHeaderActions";
import { NewAppointmentFab } from "@/components/dashboard/NewAppointmentFab";
import { OnboardingWelcome, OnboardingTour, STAFF_STEPS } from "@/components/dashboard/OnboardingTour";
import { numberLocaleOf } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { DashboardSummary, type SummaryPeriod } from "@/components/dashboard/DashboardSummary";

const DATE_FNS_LOCALES = { tr, en: enUS, ru, ar } as const;

/** "2026-08-19" → "2026-08-20" (delta gün) — takvim aritmetiği UTC'de yapılır, sunucunun yerel saat diliminden bağımsız (bkz. dashboard/randevular/page.tsx nextDayStr). */
function addDaysStr(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/* ─── Mini sparkline SVG — rengi aktif organizasyon temasından (currentColor) alır ─── */
function Sparkline({ data, className = "text-primary" }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 260, H = 64;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 6) - 3}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full h-16 overflow-visible", className)} preserveAspectRatio="none">
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
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ donem?: string | string[]; tour?: string | string[] }>;
}) {
  const sp = await searchParams;
  const donemParam = sp?.donem;
  const period: SummaryPeriod = donemParam === "hafta" || donemParam === "ay" ? donemParam : "bugun";
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const dateFnsLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? tr;
  const numLocale = numberLocaleOf(locale);

  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");
  const orgId = member.org_id;

  // Açılış sayfası tercihi (Hesabım → "Panel açılış sayfası", çerez: sp_home=calendar).
  // YALNIZCA panele dışarıdan/girişten gelindiğinde (Referer yok ya da panel dışı)
  // takvime yönlendirilir; panel içindeki "Genel Bakış" bağlantıları normal çalışır.
  // Kurulum turu (?tour) ve dönem seçimi (?donem) etkilenmez.
  if (!sp?.tour && !sp?.donem && (await cookies()).get("sp_home")?.value === "calendar") {
    const referer = (await headers()).get("referer") ?? "";
    let internal = false;
    try {
      internal = !!referer && new URL(referer).pathname.startsWith("/dashboard");
    } catch {
      /* bozuk Referer — dışarıdan say */
    }
    if (!internal) redirect("/dashboard/takvim");
  }
  const orgName = (member as { org_id: string; organizations?: { name?: string } }).organizations?.name ?? t("homePage.yourBusiness");

  // Saat dilimi üyelik sorgusuyla birlikte geliyor (bkz. active-org.ts
  // MEMBER_SELECT) — ayrı sorgu, ana sayfanın 16 paralel sorgusu başlamadan
  // önce beklenen fazladan bir seri gidiş-dönüştü.
  const orgTimeZone = member.organizations?.timezone || DEFAULT_ORG_TIMEZONE;

  const now = new Date();
  // Gün/hafta/ay sınırları İŞLETMENİN saat dilimine göre kurulur. Sunucu
  // (Vercel) UTC çalışır; date-fns'in startOfDay/endOfDay gibi yardımcıları
  // sunucunun yerel saatini kullandığı için Europe/Istanbul (UTC+3) gibi bir
  // salonda gece yarısına yakın randevular "bugün" sorgusunun dışında
  // kalıyordu — bekleyen/tamamlanan sayaçları ve ciro rakamları gerçek
  // durumu yansıtmıyordu (bkz. dashboard/randevular/page.tsx'te aynı sorun
  // zonedWallTimeToUtc ile çözülmüştü, ana sayfa bu düzeltmeyi almamıştı).
  const todayStr = istanbulDateStr(now, orgTimeZone);
  const todayStart = zonedWallTimeToUtc(todayStr, "00:00", orgTimeZone).toISOString();
  const todayEnd = zonedWallTimeToUtc(addDaysStr(todayStr, 1), "00:00", orgTimeZone).toISOString();

  const weekdayIdx = istanbulDayOfWeek(now, orgTimeZone); // 0=Paz..6=Cmt
  const mondayOffset = weekdayIdx === 0 ? -6 : 1 - weekdayIdx;
  const weekStartStr = addDaysStr(todayStr, mondayOffset);
  const weekStart = zonedWallTimeToUtc(weekStartStr, "00:00", orgTimeZone).toISOString();
  const weekEnd = zonedWallTimeToUtc(addDaysStr(weekStartStr, 7), "00:00", orgTimeZone).toISOString();

  const [todayYear, todayMonth] = todayStr.split("-").map(Number);
  const monthStartDate = `${todayYear}-${String(todayMonth).padStart(2, "0")}-01`;
  const nextMonthStartDate = todayMonth === 12
    ? `${todayYear + 1}-01-01`
    : `${todayYear}-${String(todayMonth + 1).padStart(2, "0")}-01`;
  const monthEndDate = addDaysStr(nextMonthStartDate, -1);
  const monthStart = zonedWallTimeToUtc(monthStartDate, "00:00", orgTimeZone).toISOString();
  const monthEnd = zonedWallTimeToUtc(nextMonthStartDate, "00:00", orgTimeZone).toISOString();

  const day7StartStr = addDaysStr(todayStr, -6);
  const day7Start = zonedWallTimeToUtc(day7StartStr, "00:00", orgTimeZone).toISOString();

  const isStaff = member.role === "staff";
  const staffId = member.staff_id;
  const settingsJson = (member.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffAllAppointments = settingsJson.staff_all_appointments !== false;

  let todayQuery = supabase
    .from("appointments")
    .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name, duration_minutes)")
    .eq("org_id", orgId)
    .gte("appointment_at", todayStart)
    .lt("appointment_at", todayEnd)
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
    .lt("appointment_at", weekEnd)
    .neq("status", "iptal");

  let last7Query = supabase
    .from("appointments")
    .select("appointment_at, price")
    .eq("org_id", orgId)
    .gte("appointment_at", day7Start)
    .lt("appointment_at", todayEnd)
    .eq("status", "tamamlandi");

  let monthApptsQuery = supabase
    .from("appointments")
    .select("price, tip, status")
    .eq("org_id", orgId)
    .gte("appointment_at", monthStart)
    .lt("appointment_at", monthEnd)
    .eq("status", "tamamlandi");

  // Onay bekleyen randevular — tarihe bakılmaksızın (bugünkü appts dizisiyle
  // sınırlı sayılırsa, randevu linkinden başka bir güne alınmış "talep"ler
  // ana sayfada "0 bekliyor" gösterip Bekleyen İstekler sayfasıyla çelişiyordu;
  // bkz. dashboard/layout.tsx'teki sidebar rozetiyle aynı, tarihsiz sayım).
  let talepCountAllQuery = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "talep");

  /* Üst özet şeridi — seçilen dönemin (bugün/hafta/ay) aralığı, işletme saat diliminde. */
  const range =
    period === "hafta"
      ? { start: weekStart, end: weekEnd, dateFrom: weekStartStr, dateTo: addDaysStr(weekStartStr, 6) }
      : period === "ay"
        ? { start: monthStart, end: monthEnd, dateFrom: monthStartDate, dateTo: monthEndDate }
        : { start: todayStart, end: todayEnd, dateFrom: todayStr, dateTo: todayStr };

  let summaryApptsQuery = supabase
    .from("appointments")
    .select("price, tip, status")
    .eq("org_id", orgId)
    .gte("appointment_at", range.start)
    .lt("appointment_at", range.end);

  if (isStaff && staffId && !staffAllAppointments) {
    summaryApptsQuery = summaryApptsQuery.eq("staff_id", staffId);
    todayQuery = todayQuery.eq("staff_id", staffId);
    nextQuery = nextQuery.eq("staff_id", staffId);
    weekQuery = weekQuery.eq("staff_id", staffId);
    last7Query = last7Query.eq("staff_id", staffId);
    monthApptsQuery = monthApptsQuery.eq("staff_id", staffId);
    talepCountAllQuery = talepCountAllQuery.eq("staff_id", staffId);
  }

  // Kurulum turu karşılama kutusu.
  //  - İşletme sahibi: org bayrağı (onboarding_tour_completed_at) NULL ise çıkar.
  //    Kolon migration'ı gecikirse tourRow null → kutu gösterilmez.
  //  - Personel / yönetici: kutu daima render edilir; bileşen kendi cihazındaki
  //    localStorage'a göre gizlenir (org bayrağına dokunulmaz).
  const isOwner = member.role === "owner";
  let showOnboarding = !isOwner;
  if (isOwner) {
    const { data: tourRow } = await supabase
      .from("organizations")
      .select("onboarding_tour_completed_at")
      .eq("id", orgId)
      .maybeSingle();
    showOnboarding = !!tourRow && !tourRow.onboarding_tour_completed_at;
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
    dashboardWidgetPrefs,
    { count: staffCount },
    { count: activeServicesCount },
    { data: activeServices },
    { data: monthAppts },
    { data: monthExpenses },
    { data: recentCustomers },
    { data: inventoryItems },
    { count: talepCountAll },
    { count: pendingRequestsCount },
    { data: summaryAppts },
    { data: summaryExpenses },
    { count: summaryNewCustomers },
    { count: totalCustomers },
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

    supabase
      .from("inventory_items")
      .select("id, name, current_stock, min_stock_alert, unit")
      .eq("org_id", orgId)
      .eq("is_active", true),

    talepCountAllQuery,

    supabase
      .from("appointment_requests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending"),

    summaryApptsQuery,

    supabase
      .from("expenses")
      .select("type, amount")
      .eq("org_id", orgId)
      .gte("date", range.dateFrom)
      .lte("date", range.dateTo),

    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", range.start)
      .lt("created_at", range.end),

    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
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
  const approvedCount = appts.filter((a) => a.status === "onaylandi").length;
  const doneCount = appts.filter((a) => a.status === "tamamlandi").length;
  /* "Bekliyor" rozeti tarihe bakılmaksızın TÜM onay bekleyen randevu/talepleri
     sayar (bkz. talepCountAllQuery yorumu) — yalnızca bugünkü appts dizisi
     kullanılırsa, başka bir güne ait "talep" kayıtları ana sayfada "0
     bekliyor" gösterip Bekleyen İstekler/sidebar rozetiyle çelişiyordu. */
  const totalPendingCount = (talepCountAll ?? 0) + (pendingRequestsCount ?? 0);

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
  /* Onay Bekleyenler kutusu: sadece bugüne değil, yaklaşan (nextQuery zaten
     tarihsiz — "şu andan itibaren") tüm "talep" kayıtlarını gösterir; eskiden
     yalnızca bugünkü appts kullanılıyordu ve başka güne ait bir talep varsa
     liste boş görünüp üstteki sayaçla (totalPendingCount) çelişiyordu. */
  const talepUpcoming = ((nextAppts ?? []) as unknown as NextAppt[])
    .filter((a) => a.status === "talep")
    .slice(0, 2);

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

  /* Son 7 gün ciro grafiği — gün ataması işletmenin saat dilimine göre yapılır (server tz değil). */
  const dailyRev: number[] = Array(7).fill(0);
  ((last7 ?? []) as { appointment_at: string; price: number }[]).forEach((a) => {
    const dayStr = istanbulDateStr(new Date(a.appointment_at), orgTimeZone);
    const diff = differenceInCalendarDays(new Date(dayStr), new Date(day7StartStr));
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

  /* Kritik stok (Kritik Stok kutucuğu) — mevcut min_stock_alert verisinden türetilir */
  type InvRow = { id: string; name: string; current_stock: number; min_stock_alert: number; unit: string };
  const criticalStock = ((inventoryItems ?? []) as InvRow[])
    .filter((i) => Number(i.min_stock_alert) > 0 && Number(i.current_stock) <= Number(i.min_stock_alert))
    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock));

  /* Üst özet şeridi değerleri */
  const sumRows = (summaryAppts ?? []) as { price: number; tip: number | null; status: string }[];
  const sumRevenue = sumRows
    .filter((a) => a.status === "tamamlandi")
    .reduce((s, a) => s + Number(a.price) + Number(a.tip ?? 0), 0);
  const sumExpRows = (summaryExpenses ?? []) as { type: string; amount: number }[];
  const sumExpense = sumExpRows.filter((e) => e.type === "gider").reduce((s, e) => s + Number(e.amount), 0);
  const sumExtraIncome = sumExpRows.filter((e) => e.type === "gelir").reduce((s, e) => s + Number(e.amount), 0);
  const sumIncome = sumRevenue + sumExtraIncome;

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

  /* "Bugünkü Randevular" kartındaki durum rozeti renkleri — mevcut durum
     değerleri/etiketleriyle birebir aynı (bkz. UnifiedCalendar statusLabel),
     yalnızca burada ayrıca renk sınıfı eşleniyor. */
  const STATUS_META: Record<string, { label: string; className: string }> = {
    talep: { label: t("statusTalep"), className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    onaylandi: { label: t("statusOnaylandi"), className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    tamamlandi: { label: t("statusTamamlandi"), className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
    gelmedi: { label: t("noShow"), className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  };
  const initialsOf = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  const widgets: DashboardWidget[] = [
    {
      key: "active_appointments",
      label: "Aktif Randevular",
      colSpanClass: "lg:col-span-12",
      node: (
        <GlassCard3D key="active_appointments" className="glass-card" glow intensity={3}>
          <CardTitle
            right={
              <Link href="/dashboard/randevular" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80">
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
                    className="flex items-center justify-between gap-2 text-[14px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="truncate font-extrabold text-foreground">
                      {isLive(a) && <span className="status-dot active pulse-live inline-block mr-1.5 align-middle" />}
                      {a.customer_name}
                      <span className="font-bold text-muted-foreground"> ({a.service?.name ?? "—"})</span>
                    </span>
                    <span className="tabular-nums shrink-0 font-extrabold text-primary">
                      {dayLabel(a.appointment_at)}{istanbulTimeStr(new Date(a.appointment_at), orgTimeZone)}
                    </span>
                  </Link>
                ))
              )}
              <Link
                href="/dashboard/randevular"
                className="inline-flex items-center gap-1 mt-1 text-[12px] font-extrabold px-2.5 py-1 rounded-lg text-primary hover:opacity-80 transition-opacity"
                style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)" }}
              >
                {t("viewAll")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap px-4 pb-3.5 text-[11px] text-muted-foreground">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 font-extrabold">
                <span className="status-dot active pulse-live" /> {liveCount} {t("inProgress")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="status-dot pending" /> {t("homePage.pendingCountLabel", { count: totalPendingCount })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="status-dot approved" /> {t("homePage.approvedCountLabel", { count: approvedCount })}
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
              <Link href="/dashboard/takvim" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            <span className="flex items-center gap-2">
              {t("homePage.dailyCalendar")}
              {appts.length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-primary-foreground normal-case tracking-normal">
                  {t("homePage.activeCountBadge", { count: appts.length })}
                </span>
              )}
            </span>
          </CardTitle>
          <div className="px-4 py-3.5">
            {appts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t("homePage.todayScheduleEmpty")}</p>
            ) : (
              <div className="space-y-2.5">
                {appts.slice(0, 6).map((a) => {
                  const status = STATUS_META[a.status] ?? { label: a.status, className: "bg-muted text-muted-foreground" };
                  return (
                    <div key={a.id} className="kpi-tile rounded-xl border-0 p-3 space-y-2">
                      <Link href={`/dashboard/randevular/${a.id}`} className="flex items-start justify-between gap-2 hover:opacity-85 transition-opacity">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="tabular-nums shrink-0 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-primary/15 text-primary">
                            {istanbulTimeStr(new Date(a.appointment_at), orgTimeZone)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold text-[15px] text-foreground truncate">{a.customer_name}</p>
                            <p className="text-[13px] font-bold text-muted-foreground truncate">{a.service?.name ?? "—"}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-foreground">₺{Number(a.price).toLocaleString(numLocale)}</p>
                          <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full inline-block mt-0.5", status.className)}>
                            {status.label}
                          </span>
                        </div>
                      </Link>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground truncate">
                          {a.staff?.full_name && (
                            <>
                              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-extrabold shrink-0">
                                {initialsOf(a.staff.full_name)}
                              </span>
                              {t("homePage.staffPrefixLabel", { name: a.staff.full_name })}
                            </>
                          )}
                        </span>
                        {a.customer_phone && <ContactLinks phone={a.customer_phone} size="md" />}
                      </div>
                    </div>
                  );
                })}
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
              <Link href="/dashboard/randevular" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.whatsappAssistant")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-2.5">
            <p className="text-[12px] text-muted-foreground">
              {t("homePage.pendingRequestsLabel", { count: totalPendingCount })}
            </p>
            {totalPendingCount === 0 ? (
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
                      <p className="text-[13px] font-bold text-foreground truncate">
                        {t("homePage.apptApprovalLabel", { name: r.customer_name })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(r.appointment_at), "d MMM", { locale: dateFnsLocale })} {istanbulTimeStr(new Date(r.appointment_at), orgTimeZone)} · {t("homePage.autoMsgSent")}
                      </p>
                    </div>
                  </Link>
                ))}
                {talepUpcoming.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-2.5 rounded-xl px-3 py-2.5"
                    style={{ background: "color-mix(in oklch, var(--accent) 30%, transparent)", border: "1px solid color-mix(in oklch, var(--accent) 60%, transparent)" }}
                  >
                    <div className="relative flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in oklch, var(--accent) 60%, transparent)" }}>
                        <Calendar className="h-4 w-4 text-accent-foreground" />
                      </span>
                      {/* Kayda tıklayınca detay sayfası açılır — Link satırın tamamını
                          kaplar (::before), aksiyon düğmeleri altta ayrı bir satırda. */}
                      <Link
                        href={`/dashboard/randevular/${a.id}`}
                        className="min-w-0 flex-1 before:absolute before:inset-0 before:content-['']"
                      >
                        <p className="text-[13px] font-bold text-foreground truncate">
                          {t("homePage.awaitingApprovalLabel", { name: a.customer_name })}
                        </p>
                        <p className="text-[11px] font-bold text-muted-foreground">
                          {dayLabel(a.appointment_at) || `${t("today")} `}{istanbulTimeStr(new Date(a.appointment_at), orgTimeZone)} · {a.service?.name}
                        </p>
                      </Link>
                    </div>
                    <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
                      <ApproveButton appointmentId={a.id} label={t("approve")} />
                      <Link
                        href="/dashboard/bekleyen-istekler"
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        {t("proposeNewTime")}
                      </Link>
                      <RejectButton appointmentId={a.id} label={t("cancelAction")} />
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
      colSpanClass: "lg:col-span-6",
      node: (
        <div key="campaigns_star" className="rounded-2xl bg-primary text-primary-foreground h-full relative overflow-hidden cursor-pointer">
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklch, var(--primary-foreground) 20%, transparent)" }}
          />
          <div className="relative z-10 px-6 py-6 space-y-4 h-full">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold tracking-wider uppercase opacity-90">
                {t("homePage.campaignPerformance")}
              </span>
              <Link href="/dashboard/kampanyalar" className="text-[11px] font-bold flex items-center gap-0.5 opacity-80 hover:opacity-100 after:absolute after:inset-0 after:z-[1] after:content-['']">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {camp ? (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "color-mix(in oklch, var(--primary-foreground) 12%, transparent)" }}>
                <Megaphone className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate">{t("homePage.campaignLabel", { name: camp.name })}</p>
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
                className="relative z-[2] flex items-center gap-2 text-[13px] opacity-85 hover:opacity-100 transition-opacity"
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
                  <p className="text-[13px] font-bold truncate">
                    {t("homePage.weeklyStarLabel", { name: champ.staff.full_name })}
                  </p>
                  <p className="text-[11px] opacity-75">
                    {t("homePage.staffStatsLabel", { count: champ.appointments_done, revenue: Number(champ.total_revenue).toLocaleString(numLocale) })}
                  </p>
                </div>
              </div>
            )}

            {/* Kampanya durumu: son 7 gün ciro grafiği + doluluk (eski ayrı "Ciro Özeti" kutusu) */}
            <div
              className="rounded-xl px-3 py-3"
              style={{ background: "color-mix(in oklch, var(--primary-foreground) 12%, transparent)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-bold uppercase tracking-wider opacity-90">
                  {t("homePage.campaignStatus")}
                </span>
                <span className="text-[11px] opacity-75 capitalize">
                  {format(now, "MMM yyyy", { locale: dateFnsLocale })}
                </span>
              </div>
              <Sparkline data={dailyRev} className="text-primary-foreground" />
              <div className="flex items-center justify-between mt-2 text-[13px] font-bold">
                <span>{t("homePage.efficiencyLabel", { value: efficiency })}</span>
                <span>{t("homePage.newCustomersLabel", { count: newCustCount })}</span>
              </div>
              <p className="text-[11px] opacity-75 mt-1">{t("homePage.chartCaption")}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "new_customer",
      label: "Yeni Müşteriler",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="new_customer" className="glass-card h-full cursor-pointer" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/musteriler" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80 after:absolute after:inset-0 after:z-[1] after:content-['']">
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
                    className="flex items-center justify-between gap-2 text-[14px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="truncate font-extrabold text-foreground">{c.full_name}</span>
                    <span className="tabular-nums shrink-0 font-bold text-muted-foreground text-[11px]">
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
        <GlassCard3D key="reports_summary" className="glass-card h-full cursor-pointer" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/raporlar" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80 after:absolute after:inset-0 after:z-[1] after:content-['']">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.reportsTitle")}
          </CardTitle>
          <div className="px-4 py-3.5 flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in oklch, var(--primary) 24%, transparent)" }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground truncate">
                ₺{monthRevenue.toLocaleString(numLocale)}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("homePage.monthRevenueLabel")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-extrabold text-foreground">{t("homePage.monthApptsCountLabel", { count: monthApptsCount })}</p>
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
        <GlassCard3D key="income_expense" className="glass-card h-full cursor-pointer" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/gelir-gider" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80 after:absolute after:inset-0 after:z-[1] after:content-['']">
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
                style={{ background: "color-mix(in oklch, var(--primary) 24%, transparent)" }}
              >
                <Wallet className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-foreground truncate">₺{netTotal.toLocaleString(numLocale)}</p>
                <p className="text-[11px] text-muted-foreground">{t("homePage.netLabel")}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[13px] py-1">
              <span className="text-muted-foreground">{t("homePage.extraIncomeLabel")}</span>
              <span className="font-extrabold" style={{ color: "var(--chart-2)" }}>+₺{extraIncomeTotal.toLocaleString(numLocale)}</span>
            </div>
            <div className="flex items-center justify-between text-[13px] py-1">
              <span className="text-muted-foreground">{t("homePage.expenseLabel")}</span>
              <span className="font-extrabold" style={{ color: "var(--destructive)" }}>-₺{expenseTotal.toLocaleString(numLocale)}</span>
            </div>
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "staff_today",
      label: "Personel",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="staff_today" className="glass-card h-full cursor-pointer" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/personel" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80 after:absolute after:inset-0 after:z-[1] after:content-['']">
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
                <p className="text-[11px] font-bold text-muted-foreground">{t("homePage.workingTodayLabel")}</p>
                {staffToday.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between text-[14px]">
                    <span className="flex items-center gap-2 font-extrabold text-foreground truncate">
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" /> {name}
                    </span>
                    <span className="tabular-nums shrink-0 font-extrabold text-primary text-[12px]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard3D>
      ),
    },
    {
      key: "critical_stock",
      label: "Kritik Stok",
      colSpanClass: "lg:col-span-6",
      node: (
        <GlassCard3D key="critical_stock" className="glass-card h-full cursor-pointer" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/stok" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80 after:absolute after:inset-0 after:z-[1] after:content-['']">
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.criticalStockTitle")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-2">
            {criticalStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t("homePage.criticalStockOk")}</p>
            ) : (
              <>
                <p className="text-[12px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {t("homePage.criticalStockCount", { count: criticalStock.length })}
                </p>
                {criticalStock.slice(0, 5).map((i) => (
                  <Link
                    key={i.id}
                    href="/dashboard/stok"
                    className="flex items-center justify-between gap-2 text-[14px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="flex items-center gap-2 truncate font-extrabold text-foreground">
                      <Package className="h-3.5 w-3.5 text-amber-500 shrink-0" /> {i.name}
                    </span>
                    <span className="tabular-nums shrink-0 text-amber-600 dark:text-amber-400 text-[11px] font-extrabold">
                      {i.current_stock} {i.unit}
                    </span>
                  </Link>
                ))}
              </>
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
        <GlassCard3D key="services_summary" className="glass-card h-full cursor-pointer" glow intensity={4}>
          <CardTitle
            right={
              <Link href="/dashboard/hizmetler" className="text-[11px] font-bold flex items-center gap-0.5 text-primary hover:opacity-80 after:absolute after:inset-0 after:z-[1] after:content-['']">
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
                className="flex items-center justify-between gap-2 text-[14px] leading-snug hover:opacity-80 transition-opacity"
              >
                <span className="flex items-center gap-2 truncate font-extrabold text-foreground">
                  <Scissors className="h-3.5 w-3.5 text-primary shrink-0" /> {s.name}
                </span>
                <span className="tabular-nums shrink-0 font-bold text-muted-foreground text-[11px]">
                  ₺{Number(s.price).toLocaleString(numLocale)} · {s.duration_minutes}{t("minutesShort")}
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
      (w) => !["income_expense", "reports_summary", "staff_today", "campaigns_star", "services_summary"].includes(w.key)
    );
    const personalReportWidget = {
      key: "staff_personal_report",
      label: "Raporum",
      colSpanClass: "lg:col-span-12",
      node: (
        <GlassCard3D key="staff_personal_report" className="glass-card" glow intensity={4}>
          <CardTitle>
            {t("homePage.performanceReportTitle")}
          </CardTitle>
          <div className="px-4 py-4 flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in oklch, var(--primary) 24%, transparent)" }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground truncate">
                ₺{monthRevenue.toLocaleString(numLocale)}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("homePage.monthlyEarningsLabel")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-extrabold text-foreground">{t("homePage.completedApptsCountLabel", { count: monthApptsCount })}</p>
            </div>
          </div>
        </GlassCard3D>
      )
    };
    displayWidgets = [personalReportWidget, ...displayWidgets];
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Üst başlık: canlı-durum rozeti + sıcak karşılama + canlı saat + hızlı aksiyonlar ── */}
      <header className="px-4 pt-4 pb-3 max-w-6xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/15 px-5 py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">
                <span className="status-dot active pulse-live" />
                {t("homePage.liveHeaderLabel")}
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground truncate text-balance mt-1">
                {orgName}
              </h1>
              <p className="text-sm font-bold text-muted-foreground mt-1">{t("homePage.greeting", { name: firstName })}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
                <LiveClock />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground mt-1">
                {format(now, "d MMMM", { locale: dateFnsLocale })}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <HomeHeaderActions />
          </div>
        </div>
      </header>

      {showOnboarding && (
        <div className="pb-2">
          <OnboardingWelcome orgId={orgId} role={member.role} />
        </div>
      )}
      {/* Personel turu bu sayfada çalışır (ayarlar sayfasına erişemezler). */}
      {member.role === "staff" && (
        <OnboardingTour orgId={orgId} steps={STAFF_STEPS} basePath="/dashboard" personalOnly />
      )}

      <DashboardSummary
        data={{
          period,
          showFinance: !isStaff,
          income: sumIncome,
          revenue: sumRevenue,
          expense: sumExpense,
          net: sumIncome - sumExpense,
          apptTotal: sumRows.filter((a) => a.status !== "iptal").length,
          apptDone: sumRows.filter((a) => a.status === "tamamlandi").length,
          apptCancelled: sumRows.filter((a) => a.status === "iptal").length,
          newCustomers: summaryNewCustomers ?? 0,
          totalCustomers: totalCustomers ?? 0,
          criticalStock: criticalStock.length,
          activeItems: (inventoryItems ?? []).length,
          pending: totalPendingCount,
          numLocale,
        }}
      />

      {/* ── Bento ızgara: mobil tek sütun, geniş ekran 12 sütun — kişiselleştirilebilir ── */}
      <div className="px-4 pb-24 max-w-6xl mx-auto">
        <DashboardWidgetGrid orgId={orgId} widgets={displayWidgets} initialPrefs={dashboardWidgetPrefs} />
      </div>

      {/* ── Sabit "Randevu" düğmesi (mobil): tek dokunuş formu açar, basılı tutma sesli randevu ── */}
      <NewAppointmentFab />
    </div>
  );
}
