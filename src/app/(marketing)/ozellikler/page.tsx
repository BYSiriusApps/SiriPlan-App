import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Bot, Users, Trophy, MessageSquare, BarChart3, FileDown, Upload, Bell, Zap, Star, Shield, Globe, Smartphone, QrCode, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";

const GROUP_META = [
  {
    key: "booking",
    icon: Calendar,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    items: [
      { key: "multiChannel", icon: Calendar, badge: "all" },
      { key: "website", icon: Globe, badge: "pro" },
      { key: "waitlist", icon: Smartphone, badge: "pro" },
      { key: "inventory", icon: Upload, badge: "all" },
      { key: "qr", icon: QrCode, badge: "all" },
      { key: "reminders", icon: Bell, badge: "all" },
    ],
  },
  {
    key: "ai",
    icon: Bot,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    items: [
      { key: "voiceAI", icon: Bot, badge: "pro" },
      { key: "whatsappAI", icon: Bot, badge: "business" },
      { key: "instagramDm", icon: MessageSquare, badge: "business" },
      { key: "birthday", icon: Bell, badge: "pro" },
    ],
  },
  {
    key: "crm",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    items: [
      { key: "score", icon: Users, badge: "pro" },
      { key: "loyalty", icon: Star, badge: "all" },
      { key: "campaigns", icon: MessageSquare, badge: "pro" },
    ],
  },
  {
    key: "staff",
    icon: Trophy,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    items: [
      { key: "staffOfWeek", icon: Trophy, badge: "pro" },
      { key: "badges", icon: Star, badge: "pro" },
      { key: "commission", icon: BarChart3, badge: "pro" },
    ],
  },
  {
    key: "finance",
    icon: BarChart3,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    items: [
      { key: "dashboard", icon: BarChart3, badge: "all" },
      { key: "pdfExcel", icon: FileDown, badge: "pro" },
      { key: "stripe", icon: CreditCard, badge: "pro" },
    ],
  },
  {
    key: "tech",
    icon: Shield,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    items: [
      { key: "kvkk", icon: Shield, badge: "all" },
      { key: "migration", icon: Upload, badge: "all" },
      { key: "portability", icon: FileDown, badge: "all" },
      { key: "multilingual", icon: Globe, badge: "business" },
      { key: "uptime", icon: Zap, badge: "all" },
    ],
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("nav.features"),
    description: t("featuresPage.metaDescription"),
  };
}

export default async function OzelliklerPage() {
  const t = await getTranslations();

  const BADGE_STYLE: Record<string, string> = {
    all: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    business: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  const BADGE_LABEL: Record<string, string> = {
    all: t("featuresPage.badgeAll"),
    pro: t("featuresPage.badgePro"),
    business: t("featuresPage.badgeBusiness"),
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1 text-xs">
            <Zap className="w-3 h-3 text-primary" />
            {t("featuresPage.heroBadge")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-5">
            {t("featuresPage.heroTitle")}<br />
            <span className="brand-gradient-text">{t("featuresPage.heroTitleHighlight")}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("featuresPage.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-11 px-7">
                {t("featuresPage.ctaTrial")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/fiyatlar">
              <Button variant="outline" className="h-11 px-7">
                {t("featuresPage.ctaPricing")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature groups */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-16">
          {GROUP_META.map((group) => (
            <div key={group.key}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-10 h-10 rounded-xl ${group.bg} flex items-center justify-center`}>
                  <group.icon className={`w-5 h-5 ${group.color}`} />
                </div>
                <h2 className="text-2xl font-bold">{t(`featuresPage.groups.${group.key}.category`)}</h2>
              </div>

              {/* Feature cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((feature) => (
                  <div
                    key={feature.key}
                    className="p-5 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${group.bg} flex items-center justify-center`}>
                        <feature.icon className={`w-4 h-4 ${group.color}`} />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLE[feature.badge]}`}>
                        {BADGE_LABEL[feature.badge]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{t(`featuresPage.groups.${group.key}.items.${feature.key}.title`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`featuresPage.groups.${group.key}.items.${feature.key}.desc`)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t("featuresPage.finalCta.title")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("featuresPage.finalCta.subtitle")}
          </p>
          <Link href="/auth/kayit">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 h-12 px-10">
              {t("featuresPage.finalCta.button")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
