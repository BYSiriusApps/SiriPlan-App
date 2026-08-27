"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguagePicker } from "@/components/layout/LanguagePicker";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { LogoutButtonMobile } from "@/components/dashboard/LogoutButton";
import { useAiAssistant } from "@/components/dashboard/AiAssistantContext";
import { cn } from "@/lib/utils";
import {
  Menu, Bot, Link2, Copy, Check, MessageCircle,
  UserCog, Scissors, ListPlus, Megaphone, Globe, BarChart3, Wallet, Import, CreditCard, Inbox, Package,
  Calendar, BookOpen, Users, HelpCircle,
} from "lucide-react";

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };

const SECONDARY_NAV = [
  { href: "/dashboard/takvim", icon: Calendar, tKey: "calendar", minRole: "staff" },
  { href: "/dashboard/randevular", icon: BookOpen, tKey: "appointments", minRole: "staff" },
  { href: "/dashboard/musteriler", icon: Users, tKey: "customers", minRole: "staff" },
  { href: "/dashboard/bekleyen-istekler", icon: Inbox, tKey: "pendingRequests", minRole: "staff", planRequired: "business" },
  { href: "/dashboard/personel", icon: UserCog, tKey: "staff", minRole: "manager" },
  { href: "/dashboard/hizmetler", icon: Scissors, tKey: "services", minRole: "staff" },
  { href: "/dashboard/bekleme-listesi", icon: ListPlus, tKey: "waitlistAndApprovals", minRole: "staff" },
  { href: "/dashboard/kampanyalar", icon: Megaphone, tKey: "campaigns", minRole: "manager" },
  { href: "/dashboard/website-ayarlari", icon: Globe, tKey: "websiteSettings", minRole: "manager" },
  { href: "/dashboard/raporlar", icon: BarChart3, tKey: "reports", minRole: "manager" },
  { href: "/dashboard/gelir-gider", icon: Wallet, tKey: "income", minRole: "manager" },
  { href: "/dashboard/stok", icon: Package, tKey: "stock", minRole: "staff" },
  { href: "/dashboard/veri-gocu", icon: Import, tKey: "dataMigration", minRole: "manager" },
  { href: "/dashboard/rehber", icon: HelpCircle, tKey: "guide", minRole: "staff" },
  { href: "/dashboard/abonelik", icon: CreditCard, tKey: "subscription", minRole: "owner" },
];

interface Props {
  role: string;
  orgSlug?: string;
  plan?: string;
}

export function MobileSideMenu({ role, orgSlug, plan }: Props) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const { setOpen: setAssistantOpen } = useAiAssistant();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const userRank = ROLE_RANK[role] ?? 0;
  const visibleItems = SECONDARY_NAV.filter((item) =>
    userRank >= (ROLE_RANK[item.minRole] ?? 0) && (!("planRequired" in item) || item.planRequired === plan)
  );

  const bookingLink = orgSlug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com"}/r/${orgSlug}`
    : "";

  async function copyLink() {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      toast.success("Link kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı");
    }
  }

  function shareOnWhatsApp() {
    if (!bookingLink) return;
    const text = `Online randevu almak için: ${bookingLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <button
          className="relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
          aria-label="Menü"
        />
      }>
        <Menu className="h-5 w-5" />
        <span>Menü</span>
      </SheetTrigger>

      <SheetContent side="left" className="overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle>Menü</SheetTitle>
        </SheetHeader>

        <div className="px-4 py-4 space-y-5">
          {/* AI Asistan */}
          <button
            onClick={() => { setOpen(false); setAssistantOpen(true); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/15 text-primary shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold">AI Asistan</p>
              <p className="text-xs text-muted-foreground">Sorularınızı yanıtlar, yardımcı olur</p>
            </div>
          </button>

          {/* Müşteri randevu linki */}
          {bookingLink && (
            <div className="p-3 rounded-xl border border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Müşteri Randevu Linki
              </p>
              <p className="text-xs text-muted-foreground break-all">{bookingLink}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8" onClick={copyLink}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Kopyala
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8" onClick={shareOnWhatsApp}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  Paylaş
                </Button>
              </div>
            </div>
          )}

          {/* İkincil navigasyon */}
          <div className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {t(item.tKey)}
                </Link>
              );
            })}
          </div>

          {/* Dil / tema / çıkış */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <LanguagePicker variant="muted" />
            <ThemePicker />
            <LogoutButtonMobile />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
