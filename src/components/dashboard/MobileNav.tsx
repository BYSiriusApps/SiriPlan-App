"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, BookOpen, Users, Settings } from "lucide-react";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { LogoutButtonMobile } from "@/components/dashboard/LogoutButton";

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };

const MOBILE_NAV = [
  { href: "/dashboard",           icon: LayoutDashboard, label: "Özet",      minRole: "staff" },
  { href: "/dashboard/takvim",    icon: Calendar,        label: "Takvim",    minRole: "staff" },
  { href: "/dashboard/randevular",icon: BookOpen,        label: "Randevular",minRole: "staff" },
  { href: "/dashboard/musteriler",icon: Users,           label: "Müşteriler",minRole: "staff" },
  { href: "/dashboard/ayarlar",   icon: Settings,        label: "Ayarlar",   minRole: "owner" },
];

export function MobileNav({ role = "staff" }: { role?: string }) {
  const pathname = usePathname();
  const userRank = ROLE_RANK[role] ?? 0;
  const visible = MOBILE_NAV.filter(item => userRank >= (ROLE_RANK[item.minRole] ?? 0));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-card border-t border-border safe-bottom">
      {visible.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="flex-1 flex flex-col items-center justify-center py-1">
        <ThemePicker />
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Tema</span>
      </div>

      <LogoutButtonMobile />
    </nav>
  );
}
