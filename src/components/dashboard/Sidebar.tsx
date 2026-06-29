"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, BookOpen, Users, UserCog,
  Scissors, Megaphone, BarChart3, Import, Settings,
  CreditCard, Wallet, ExternalLink, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemePicker } from "@/components/layout/ThemePicker";

const NAV_ITEMS = [
  { href: "/dashboard",               icon: LayoutDashboard, label: "Genel Bakış" },
  { href: "/dashboard/takvim",        icon: Calendar,        label: "Takvim" },
  { href: "/dashboard/randevular",    icon: BookOpen,        label: "Randevular" },
  { href: "/dashboard/musteriler",    icon: Users,           label: "Müşteriler" },
  { href: "/dashboard/personel",      icon: UserCog,         label: "Personel" },
  { href: "/dashboard/hizmetler",     icon: Scissors,        label: "Hizmetler" },
  { href: "/dashboard/kampanyalar",   icon: Megaphone,       label: "Kampanyalar", badge: "Pro" },
  { href: "/dashboard/raporlar",      icon: BarChart3,       label: "Raporlar" },
  { href: "/dashboard/gelir-gider",   icon: Wallet,          label: "Gelir & Gider" },
  { href: "/dashboard/veri-gocu",     icon: Import,          label: "Veri Göçü" },
  { href: "/dashboard/ayarlar",       icon: Settings,        label: "Ayarlar" },
  { href: "/dashboard/abonelik",      icon: CreditCard,      label: "Abonelik" },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  trial:    { label: "⏱ 14 Gün Deneme", color: "rgba(255,255,255,0.12)" },
  starter:  { label: "⚡ Starter",        color: "rgba(99,102,241,0.25)" },
  pro:      { label: "✨ Pro Plan",        color: "rgba(var(--primary-raw,236 72 153),0.25)" },
  business: { label: "🏢 Business",       color: "rgba(168,85,247,0.25)" },
};

interface SidebarProps {
  orgName?: string;
  plan?: string;
}

export function Sidebar({ orgName = "Salonunuz", plan = "trial" }: SidebarProps) {
  const pathname = usePathname();
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.trial;

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
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-center text-white/70"
          style={{ background: planInfo.color, border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {planInfo.label}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
              <span className="flex-1 truncate">{item.label}</span>
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
              Web Sitesi Lazım mı?
            </p>
            <p className="text-[10px] text-white/35 truncate">bysirius.com</p>
          </div>
          <ExternalLink className="h-3 w-3 text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
        </a>

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-white/25 font-medium tracking-wide">
            by <span className="text-white/50">BySirius</span>
          </span>
          <ThemePicker />
        </div>
      </div>
    </aside>
  );
}
