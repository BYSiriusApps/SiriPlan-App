"use client";

import Link from "next/link";
import {
  CheckCircle2, Users, Calendar, MessageSquare, TrendingUp, Sparkles,
  ArrowUpRight, Zap, MoreHorizontal,
} from "lucide-react";
import { GlassCard3D } from "@/components/ui/GlassCard3D";

const ACTIONS = [
  {
    href:  "/dashboard/randevular?new=1",
    icon:  CheckCircle2,
    label: "Yeni Randevu",
    desc:  "Randevu oluştur",
    color: "var(--primary)",
    bg:    "color-mix(in oklch, var(--primary) 12%, transparent)",
  },
  {
    href:  "/dashboard/musteriler?new=1",
    icon:  Users,
    label: "Müşteri Ekle",
    desc:  "Yeni kayıt",
    color: "#6366f1",
    bg:    "rgba(99,102,241,0.12)",
  },
  {
    href:  "/dashboard/takvim",
    icon:  Calendar,
    label: "Takvim",
    desc:  "Görünüm",
    color: "#10b981",
    bg:    "rgba(16,185,129,0.12)",
  },
  {
    href:  "/dashboard/kampanyalar",
    icon:  MessageSquare,
    label: "Kampanyalar",
    desc:  "Mesaj gönder",
    color: "#f59e0b",
    bg:    "rgba(245,158,11,0.12)",
  },
  {
    href:  "/dashboard/raporlar",
    icon:  TrendingUp,
    label: "Raporlar",
    desc:  "Analiz & İstatistik",
    color: "#ec4899",
    bg:    "rgba(236,72,153,0.12)",
  },
  {
    href:  "/dashboard/ayarlar",
    icon:  Sparkles,
    label: "Ayarlar",
    desc:  "İşletme ayarları",
    color: "#8b5cf6",
    bg:    "rgba(139,92,246,0.12)",
  },
];

export function QuickActionsPanel() {
  return (
    <GlassCard3D className="glass-card" glow intensity={5}>
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)" }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
          </div>
          <span className="text-sm font-semibold text-foreground">Hızlı İşlemler</span>
        </div>
        <button className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-2.5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
              style={{ border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = action.bg;
                el.style.borderColor = `color-mix(in oklch, ${action.color} 25%, transparent)`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "transparent";
                el.style.borderColor = "transparent";
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: action.bg }}
              >
                <Icon className="h-4 w-4" style={{ color: action.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">{action.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </GlassCard3D>
  );
}
