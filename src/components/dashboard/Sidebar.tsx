"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, BookOpen, Users, UserCog,
  Scissors, Megaphone, BarChart3, Import, Settings,
  CreditCard, Wallet, ExternalLink, ChevronRight, ShieldCheck,
} from "lucide-react";
import { OrgSwitcher } from "@/components/dashboard/OrgSwitcher";
import { Badge } from "@/components/ui/badge";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { LanguagePicker } from "@/components/layout/LanguagePicker";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";

// roles: "owner" | "manager" | "staff"
// minRole: who can see this item (owner > manager > staff)
const NAV_ITEMS = [
  { href: "/dashboard",               icon: LayoutDashboard, tKey: "overview",       minRole: "staff"   },
  { href: "/dashboard/takvim",        icon: Calendar,        tKey: "calendar",       minRole: "staff"   },
  { href: "/dashboard/randevular",    icon: BookOpen,        tKey: "appointments",   minRole: "staff"   },
  { href: "/dashboard/musteriler",    icon: Users,           tKey: "customers",      minRole: "staff"   },
  { href: "/dashboard/personel",      icon: UserCog,         tKey: "staff",          minRole: "staff"   },
  { href: "/dashboard/hizmetler",     icon: Scissors,        tKey: "services",       minRole: "staff"   },
  { href: "/dashboard/kampanyalar",   icon: Megaphone,       tKey: "campaigns",      badge: "Pro", minRole: "manager" },
  { href: "/dashboard/raporlar",      icon: BarChart3,       tKey: "reports",        minRole: "manager" },
  { href: "/dashboard/gelir-gider",   icon: Wallet,          tKey: "income",         minRole: "manager" },
  { href: "/dashboard/veri-gocu",     icon: Import,          tKey: "dataMigration",  minRole: "manager" },
  { href: "/dashboard/ayarlar",       icon: Settings,        tKey: "settings",       minRole: "owner"   },
  { href: "/dashboard/abonelik",      icon: CreditCard,      tKey: "subscription",   minRole: "owner"   },
];

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };
function canSee(userRole: string, minRole: string) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

const PLAN_COLORS: Record<string, string> = {
  trial:    "rgba(255,255,255,0.12)",
  starter:  "rgba(99,102,241,0.25)",
  pro:      "rgba(var(--primary-raw,236 72 153),0.25)",
  business: "rgba(168,85,247,0.25)",
};

function trialDaysLeft(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

interface SidebarProps {
  orgName?: string;
  plan?: string;
  role?: string;
  trialEndsAt?: string;
  activeOrgId?: string;
  memberships?: { org_id: string; role: string; org_name: string }[];
  isPlatformAdmin?: boolean;
}

export function Sidebar({
  orgName = "Salonunuz",
  plan = "trial",
  role = "staff",
  trialEndsAt,
  activeOrgId,
  memberships = [],
  isPlatformAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");

  const daysLeft = trialDaysLeft(trialEndsAt);
  const planLabel =
    plan === "trial"
      ? (daysLeft !== null ? t("trialDaysLeft", { days: daysLeft }) : t("trial"))
      : plan === "starter" ? "⚡ Starter"
      : plan === "pro"     ? "✨ Pro Plan"
      : plan === "business"? "🏢 Business"
      : t("trial");
  const planColor = PLAN_COLORS[plan] ?? PLAN_COLORS.trial;

  const visibleItems = NAV_ITEMS.filter(item => canSee(role, item.minRole));

  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0d0e14 0%, #0b0c11 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo + org name */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          {/* BY logo */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 group-hover:scale-105 transition-transform"
            style={{
              background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 60%, oklch(0.50 0.15 280)))",
              boxShadow: "0 0 20px color-mix(in oklch, var(--primary) 40%, transparent)",
            }}
          >
            BY
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest leading-none mb-1">Siriplan</p>
            <p className="text-sm font-semibold text-white/90 truncate leading-none">{orgName}</p>
          </div>
        </Link>
      </div>

      {/* Plan badge */}
      <div className="px-4 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-center text-white/70"
          style={{ background: planColor, border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {planLabel}
        </div>
        {activeOrgId && memberships.length > 1 && (
          <OrgSwitcher activeOrgId={activeOrgId} memberships={memberships} />
        )}
        {isPlatformAdmin && (
          <Link
            href="/admin"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-300/80 hover:text-amber-200 transition-colors"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Platform Admin</span>
          </Link>
        )}
      </div>

      {/* Smart Search */}
      <div className="pt-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <GlobalSearch />
      </div>

      {/* Navigation */}
      {role === "staff" && (
        <div className="mx-3 mt-2 mb-1 px-3 py-1.5 rounded-lg text-[10px] font-medium text-white/40 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {t("staffView")}
        </div>
      )}

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-white"
                  : "text-white/45 hover:text-white/80"
              )}
              style={
                isActive
                  ? {
                      background: "color-mix(in oklch, var(--primary) 18%, rgba(255,255,255,0.03))",
                      boxShadow: "inset 3px 0 0 var(--primary)",
                    }
                  : { background: "transparent" }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? "var(--primary)" : "inherit" }}
              />
              <span className="flex-1 truncate">{t(item.tKey)}</span>
              {item.badge && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{
                    background: "color-mix(in oklch, var(--primary) 20%, transparent)",
                    color: "var(--primary)",
                    border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
                  }}
                >
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "var(--primary)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — BySirius + theme picker */}
      <div className="px-4 py-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <a
          href="https://bysirius.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 p-2.5 rounded-xl group transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 60%, oklch(0.50 0.15 280)))",
            }}
          >
            BY
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white/70 leading-none mb-0.5">
              {t("websitePromo")}
            </p>
            <p className="text-[10px] text-white/35 truncate">bysirius.com</p>
          </div>
          <ExternalLink className="h-3 w-3 text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
        </a>

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-white/25 font-medium tracking-wide">
            by <span className="text-white/50">BySirius</span>
          </span>
          <div className="flex items-center gap-1">
            <LanguagePicker />
            <ThemePicker />
          </div>
        </div>

        <LogoutButton />
      </div>
    </aside>
  );
}
