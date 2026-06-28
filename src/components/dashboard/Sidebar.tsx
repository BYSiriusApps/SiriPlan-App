"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, BookOpen, Users, UserCog,
  Scissors, Megaphone, BarChart3, Import, Settings,
  CreditCard, ChevronRight, ExternalLink
} from "lucide-react";
import { BySiriusBadge } from "@/components/layout/BySiriusBadge";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Genel Bakış" },
  { href: "/dashboard/takvim", icon: Calendar, label: "Takvim" },
  { href: "/dashboard/randevular", icon: BookOpen, label: "Randevular" },
  { href: "/dashboard/musteriler", icon: Users, label: "Müşteriler" },
  { href: "/dashboard/personel", icon: UserCog, label: "Personel" },
  { href: "/dashboard/hizmetler", icon: Scissors, label: "Hizmetler" },
  { href: "/dashboard/kampanyalar", icon: Megaphone, label: "Kampanyalar", badge: "Pro" },
  { href: "/dashboard/raporlar", icon: BarChart3, label: "Raporlar" },
  { href: "/dashboard/veri-gocu", icon: Import, label: "Veri Göçü" },
  { href: "/dashboard/ayarlar", icon: Settings, label: "Ayarlar" },
  { href: "/dashboard/abonelik", icon: CreditCard, label: "Abonelik" },
];

interface SidebarProps {
  orgName?: string;
  plan?: string;
}

export function Sidebar({ orgName = "Salonunuz", plan = "trial" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-white font-bold">S</span>
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">Siriplan</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[130px]">{orgName}</p>
          </div>
        </Link>
      </div>

      {/* Plan badge */}
      <div className="px-5 py-3 border-b border-border">
        <Badge
          variant={plan === "trial" ? "outline" : "secondary"}
          className={cn(
            "text-xs w-full justify-center py-1",
            plan === "pro" && "bg-primary/10 text-primary border-primary/30",
            plan === "business" && "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300"
          )}
        >
          {plan === "trial" ? "⏱ 14 Gün Deneme" : plan === "starter" ? "⚡ Starter" : plan === "pro" ? "✨ Pro Plan" : "🏢 Business"}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "group-hover:text-foreground")} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{item.badge}</Badge>
              )}
              {isActive && <ChevronRight className="h-3 w-3 text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* BySirius widget */}
      <div className="p-3 border-t border-border space-y-3">
        <a
          href="https://bysirius.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-rose-50 to-fuchsia-50 dark:from-rose-950/30 dark:to-fuchsia-950/30 border border-rose-100 dark:border-rose-900/50 group hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-fuchsia-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">BY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground leading-none mb-0.5">Web Sitesi Lazım mı?</p>
            <p className="text-[10px] text-muted-foreground truncate">bysirius.com → Hizmetlerimiz</p>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </a>

        <div className="flex items-center justify-between px-1">
          <BySiriusBadge variant="sidebar" />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
