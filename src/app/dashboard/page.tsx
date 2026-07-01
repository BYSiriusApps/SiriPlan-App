import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  format,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subDays, differenceInCalendarDays,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  TrendingUp, Calendar, Users, Star, Clock,
  AlertCircle, CheckCircle2,
  MoreHorizontal, ArrowUpRight, BarChart3, HeadphonesIcon, MessageCircle, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment, StaffPerformanceWeekly } from "@/types/database";
import Link from "next/link";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { LiveClock } from "@/components/ui/LiveClock";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { getUserShortcuts } from "@/app/actions/shortcuts";

/* ─── Status helpers ──────────────────────────────────────────────────── */
const STATUS_DOT: Record<string, string> = {
  talep:      "pending",
  onaylandi:  "active",
  tamamlandi: "done",
  iptal:      "cancelled",
  gelmedi:    "cancelled",
};

const STATUS_LABELS: Record<string, string> = {
  talep:      "Bekliyor",
  onaylandi:  "Onaylı",
  tamamlandi: "Tamamlandı",
  iptal:      "İptal",
  gelmedi:    "Gelmedi",
};

/* ─── Mini sparkline SVG ──────────────────────────────────────────────── */
function Sparkline({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 140, H = 40;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`)
    .join(" ");

  /* Area fill */
  const first = `0,${H}`;
  const last  = `${W},${H}`;
  const area  = `${first} ${pts} ${last}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* last dot */}
      <circle
        cx={W}
        cy={H - (data[data.length - 1] / max) * (H - 4) - 2}
        r="3"
        fill={color}
      />
    </svg>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, organizations(name)")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/auth/kayit");
  const orgId = member.org_id;
  const orgName = (member as { org_id: string; organizations?: { name?: string } }).organizations?.name ?? "İşletmeniz";

  const now = new Date();
  const todayStart  = startOfDay(now).toISOString();
  const todayEnd    = endOfDay(now).toISOString();
  const weekStart   = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd     = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart  = startOfMonth(now).toISOString();
  const monthEnd    = endOfMonth(now).toISOString();
  const day7Start   = startOfDay(subDays(now, 6)).toISOString();

  const [
    { data: todayAppts },
    { data: weekAppts },
    { data: monthRevAppts },
    { data: newCustomers },
    { data: champion },
    { data: last7 },
    userShortcuts,
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
      .select("price, tip")
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

    supabase
      .from("appointments")
      .select("appointment_at, price")
      .eq("org_id", orgId)
      .gte("appointment_at", day7Start)
      .lte("appointment_at", todayEnd)
      .eq("status", "tamamlandi"),

    getUserShortcuts(),
  ]);

  type ApptRow = { price: number; tip?: number; status: string };
  type Last7Row = { appointment_at: string; price: number };

  const toApptRows = (arr: unknown[] | null): ApptRow[] =>
    (arr ?? []) as unknown as ApptRow[];

  /* Revenue calcs */
  const todayRows = toApptRows(todayAppts);
  const weekRows  = toApptRows(weekAppts);
  const monthRows = toApptRows(monthRevAppts);

  const todayRevenue = todayRows
    .filter((a) => a.status === "tamamlandi")
    .reduce((s, a) => s + Number(a.price) + Number(a.tip ?? 0), 0);

  const weekRevenue = weekRows
    .filter((a) => a.status === "tamamlandi")
    .reduce((s, a) => s + Number(a.price), 0);

  const monthRevenue = monthRows
    .reduce((s, a) => s + Number(a.price), 0);

  const pendingCount = todayRows.filter((a) => a.status === "talep").length;

  /* Last 7 days sparkline data */
  const dailyRev: number[] = Array(7).fill(0);
  ((last7 as unknown as Last7Row[]) ?? []).forEach((a) => {
    const diff = differenceInCalendarDays(new Date(a.appointment_at), subDays(now, 6));
    if (diff >= 0 && diff < 7) dailyRev[diff] += Number(a.price);
  });
  const sparkData = dailyRev;

  const completedThisWeek = weekRows.filter((a) => a.status === "tamamlandi").length;

  const newCustCount = (newCustomers as unknown as { count: number } | null)?.count ?? 0;

  type FullAppt = Appointment & {
    staff?: { full_name: string; avatar_url?: string };
    service?: { name: string; duration_minutes: number };
  };
  const displayAppts = (todayAppts ?? []).slice(0, 5) as FullAppt[];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Dashboard Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{
          borderBottom: "1px solid color-mix(in oklch, var(--border) 60%, transparent)",
          background: "color-mix(in oklch, var(--card) 80%, transparent)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Live pulse */}
          <span
            className="w-2 h-2 rounded-full pulse-live"
            style={{ background: "#10b981", boxShadow: "0 0 8px #10b98180" }}
          />
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none text-foreground uppercase">
              {orgName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(now, "d MMMM yyyy, EEEE", { locale: tr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <Link
              href="/dashboard/randevular"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#f59e0b",
              }}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingCount} onay bekliyor
            </Link>
          )}
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: "var(--primary)" }}
          >
            <LiveClock />
          </div>
        </div>
      </header>

      {/* ── 4-Panel Grid ────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">

        {/* Panel 1 — Aktif Randevular */}
        <GlassCard3D className="glass-card" glow intensity={5}>
          {/* Header */}
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
              >
                <Calendar className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
              </div>
              <span className="text-sm font-semibold text-foreground">Aktif Randevular</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/randevular"
                className="text-[11px] font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                style={{ color: "var(--primary)" }}
              >
                Tümü <ArrowUpRight className="h-3 w-3" />
              </Link>
              <button className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Big counter */}
          <div className="px-5 pt-4 pb-2 flex items-end gap-3">
            <span className="stat-number" style={{ color: "var(--primary)" }}>
              {(todayAppts ?? []).length}
            </span>
            <div className="pb-1">
              <p className="text-xs text-muted-foreground font-medium">randevu bugün</p>
              <p className="text-xs text-muted-foreground">
                ₺{todayRevenue.toLocaleString()} ciro
              </p>
            </div>
          </div>

          {/* Appointments list */}
          <div className="px-3 pb-4 space-y-1">
            {displayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Bugün randevu yok</p>
              </div>
            ) : (
              displayAppts.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/dashboard/randevular/${appt.id}`}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <span className={cn("status-dot", STATUS_DOT[appt.status] ?? "done")} />
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-xs font-bold tabular-nums text-foreground">
                      {format(new Date(appt.appointment_at), "HH:mm")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{appt.duration_minutes}dk</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {appt.customer_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {appt.service?.name}
                      {appt.staff?.full_name ? ` • ${appt.staff.full_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">
                      ₺{Number(appt.price).toLocaleString()}
                    </p>
                    <p
                      className="text-[10px] font-medium"
                      style={{
                        color:
                          appt.status === "talep" ? "#f59e0b"
                          : appt.status === "onaylandi" ? "#10b981"
                          : appt.status === "tamamlandi" ? "#6366f1"
                          : "#ef4444",
                      }}
                    >
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </p>
                  </div>
                </Link>
              ))
            )}
            {(todayAppts ?? []).length > 5 && (
              <Link
                href="/dashboard/randevular"
                className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                +{(todayAppts ?? []).length - 5} daha →
              </Link>
            )}
          </div>
        </GlassCard3D>

        {/* Panel 2 — Haftalık Özet + Sparkline */}
        <GlassCard3D className="glass-card" glow intensity={5}>
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.15)" }}
              >
                <TrendingUp className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
              </div>
              <span className="text-sm font-semibold text-foreground">Gelir Özeti</span>
            </div>
            <button className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pt-4 pb-3">
            {/* Main stat */}
            <div className="flex items-end gap-3 mb-4">
              <span className="stat-number" style={{ color: "#10b981" }}>
                ₺{weekRevenue.toLocaleString()}
              </span>
              <div className="pb-1">
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                  <ArrowUpRight className="h-3 w-3" />
                  Bu Hafta
                </span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mb-4">
              <Sparkline data={sparkData} color="#10b981" />
              <div className="flex justify-between mt-1">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d, i) => (
                  <span key={i} className="text-[9px] text-muted-foreground">{d}</span>
                ))}
              </div>
            </div>

            {/* Sub-stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Aylık Ciro", value: `₺${monthRevenue.toLocaleString()}`, color: "#6366f1" },
                { label: "Bu Hafta",   value: `${completedThisWeek} randevu`,              color: "#f59e0b" },
                { label: "Yeni Müşteri", value: `${newCustCount}`,                        color: "var(--primary)" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3"
                  style={{ background: "color-mix(in oklch, var(--muted) 60%, transparent)" }}
                >
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">{s.label}</p>
                  <p className="text-sm font-bold truncate" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard3D>

        {/* Panel 3 — Hızlı İşlemler */}
        <QuickActionsPanel initialShortcuts={userShortcuts} orgId={orgId} />

        {/* Panel 4 — Haftanın Elemanı + Bekleyenler */}
        <GlassCard3D className="glass-card" glow intensity={5}>
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.15)" }}
              >
                <Star className="h-3.5 w-3.5 fill-amber-400" style={{ color: "#f59e0b" }} />
              </div>
              <span className="text-sm font-semibold text-foreground">Performans</span>
            </div>
            <button className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Champion */}
            {champion ? (
              <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">
                  ⭐ Haftanın Elemanı
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                      boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
                    }}
                  >
                    {(champion as StaffPerformanceWeekly & { staff?: { full_name: string } })
                      .staff?.full_name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-base leading-tight truncate">
                      {(champion as StaffPerformanceWeekly & { staff?: { full_name: string } }).staff?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(champion as StaffPerformanceWeekly).appointments_done} randevu •{" "}
                      ₺{Number((champion as StaffPerformanceWeekly).total_revenue).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-amber-400/70 font-medium uppercase tracking-wide">Ciro</p>
                    <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>
                      ₺{Number((champion as StaffPerformanceWeekly).total_revenue).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "color-mix(in oklch, var(--muted) 50%, transparent)",
                  border: "1px dashed color-mix(in oklch, var(--border) 60%, transparent)",
                }}
              >
                <Star className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Henüz performans verisi yok</p>
              </div>
            )}

            {/* Quick stats */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bugün Durum
              </p>
              {[
                {
                  icon: Clock,
                  label: "Bekleyen",
                  value: pendingCount,
                  color: "#f59e0b",
                  bg: "rgba(245,158,11,0.1)",
                },
                {
                  icon: CheckCircle2,
                  label: "Tamamlanan",
                  value: (todayAppts ?? []).filter((a: ApptRow) => a.status === "tamamlandi").length,
                  color: "#10b981",
                  bg: "rgba(16,185,129,0.1)",
                },
                {
                  icon: Users,
                  label: "Toplam Bugün",
                  value: (todayAppts ?? []).length,
                  color: "var(--primary)",
                  bg: "color-mix(in oklch, var(--primary) 10%, transparent)",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: stat.bg, border: `1px solid ${stat.color}20` }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: stat.color }} />
                    <span className="text-sm text-foreground flex-1">{stat.label}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Go to reports */}
            <Link
              href="/dashboard/raporlar"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-full"
              style={{
                background: "color-mix(in oklch, var(--primary) 10%, transparent)",
                border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                color: "var(--primary)",
              }}
            >
              <BarChart3 className="h-4 w-4" />
              Detaylı Raporları Gör
            </Link>
          </div>
        </GlassCard3D>

      </div>

      {/* ── Destek Kartı ─────────────────────────────────────────────── */}
      <div className="px-5 pb-5">
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: "color-mix(in oklch, var(--card) 80%, transparent)",
            border: "1px solid color-mix(in oklch, var(--border) 60%, transparent)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)" }}
            >
              <HeadphonesIcon className="h-5 w-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Destek Al</p>
              <p className="text-xs text-muted-foreground">
                Bir sorun mu yaşıyorsunuz? Ekibimize hemen ulaşın.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "905355032634"}?text=Merhaba%2C%20Siriplan%20hakk%C4%B1nda%20yard%C4%B1m%20almak%20istiyorum.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.3)",
                color: "#25d366",
              }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href="mailto:destek@bysirius.com?subject=Siriplan%20Destek%20Talebi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: "color-mix(in oklch, var(--muted) 70%, transparent)",
                border: "1px solid color-mix(in oklch, var(--border) 80%, transparent)",
                color: "var(--foreground)",
              }}
            >
              <Mail className="h-4 w-4" />
              E-posta
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

