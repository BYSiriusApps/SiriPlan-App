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
import { getUserShortcuts } from "@/app/actions/shortcuts";
import { getTranslations, getLocale } from "next-intl/server";

/* ─── Tema sabitleri — örnek arayüzdeki koyu/altın/camgöbeği stil ─── */
const GOLD = "#facc15";
const CYAN = "#22d3ee";
const CARD_BG = "linear-gradient(165deg, #15151f 0%, #101018 100%)";
const CARD_BORDER = "1px solid rgba(250, 204, 21, 0.30)";

const DATE_FNS_LOCALES = { tr, en: enUS, ru, ar } as const;

/* ─── Mini sparkline SVG ─── */
function Sparkline({ data, color = CYAN }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 260, H = 64;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 6) - 3}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dsg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#dsg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={H - (data[data.length - 1] / max) * (H - 6) - 3} r="3.5" fill={color} />
    </svg>
  );
}

/* ─── Kart başlığı ─── */
function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5"
      style={{ borderBottom: "1px solid rgba(250,204,21,0.15)" }}>
      <span className="text-[13px] font-bold tracking-wider uppercase" style={{ color: GOLD }}>
        {children}
      </span>
      {right ?? <span className="text-lg leading-none tracking-widest" style={{ color: "rgba(250,204,21,0.5)" }}>⋯</span>}
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

  return (
    <div
      className="min-h-screen text-gray-200"
      style={{ background: "linear-gradient(170deg, #0c0c15 0%, #12121e 55%, #0b0b12 100%)" }}
    >
      {/* ── Üst başlık ── */}
      <header className="flex items-start justify-between px-4 pt-5 pb-4 max-w-6xl mx-auto">
        <div className="min-w-0">
          <h1
            className="text-xl sm:text-2xl font-black tracking-[0.06em] uppercase truncate"
            style={{ color: GOLD, textShadow: "0 0 24px rgba(250,204,21,0.35)" }}
          >
            {orgName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{t("homePage.greeting", { name: firstName })}</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-2xl font-bold tabular-nums text-white leading-none">
            <LiveClock />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {format(now, "d MMMM", { locale: dateFnsLocale })}
          </p>
        </div>
      </header>

      {/* ── Kart ızgarası: mobil tek sütun, geniş ekran 2 sütun ── */}
      <div className="px-4 pb-24 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1 — AKTİF RANDEVULAR */}
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <CardTitle
            right={
              <Link href="/dashboard/randevular" className="text-[11px] font-medium flex items-center gap-0.5 hover:opacity-80" style={{ color: CYAN }}>
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.activeAppointments")}
          </CardTitle>
          <div className="flex gap-4 px-4 py-3.5">
            <div className="shrink-0 text-center">
              <p
                className="text-5xl font-black tabular-nums leading-none"
                style={{ color: CYAN, textShadow: "0 0 28px rgba(34,211,238,0.45)" }}
              >
                {appts.length}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5">{t("today")}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">{t("homePage.noUpcoming")}</p>
              ) : (
                upcoming.map((a) => (
                  <Link
                    key={a.id}
                    href={`/dashboard/randevular/${a.id}`}
                    className="flex items-center justify-between gap-2 text-[13px] leading-snug hover:opacity-80 transition-opacity"
                  >
                    <span className="truncate text-gray-200">
                      {isLive(a) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5 align-middle" />}
                      {a.customer_name}
                      <span className="text-gray-500"> ({a.service?.name ?? "—"})</span>
                    </span>
                    <span className="tabular-nums shrink-0" style={{ color: CYAN }}>
                      {dayLabel(a.appointment_at)}{format(new Date(a.appointment_at), "HH:mm")}
                    </span>
                  </Link>
                ))
              )}
              <Link
                href="/dashboard/randevular"
                className="inline-flex items-center gap-1 mt-1 text-[12px] font-semibold px-2.5 py-1 rounded-lg hover:opacity-80 transition-opacity"
                style={{ background: "rgba(34,211,238,0.12)", color: CYAN, border: "1px solid rgba(34,211,238,0.3)" }}
              >
                {t("viewAll")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap px-4 pb-3.5 text-[11px]">
            {liveCount > 0 && (
              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                ● {liveCount} {t("inProgress")}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.14)", color: "#fbbf24" }}>
              {t("homePage.pendingCountLabel", { count: pendingCount })}
            </span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.13)", color: "#34d399" }}>
              ✓ {t("homePage.doneCountLabel", { count: doneCount })}
            </span>
          </div>
        </div>

        {/* 2 — KAMPANYA DURUMU / PERFORMANS GRAFİĞİ */}
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <CardTitle
            right={
              <span className="text-[11px] text-gray-500 capitalize">
                {format(now, "MMM yyyy", { locale: dateFnsLocale })}
              </span>
            }
          >
            {t("homePage.campaignStatus")}
          </CardTitle>
          <div className="px-4 py-3.5">
            <Sparkline data={dailyRev} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-bold" style={{ color: CYAN }}>
                {t("homePage.efficiencyLabel", { value: efficiency })}
              </span>
              <span className="text-sm font-bold" style={{ color: GOLD }}>
                {t("homePage.newCustomersLabel", { count: newCustCount })}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              {t("homePage.chartCaption")}
            </p>
          </div>
        </div>

        {/* 3 — WHATSAPP ASİSTANI / ONAY KUYRUĞU */}
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <CardTitle
            right={
              <Link href="/dashboard/randevular" className="text-[11px] font-medium flex items-center gap-0.5 hover:opacity-80" style={{ color: CYAN }}>
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.whatsappAssistant")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-2.5">
            <p className="text-[12px] text-gray-400">
              {t("homePage.pendingRequestsLabel", { count: (pendingRequests ?? []).length + pendingCount })}
            </p>
            {(pendingRequests ?? []).length === 0 && pendingCount === 0 ? (
              <p className="text-sm text-gray-500">{t("homePage.noPendingRequests")}</p>
            ) : (
              <>
                {(pendingRequests ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(34,197,94,0.2)" }}
                    >
                      <MessageCircle className="h-4 w-4" style={{ color: "#4ade80" }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-200 truncate">
                        {t("homePage.apptApprovalLabel", { name: r.customer_name })}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {format(new Date(r.appointment_at), "d MMM HH:mm", { locale: dateFnsLocale })} · {t("homePage.autoMsgSent")}
                      </p>
                    </div>
                  </div>
                ))}
                {appts.filter((a) => a.status === "talep").slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.18)" }}>
                      <Calendar className="h-4 w-4" style={{ color: "#fbbf24" }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-200 truncate">
                        {t("homePage.awaitingApprovalLabel", { name: a.customer_name })}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {t("today")} {format(new Date(a.appointment_at), "HH:mm")} · {a.service?.name}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/randevular/${a.id}`}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
                      style={{ background: GOLD, color: "#111" }}
                    >
                      {t("approve")}
                    </Link>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 4 — KAMPANYALAR + HAFTANIN YILDIZI */}
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <CardTitle
            right={
              <Link href="/dashboard/kampanyalar" className="text-[11px] font-medium flex items-center gap-0.5 hover:opacity-80" style={{ color: CYAN }}>
                {t("all")} <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {t("homePage.campaignPerformance")}
          </CardTitle>
          <div className="px-4 py-3.5 space-y-3">
            {camp ? (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.22)" }}>
                <Megaphone className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-gray-200 truncate">{t("homePage.campaignLabel", { name: camp.name })}</p>
                  {camp.sent_count > 0 && (
                    <p className="text-[11px] text-gray-500">{t("homePage.reachedCustomers", { count: camp.sent_count })}</p>
                  )}
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: GOLD, color: "#111" }}>
                  {CAMP_STATUS[camp.status] ?? camp.status}
                </span>
              </div>
            ) : (
              <Link
                href="/dashboard/kampanyalar/yeni"
                className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                <Plus className="h-4 w-4" style={{ color: GOLD }} /> {t("homePage.createFirstCampaign")}
              </Link>
            )}

            {champ?.staff?.full_name && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.22)" }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: "rgba(34,211,238,0.18)", color: CYAN }}>
                  <Star className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-gray-200 truncate">
                    {t("homePage.weeklyStarLabel", { name: champ.staff.full_name })}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {t("homePage.staffStatsLabel", { count: champ.appointments_done, revenue: Number(champ.total_revenue).toLocaleString("tr-TR") })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5 — Hızlı işlemler (kullanıcı kısayolları — özelleştirilebilir) */}
        <div className="lg:col-span-2">
          <QuickActionsPanel initialShortcuts={userShortcuts} orgId={orgId} />
        </div>
      </div>

      {/* ── Sabit "+ Randevu" düğmesi (mobil kullanım için) ── */}
      <Link
        href="/dashboard/randevular/yeni"
        className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-sm shadow-2xl hover:scale-105 transition-transform"
        style={{ background: GOLD, color: "#111", boxShadow: "0 8px 28px rgba(250,204,21,0.4)" }}
      >
        <Plus className="h-4 w-4" /> {t("homePage.newApptButton")}
      </Link>
    </div>
  );
}
