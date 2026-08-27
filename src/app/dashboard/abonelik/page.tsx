import { createClient, createAdminClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { getEntitlements, isTrialActive } from "@/lib/entitlements";
import { isMobileApp } from "@/lib/mobile-app";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Zap, Sparkles, Building2, Mail, Users, CalendarDays, type LucideIcon } from "lucide-react";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { ManageBillingButton } from "@/components/dashboard/ManageBillingButton";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

const SUPPORT_EMAIL = "info@bysirius.com";

const PLAN_DETAILS = {
  trial: { name: "Deneme", icon: Zap, color: "text-gray-600" },
  starter: { name: "Starter", icon: Zap, color: "text-blue-600" },
  pro: { name: "Pro", icon: Sparkles, color: "text-primary" },
  business: { name: "Business", icon: Building2, color: "text-purple-600" },
};

export default async function AbonelikPage() {
  const t = await getTranslations("dashboard");
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

  // Deneme süresi Pro'ya denk: özellik listesi ve limitler etkin yetkiden okunur,
  // böylece kullanıcı deneme boyunca gerçekten neye erişebildiğini net görür.
  const ent = getEntitlements(org);
  const trialActive = isTrialActive(org);
  const maxStaff = trialActive ? 999 : org.max_staff;
  const maxAppointments = trialActive ? 999999 : org.max_appointments_monthly;

  // Gerçek kullanım — sayfa "boş" görünmesin diye uydurma sayı değil,
  // aynı sorgu (bkz. api/appointments/route.ts satır ~320-330) tekrar edilir.
  const admin = await createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const [{ count: staffCount }, { count: appointmentCount }] = await Promise.all([
    admin.from("staff").select("id", { count: "exact", head: true }).eq("org_id", member.org_id).eq("is_active", true),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("org_id", member.org_id)
      .gte("created_at", monthStart).lt("created_at", monthEnd),
  ]);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("subscriptionPage.eyebrow")}</span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("subscriptionPage.title")}</h1>
          </div>
          <HomeButton />
        </div>
        <p className="text-muted-foreground text-sm mt-1">{t("subscriptionPage.subtitle")}</p>
      </div>

      {/* Current plan */}
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mevcut Plan</CardTitle>
            <Badge
              variant="outline"
              className={
                org.subscription_status === "active" ? "bg-green-100 text-green-800 border-green-200" :
                org.subscription_status === "past_due" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                "bg-red-100 text-red-800 border-red-200"
              }
            >
              {org.subscription_status === "active" ? "Aktif" :
               org.subscription_status === "past_due" ? "Ödeme Bekliyor" : "İptal Edildi"}
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
                {planDetail.name} Planı
                {trialActive && (
                  <span className="ml-2 align-middle text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Pro özellikleri açık
                  </span>
                )}
              </p>
              {org.plan === "trial" && org.trial_ends_at && (
                <p className="text-sm text-muted-foreground">
                  Deneme {format(new Date(org.trial_ends_at), "d MMMM yyyy", { locale: tr })} tarihinde bitiyor
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UsageMeter
              icon={Users}
              label="Personel"
              used={staffCount ?? 0}
              max={maxStaff}
            />
            <UsageMeter
              icon={CalendarDays}
              label="Randevu (bu ay)"
              used={appointmentCount ?? 0}
              max={maxAppointments}
            />
          </div>

          <div className="space-y-2">
            {[
              { label: "Website Modu", enabled: ent.feature_website },
              { label: "Kampanya Modülü", enabled: ent.feature_campaigns },
              { label: "Gamification", enabled: ent.feature_gamification },
              { label: "AI Asistanı", enabled: ent.feature_ai },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={`h-4 w-4 ${f.enabled ? "text-green-600" : "text-muted-foreground/40"}`} />
                <span className={f.enabled ? "" : "text-muted-foreground/60 line-through"}>{f.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions — native uygulamada (App Store/Play Store) fiyat, plan
          karşılaştırma ve ödeme bağlantısı gösterilmez. Destek bağlantısı da
          kasıtlı olarak "plan değişikliği/yükseltme" ifadesi taşımaz: App
          Store İnceleme Kılavuzu 3.1.1 uygulama içi satın alma dışındaki bir
          satın alma yoluna YÖNLENDİREN her çağrıyı (buton, link, metin)
          kapsar; "plan değiştirmek için bize yazın" da böyle bir çağrıdır.
          Burada yalnızca sayfanın üstündeki mevcut plan bilgisi ve genel
          müşteri desteği kalır. */}
      {mobileApp ? (
        <div className="space-y-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border font-medium hover:bg-accent transition-colors"
          >
            <Mail className="h-4 w-4" />
            Destek ile iletişime geçin
          </a>
          <p className="text-xs text-center text-muted-foreground">
            Hesabınızın planı ve kullanım limitleri yukarıda görünür.
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
              {org.plan === "trial" ? "Planları Karşılaştır & Aboneliği Başlat" : "Pro'ya Yükselt"}
            </Link>
          ) : null}
          {org.stripe_customer_id && (org.plan === "pro" || org.plan === "business") && (
            <ManageBillingButton label="Fatura & Ödeme Yöntemini Yönet" />
          )}
        </div>
      )}

      {org.plan === "trial" && !mobileApp && (
        <p className="text-xs text-center text-muted-foreground">
          Deneme süresinde tüm Pro özellikleri ücretsiz kullanılabilir — kredi kartı gerekmez.
          Süre bitmeden Starter ve Pro'yu karşılaştırıp size uygun planla devam edebilirsiniz.
        </p>
      )}
    </div>
  );
}

/** Kullanım göstergesi — "Max Personel: 8" gibi tek başına anlamsız bir üst
 * sınır yerine gerçek kullanımı ("3 / 8") bir ilerleme çubuğuyla gösterir. */
function UsageMeter({
  icon: Icon, label, used, max,
}: {
  icon: LucideIcon;
  label: string;
  used: number;
  max: number;
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
          {unlimited && <span className="text-xs font-medium text-muted-foreground ml-1">Sınırsız</span>}
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
