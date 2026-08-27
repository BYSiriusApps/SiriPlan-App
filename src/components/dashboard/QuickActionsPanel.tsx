"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2, Users, Calendar, BookOpen, Megaphone, BarChart3,
  Scissors, UserCog, Wallet, Settings, CreditCard, Zap, Star,
  MessageSquare, TrendingUp, LayoutDashboard, UserPlus, Plus,
  X, ArrowUp, ArrowDown, MoreHorizontal, ArrowUpRight, Save, RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveUserShortcuts, type ShortcutItem } from "@/app/actions/shortcuts";

// href → dashboard çeviri anahtarı. Etiketler DB'ye Türkçe olarak kaydedilir
// (geriye dönük uyumluluk) ama ekranda her zaman bu eşlemeden, aktif dile
// göre üretilir — kayıtlı `label` sadece eşlemede olmayan durumlar için yedek.
const SHORTCUT_LABEL_KEYS: Record<string, string> = {
  "/dashboard": "overview",
  "/dashboard/randevular?new=1": "newAppointment",
  "/dashboard/takvim": "calendar",
  "/dashboard/randevular": "appointments",
  "/dashboard/musteriler": "customers",
  "/dashboard/musteriler?new=1": "newCustomer",
  "/dashboard/personel": "staff",
  "/dashboard/hizmetler": "services",
  "/dashboard/kampanyalar": "campaigns",
  "/dashboard/raporlar": "reports",
  "/dashboard/gelir-gider": "income",
  "/dashboard/ayarlar": "settings",
  "/dashboard/abonelik": "subscription",
};

/* ── Icon registry ─────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2, Users, Calendar, BookOpen, Megaphone, BarChart3,
  Scissors, UserCog, Wallet, Settings, CreditCard, Zap, Star,
  MessageSquare, TrendingUp, LayoutDashboard, UserPlus, Plus,
};

/* ── All pickable destinations ─────────────────────────────────────────── */
export const ALL_SHORTCUTS: Omit<ShortcutItem, "order_index">[] = [
  { href: "/dashboard",                  label: "Genel Bakış",   icon_name: "LayoutDashboard", color: "var(--primary)"  },
  { href: "/dashboard/randevular?new=1", label: "Yeni Randevu",  icon_name: "CheckCircle2",    color: "var(--primary)"  },
  { href: "/dashboard/takvim",           label: "Takvim",         icon_name: "Calendar",        color: "#10b981"         },
  { href: "/dashboard/randevular",       label: "Randevular",     icon_name: "BookOpen",        color: "#6366f1"         },
  { href: "/dashboard/musteriler",       label: "Müşteriler",     icon_name: "Users",           color: "#6366f1"         },
  { href: "/dashboard/musteriler?new=1", label: "Yeni Müşteri",  icon_name: "UserPlus",        color: "#10b981"         },
  { href: "/dashboard/personel",         label: "Personel",       icon_name: "UserCog",         color: "#8b5cf6"         },
  { href: "/dashboard/hizmetler",        label: "Hizmetler",      icon_name: "Scissors",        color: "#ec4899"         },
  { href: "/dashboard/kampanyalar",      label: "Kampanyalar",    icon_name: "Megaphone",       color: "#f59e0b"         },
  { href: "/dashboard/raporlar",         label: "Raporlar",       icon_name: "BarChart3",       color: "#ec4899"         },
  { href: "/dashboard/gelir-gider",      label: "Gelir & Gider",  icon_name: "Wallet",          color: "#10b981"         },
  { href: "/dashboard/ayarlar",          label: "Ayarlar",        icon_name: "Settings",        color: "#8b5cf6"         },
  { href: "/dashboard/abonelik",         label: "Abonelik",       icon_name: "CreditCard",      color: "#6366f1"         },
];

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { href: "/dashboard/randevular?new=1", label: "Yeni Randevu",  icon_name: "CheckCircle2", color: "var(--primary)", order_index: 0 },
  { href: "/dashboard/musteriler?new=1", label: "Yeni Müşteri",  icon_name: "UserPlus",     color: "#6366f1",        order_index: 1 },
  { href: "/dashboard/takvim",           label: "Takvim",         icon_name: "Calendar",     color: "#10b981",        order_index: 2 },
  { href: "/dashboard/kampanyalar",      label: "Kampanyalar",    icon_name: "Megaphone",    color: "#f59e0b",        order_index: 3 },
  { href: "/dashboard/raporlar",         label: "Raporlar",       icon_name: "BarChart3",    color: "#ec4899",        order_index: 4 },
  { href: "/dashboard/ayarlar",          label: "Ayarlar",        icon_name: "Settings",     color: "#8b5cf6",        order_index: 5 },
];

