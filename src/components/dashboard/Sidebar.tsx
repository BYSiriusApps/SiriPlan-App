"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, BookOpen, Users, UserCog,
  Scissors, Megaphone, BarChart3, Import, Settings,
  CreditCard, Wallet, ChevronRight, ShieldCheck, ListPlus, Globe, Inbox, Package,
  HelpCircle,
} from "lucide-react";
import { OrgSwitcher } from "@/components/dashboard/OrgSwitcher";
import { Badge } from "@/components/ui/badge";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { LanguagePicker } from "@/components/layout/LanguagePicker";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { LegalNoticeModal } from "@/components/dashboard/LegalNoticeModal";

// roles: "owner" | "manager" | "staff"
// minRole: who can see this item (owner > manager > staff)
const NAV_ITEMS = [
  { href: "/dashboard",               icon: LayoutDashboard, tKey: "overview",       minRole: "staff"   },
  { href: "/dashboard/takvim",        icon: Calendar,        tKey: "calendar",       minRole: "staff"   },
  { href: "/dashboard/randevular",    icon: BookOpen,        tKey: "appointments",   minRole: "staff"   },
  { href: "/dashboard/bekleme-listesi", icon: ListPlus,      tKey: "waitlistAndApprovals", minRole: "staff"   },
  { href: "/dashboard/bekleyen-istekler", icon: Inbox,       tKey: "pendingRequests", minRole: "staff", planRequired: "business" },
  { href: "/dashboard/musteriler",    icon: Users,           tKey: "customers",      minRole: "staff"   },
  { href: "/dashboard/hizmetler",     icon: Scissors,        tKey: "services",       minRole: "manager" },
  { href: "/dashboard/personel",      icon: UserCog,         tKey: "staff",          minRole: "manager" },
  { href: "/dashboard/kampanyalar",   icon: Megaphone,       tKey: "campaigns",      badge: "Pro", minRole: "manager" },
  { href: "/dashboard/website-ayarlari", icon: Globe,        tKey: "websiteSettings", badge: "Pro", minRole: "manager" },
  { href: "/dashboard/raporlar",      icon: BarChart3,       tKey: "reports",        minRole: "manager" },
  { href: "/dashboard/gelir-gider",   icon: Wallet,          tKey: "income",         minRole: "manager" },
  { href: "/dashboard/stok",          icon: Package,         tKey: "stock",         minRole: "staff"   },
  { href: "/dashboard/veri-gocu",     icon: Import,          tKey: "dataMigration",  minRole: "manager" },
  { href: "/dashboard/ayarlar",       icon: Settings,        tKey: "settings",       minRole: "manager" },
  { href: "/dashboard/rehber",        icon: HelpCircle,      tKey: "guide",          minRole: "staff"   },
  { href: "/dashboard/abonelik",      icon: CreditCard,      tKey: "subscription",   minRole: "owner"   },
];

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };
function canSee(userRole: string, minRole: string) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

const PLAN_COLORS: Record<string, string> = {
  trial:    "color-mix(in oklch, var(--sidebar-foreground) 12%, transparent)",
  starter:  "rgba(99,102,241,0.25)",
  pro:      "color-mix(in oklch, var(--sidebar-primary) 25%, transparent)",
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
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const daysLeft = trialDaysLeft(trialEndsAt);
  const planLabel =
    plan === "trial"
      ? (daysLeft !== null ? t("trialDaysLeft", { days: daysLeft }) : t("trial"))
      : plan === "starter" ? "⚡ Starter"
      : plan === "pro"     ? "✨ Pro Plan"
      : plan === "business"? "🏢 Business"
      : t("trial");
  const planColor = PLAN_COLORS[plan] ?? PLAN_COLORS.trial;

  const visibleItems = NAV_ITEMS.filter(item =>
    canSee(role, item.minRole) && (!("planRequired" in item) || item.planRequired === plan)
  );

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo + org name */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          {/* Siriplan logo */}
          <img
            src="/icons/icon-mark.png"
            alt="Siriplan"
            className="w-9 h-9 rounded-xl shrink-0 group-hover:scale-105 transition-transform"
            style={{ boxShadow: "0 0 20px color-mix(in oklch, var(--sidebar-primary) 40%, transparent)" }}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-sidebar-foreground/45 uppercase tracking-[0.2em] leading-none mb-1.5">Siriplan</p>
            <p className="font-heading text-[15px] font-semibold text-sidebar-foreground truncate leading-none">{orgName}</p>
          </div>
        </Link>
      </div>

      {/* Plan badge */}
      <div className="px-4 py-3 space-y-2 border-b border-sidebar-border">
        <div
          className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-center text-sidebar-foreground/80 border border-sidebar-border"
          style={{ background: planColor }}
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
      <div className="pt-2 border-b border-sidebar-border">
        <GlobalSearch />
      </div>

      {/* Navigation */}
      {role === "staff" && (
        <div className="mx-3 mt-2 mb-1 px-3 py-1.5 rounded-lg text-[10px] font-medium text-sidebar-foreground/50 text-center bg-sidebar-accent/40 border border-sidebar-border">
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
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
              )}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? "var(--sidebar-primary)" : "inherit" }}
              />
              <span className="flex-1 truncate">{("label" in item && typeof item.label === "string" ? item.label : t(item.tKey))}</span>
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
                <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "var(--sidebar-primary)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — theme picker */}
      <div className="px-4 py-4 space-y-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setIsLegalOpen(true)}
            className="text-[10px] text-sidebar-foreground/40 hover:text-primary font-medium tracking-wide flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Yasal & Telif</span>
          </button>
          <div className="flex items-center gap-1">
            <LanguagePicker />
            <ThemePicker />
          </div>
        </div>

        <LogoutButton />
      </div>
      <LegalNoticeModal isOpen={isLegalOpen} onOpenChange={setIsLegalOpen} />
    </aside>
  );
}
