"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, BookOpen, Users, Settings } from "lucide-react";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { LanguagePicker } from "@/components/layout/LanguagePicker";
import { LogoutButtonMobile } from "@/components/dashboard/LogoutButton";

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };

const MOBILE_NAV = [
  { href: "/dashboard",            icon: LayoutDashboard, tKey: "overviewShort", minRole: "staff" },
  { href: "/dashboard/takvim",     icon: Calendar,        tKey: "calendar",      minRole: "staff" },
  { href: "/dashboard/randevular", icon: BookOpen,        tKey: "appointments",  minRole: "staff" },
  { href: "/dashboard/musteriler", icon: Users,           tKey: "customers",     minRole: "staff" },
  { href: "/dashboard/ayarlar",    icon: Settings,        tKey: "settings",      minRole: "owner" },
];

export function MobileNav({ role = "staff" }: { role?: string }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const userRank = ROLE_RANK[role] ?? 0;
  const visible = MOBILE_NAV.filter(item => userRank >= (ROLE_RANK[item.minRole] ?? 0));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-sidebar border-t border-sidebar-border safe-bottom">
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
            <span>{t(item.tKey)}</span>
          </Link>
        );
      })}

      <div className="flex-1 flex flex-col items-center justify-center py-1">
        <LanguagePicker variant="muted" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-1">
        <ThemePicker />
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{t("theme")}</span>
      </div>

      <LogoutButtonMobile />
    </nav>
  );
}