/* ── Props ─────────────────────────────────────────────────────────────── */
interface Props {
  initialShortcuts: ShortcutItem[];
  orgId: string;
  role?: string;
}

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };
function canAccess(href: string, role: string) {
  let minRole = "staff";
  if (href.startsWith("/dashboard/ayarlar") || href.startsWith("/dashboard/abonelik")) {
    minRole = "owner";
  } else if (
    href.startsWith("/dashboard/personel") ||
    href.startsWith("/dashboard/hizmetler") ||
    href.startsWith("/dashboard/kampanyalar") ||
    href.startsWith("/dashboard/raporlar") ||
    href.startsWith("/dashboard/gelir-gider")
  ) {
    minRole = "manager";
  }
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

/* ── Component ─────────────────────────────────────────────────────────── */
export function QuickActionsPanel({ initialShortcuts, orgId, role = "staff" }: Props) {
  const t = useTranslations("dashboard");
  const labelFor = (item: { href: string; label: string }) => {
    const key = SHORTCUT_LABEL_KEYS[item.href];
    return key ? t(key) : item.label;
  };

  const filteredInitial = initialShortcuts.filter((s) => canAccess(s.href, role));
  const filteredDefault = DEFAULT_SHORTCUTS.filter((s) => canAccess(s.href, role));
  const saved = filteredInitial.length > 0 ? filteredInitial : filteredDefault;
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(saved);
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const moveUp = (i: number) => {
    if (i === 0) return;
    setShortcuts((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setShortcuts((prev) => {
      if (i === prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const remove = (i: number) => {
    setShortcuts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addShortcut = (item: Omit<ShortcutItem, "order_index">) => {
    if (shortcuts.some((s) => s.href === item.href)) return;
    setShortcuts((prev) => [...prev, { ...item, order_index: prev.length }]);
    setShowPicker(false);
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveUserShortcuts(orgId, shortcuts);
      if (result.error) {
        toast.error(t("quickActions.saveFailed") + ": " + result.error);
      } else {
        toast.success(t("quickActions.saved"));
        setEditMode(false);
      }
    });
  };

  const cancel = () => {
    setShortcuts(saved);
    setEditMode(false);
  };

  const available = ALL_SHORTCUTS.filter((a) => canAccess(a.href, role) && !shortcuts.some((s) => s.href === a.href));

  return (
    <>
      <GlassCard3D className="glass-card" glow intensity={5}>
        {/* Header */}
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)" }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{t("quickActions.title")}</span>
            {editMode && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}
              >
                {t("quickActions.editing")}
              </span>
            )}
          </div>

          <button
            onClick={() => (editMode ? cancel() : setEditMode(true))}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground"
            title={editMode ? t("quickActions.cancel") : t("quickActions.personalize")}
          >
            {editMode ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
          </button>
        </div>

        {/* Edit mode toolbar */}
        {editMode && (
          <div
            className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <button
              onClick={() => setShowPicker(true)}
              disabled={available.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("quickActions.addShortcut")}
            </button>
            <div className="flex-1" />
            <button
              onClick={cancel}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t("quickActions.cancel")}
            </button>
            <button
              onClick={save}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{ background: "#6366f1", color: "white" }}
            >
              <Save className="h-3.5 w-3.5" />
              {isPending ? t("quickActions.saving") : t("quickActions.save")}
            </button>
          </div>
        )}

        {/* Shortcut list */}
        <div className="px-4 py-3 space-y-1.5">
          {shortcuts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-8 rounded-xl text-center"
              style={{
                background: "color-mix(in oklch, var(--muted) 40%, transparent)",
                border: "1px dashed color-mix(in oklch, var(--border) 60%, transparent)",
              }}
            >
              <Zap className="h-6 w-6 mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">{t("quickActions.empty")}</p>
              {editMode && (
                <button
                  onClick={() => setShowPicker(true)}
                  className="mt-2 text-xs font-medium"
                  style={{ color: "#6366f1" }}
                >
                  + {t("quickActions.addShortcut")}
                </button>
              )}
            </div>
          ) : (
            shortcuts.map((action, i) => {
              const Icon = ICON_MAP[action.icon_name] ?? Zap;
              const bg = action.color === "var(--primary)"
                ? "color-mix(in oklch, var(--primary) 12%, transparent)"
                : `${action.color}1F`;

              if (editMode) {
                return (
                  <div
                    key={action.href + i}
                    className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{
                      background: "color-mix(in oklch, var(--muted) 40%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--border) 50%, transparent)",
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: bg }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: action.color }} />
                    </div>

                    {/* Label */}
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {labelFor(action)}
                    </span>

                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === shortcuts.length - 1}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => remove(i)}
                      className="p-1 rounded-lg transition-colors"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <Link
                  key={action.href + i}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = bg;
                    el.style.borderColor = `${action.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "transparent";
                    el.style.borderColor = "transparent";
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: bg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none">
                      {labelFor(action)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </Link>
              );
            })
          )}
        </div>

        {/* Personalize hint (view mode only) */}
        {!editMode && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setEditMode(true)}
              className="w-full text-center text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors py-1"
            >
              {t("quickActions.personalize")} ···
            </button>
          </div>
        )}
      </GlassCard3D>

      {/* Shortcut picker dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{t("quickActions.pickerTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("quickActions.allAdded")}
              </p>
            ) : (
              available.map((item) => {
                const Icon = ICON_MAP[item.icon_name] ?? Zap;
                const bg = item.color === "var(--primary)"
                  ? "color-mix(in oklch, var(--primary) 12%, transparent)"
                  : `${item.color}1F`;
                return (
                  <button
                    key={item.href}
                    onClick={() => addShortcut(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = bg;
                      el.style.borderColor = `${item.color}40`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "transparent";
                      el.style.borderColor = "transparent";
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: bg }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{labelFor(item)}</span>
                    <Plus className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
