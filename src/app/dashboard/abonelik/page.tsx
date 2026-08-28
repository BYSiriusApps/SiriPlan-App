import { createClient, createAdminClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { getEntitlements, isTrialActive } from "@/lib/entitlements";
import { isMobileApp } from "@/lib/mobile-app";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Zap, Sparkles, Building2, Mail, Users, CalendarDays, type LucideIcon } from "lucide-react";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { ManageBillingButton } from "@/components/dashboard/ManageBillingButton";
import Link from "next/link";

const SUPPORT_EMAIL = "info@bysirius.com";

const PLAN_DETAILS = {
  trial: { icon: Zap, color: "text-gray-600" },
  starter: { icon: Zap, color: "text-blue-600" },
  pro: { icon: Sparkles, color: "text-primary" },
  business: { icon: Building2, color: "text-purple-600" },
};

export default async function AbonelikPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const mobileApp = await isMobileApp();

  const org = (member as unknown as { org_id: string; organizations: Record<string, unknown> }).organizations as {
    plan: string; subscription_status: string; trial_ends_at?: string;
    max_staff: number; max_appointments_monthly: number;
    feature_ai: boolean; feature_campaigns: boolean; feature_gamification: boolean;
    feature_api: boolean; feature_whitelabel: boolean;
    stripe_customer_id?: string | null;
  };

  const planDetail = PLAN_DETAILS[org.plan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.trial;
  const Icon = planDetail.icon;

  const planDisplayName = org.plan === "trial"
    ? (locale === "tr" ? "Deneme" : locale === "ru" ? "Пробный" : locale === "ar" ? "تجريبي" : "Trial")
    : (org.plan === "starter" ? "Starter" : org.plan === "pro" ? "Pro" : "Business");

  const ent = getEntitlements(org);
  const trialActive = isTrialActive(org);
  const maxStaff = trialActive ? 999 : org.max_staff;
  const maxAppointments = trialActive ? 999999 : org.max_appointments_monthly;

  const admin = await createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const [{ count: staffCount }, { count: appointmentCount }] = await Promise.all([
    admin.from("staff").select("id", { count: "exact", head: true }).eq("org_id", member.org_id).eq("is_active", true),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("org_id", member.org_id)
      .gte("created_at", monthStart).lt("created_at", monthEnd),
  ]);

  const currentPlanKey = org.plan === "trial" ? "pro" : (org.plan as "starter" | "pro" | "business");
  const planFeatures = t.raw(`pricing.${currentPlanKey}.features`) as string[];
  const planNotIncluded = (t.raw(`pricing.${currentPlanKey}.notIncluded`) as string[] | undefined) ?? [];

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("dashboard.subscriptionPage.eyebrow")}</span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("dashboard.subscriptionPage.title")}</h1>
          </div>
          <HomeButton />
        </div>
        <p className="text-muted-foreground text-sm mt-1">{t("dashboard.subscriptionPage.subtitle")}</p>
      </div>

      {/* Current plan */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("dashboard.subscriptionPage.currentPlan")}</CardTitle>
            <Badge
              variant="outline"
              className={
                org.subscription_status === "active" ? "bg-green-100 text-green-800 border-green-200" :
                org.subscription_status === "past_due" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                "bg-red-100 text-red-800 border-red-200"
              }
            >
              {org.subscription_status === "active" ? t("dashboard.subscriptionPage.statusActive") :
               org.subscription_status === "past_due" ? t("dashboard.subscriptionPage.statusPastDue") : t("dashboard.subscriptionPage.statusCancelled")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className={`h-6 w-6 ${planDetail.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold">
                {t("dashboard.subscriptionPage.planSuffix", { planName: planDisplayName })}
                {trialActive && (
                  <span className="ml-2 align-middle text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {locale === "tr" ? "Pro özellikleri açık" : locale === "ru" ? "Возможности Pro активны" : locale === "ar" ? "ميزات Pro مفعلة" : "Pro features active"}
                  </span>
                )}
              </p>
              {org.plan === "trial" && org.trial_ends_at && (
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.subscriptionPage.trialEnds", { date: new Date(org.trial_ends_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UsageMeter
              icon={Users}
              label={t("dashboard.subscriptionPage.staffLabel")}
              used={staffCount ?? 0}
              max={maxStaff}
              unlimitedLabel={t("dashboard.subscriptionPage.unlimited")}
            />
            <UsageMeter
              icon={CalendarDays}
              label={t("dashboard.subscriptionPage.appointmentsLabel")}
              used={appointmentCount ?? 0}
              max={maxAppointments}
              unlimitedLabel={t("dashboard.subscriptionPage.unlimited")}
            />
          </div>

          <div className="space-y-2">
            {planFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{f}</span>
              </div>
            ))}
            {planNotIncluded.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm opacity-50">
                <span className="w-4 h-4 shrink-0 text-center text-[10px] text-muted-foreground">✕</span>
                <span className="text-muted-foreground line-through">{f}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {mobileApp ? (
        <div className="space-y-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border font-medium hover:bg-accent transition-colors"
          >
            <Mail className="h-4 w-4" />
            {t("dashboard.subscriptionPage.contactSupport")}
          </a>
          <p className="text-xs text-center text-muted-foreground">
            {t("dashboard.subscriptionPage.appStoreNote")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {org.plan === "trial" || org.plan === "starter" ? (
            <Link
              href="/auth/plan-sec"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {org.plan === "trial" ? t("dashboard.subscriptionPage.compareAndStart") : t("dashboard.subscriptionPage.upgradeToPro")}
            </Link>
          ) : null}
          {org.stripe_customer_id && (org.plan === "pro" || org.plan === "business") && (
            <ManageBillingButton label={t("dashboard.subscriptionPage.manageBilling")} />
          )}
        </div>
      )}

      {org.plan === "trial" && !mobileApp && (
        <p className="text-xs text-center text-muted-foreground">
          {t("dashboard.subscriptionPage.trialBottomNote")}
        </p>
      )}
    </div>
  );
}

function UsageMeter({
  icon: Icon, label, used, max, unlimitedLabel,
}: {
  icon: LucideIcon;
  label: string;
  used: number;
  max: number;
  unlimitedLabel: string;
}) {
  const unlimited = max >= 999;
  const pct = unlimited ? 0 : Math.min(100, max > 0 ? Math.round((used / max) * 100) : 0);
  const nearLimit = !unlimited && pct >= 90;
  return (
    <div className="kpi-tile p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="text-sm font-bold tabular-nums">
          {used}{unlimited ? "" : ` / ${max}`}
          {unlimited && <span className="text-xs font-medium text-muted-foreground ml-1">{unlimitedLabel}</span>}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${nearLimit ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
