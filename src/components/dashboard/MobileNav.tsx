"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, BookOpen, Users, Settings
} from "lucide-react";

const MOBILE_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Özet" },
  { href: "/dashboard/takvim", icon: Calendar, label: "Takvim" },
  { href: "/dashboard/randevular", icon: BookOpen, label: "Randevular" },
  { href: "/dashboard/musteriler", icon: Users, label: "Müşteriler" },
  { href: "/dashboard/ayarlar", icon: Settings, label: "Ayarlar" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-card border-t border-border safe-bottom">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href ||
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
    </nav>
  );
}
