import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { getEntitlements } from "@/lib/entitlements";
import { isMobileApp } from "@/lib/mobile-app";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HomeButton } from "@/components/dashboard/HomeButton";
import Link from "next/link";
import { Megaphone, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Campaign } from "@/types/database";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  draft:     { label: "Taslak",    icon: Clock,          className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30" },
  scheduled: { label: "Planlandı", icon: Calendar,       className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30" },
  sending:   { label: "Gönderiliyor", icon: Clock,       className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" },
  sent:      { label: "Gönderildi", icon: CheckCircle2,  className: "bg-green-100 text-green-700 dark:bg-green-900/30" },
  failed:    { label: "Başarısız", icon: AlertCircle,    className: "bg-red-100 text-red-700 dark:bg-red-900/30" },
};

const TYPE_LABELS: Record<string, string> = {
  birthday: "🎂 Doğum Günü",
  inactive: "💤 İnaktif Müşteri",
  custom: "✏️ Özel",
};

export default async function KampanyalarPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  // Deneme süresi Pro'ya denk olduğundan etkin yetki baz alınır (feature_campaigns
  // kolonu deneme sırasında false kalır, plan+trial_ends_at'ten hesaplanır).
  if (!getEntitlements(member.organizations).feature_campaigns) {
    const mobileApp = await isMobileApp();
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold mb-2">{t("campaignsPage.lockedTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("campaignsPage.lockedDescription")}</p>
          {/* Native uygulamada (App Store/Play Store) mağaza kuralları gereği
              plan yükseltme çağrısı gösterilmez; yalnızca durum bilgisi verilir. */}
          {mobileApp ? (
            <p className="text-sm text-muted-foreground">{t("campaignsPage.lockedNative")}</p>
          ) : (
            <Link
              href="/dashboard/abonelik"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              {t("campaignsPage.upgrade")} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const [{ data: campaigns }, { count: marketingCount }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .eq("org_id", member.org_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", member.org_id)
      .eq("marketing_consent", true),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("campaignsPage.eyebrow")}</span>
              <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("campaigns")}</h1>
            </div>
            <HomeButton />
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t("campaignsPage.subtitle")}</p>
        </div>
        <Link
          href="/dashboard/kampanyalar/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("campaignsPage.createCampaign")}
        </Link>
      </div>

      {/* Marketing reach info */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <Megaphone className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-green-700 dark:text-green-400">{t("campaignsPage.marketingReach", { count: marketingCount ?? 0 })}</span>
        </div>
        <Link
          href="/dashboard/musteriler?kampanya=1"
          className="shrink-0 text-xs text-green-700 dark:text-green-400 hover:underline font-medium"
        >
          {t("campaignsPage.viewList")}
        </Link>
      </div>

      {/* Quick campaign cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            type: "birthday",
            color: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30",
            border: "border-rose-200 dark:border-rose-800",
          },
          {
            type: "inactive",
            color: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
            border: "border-blue-200 dark:border-blue-800",
          },
          {
            type: "custom",
            color: "from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30",
            border: "border-purple-200 dark:border-purple-800",
          },
        ].map((c) => (
          <Link key={c.type} href={`/dashboard/kampanyalar/yeni?type=${c.type}`}>
            <Card className={cn("border-0 shadow-sm bg-gradient-to-br cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all", c.color, `border ${c.border}`)}>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">{t(`campaignsPage.types.${c.type}`)}</h3>
                <p className="text-xs text-muted-foreground">{t(`campaignsPage.types.${c.type}Desc`)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Campaign history */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("campaignsPage.historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!campaigns || campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("campaignsPage.emptyHistory")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(campaigns as Campaign[]).map((c) => {
                const statusKey = c.status && STATUS_CONFIG[c.status] ? c.status : "draft";
                const statusConf = STATUS_CONFIG[statusKey];
                const Icon = statusConf.icon;
                const typeLabel = t(`campaignsPage.types.${c.type}`);
                const statusLabel = t(`campaignsPage.status.${statusKey}`);
                const whenLabel = c.sent_at
                  ? format(new Date(c.sent_at), "d MMM yyyy HH:mm", { locale: tr })
                  : c.scheduled_at
                  ? t("campaignsPage.scheduledLabel", { date: format(new Date(c.scheduled_at), "d MMM yyyy HH:mm", { locale: tr }) })
                  : t("campaignsPage.draftLabel");
                return (
                  <Link key={c.id} href={`/dashboard/kampanyalar/${c.id}`}>
                    <div className="data-row flex items-center gap-3 p-3 rounded-lg transition-colors group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{c.name}</p>
                          <Badge variant="outline" className={cn("text-[10px]", statusConf.className)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {statusLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {typeLabel} • {whenLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{c.sent_count}</p>
                        <p className="text-xs text-muted-foreground">{t("campaignsPage.sentCount")}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
