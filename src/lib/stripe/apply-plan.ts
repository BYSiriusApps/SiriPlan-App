import { createAdminClient } from "@/lib/supabase/server";
import { PLANS, type PlanKey } from "./config";
import { getOrgAddons } from "./addons";
import { syncBranchesFromParent } from "@/lib/branches";
import { isEphemeralPlan, RETENTION_GRACE_DAYS } from "@/lib/data-retention";

/** Webhook ve change-plan endpoint'i arasında paylaşılan tek plan-uygulama mantığı — ikisi ayrı kopya tutarsa zamanla birbirinden sapar. */
export async function applyPlanToOrg(orgId: string, plan: PlanKey | "trial", subscriptionStatus?: string) {
  const supabase = await createAdminClient();
  if (plan === "trial") {
    await supabase.from("organizations").update({
      plan: "trial",
      subscription_status: subscriptionStatus ?? "active",
    }).eq("id", orgId);
    return;
  }
  const planConfig = PLANS[plan];
  // Mini Lite (geçici veri modu) geçişi: persistent → ephemeral'da 30 günlük dışa aktarma süresi başlar,
  // ephemeral → persistent'te süre temizlenir (kayıt tutma o andan itibaren başlar). Plan yazımından
  // önce eski plan okunur; sütun yoksa (migration beklerken) hata yutulur — plan yazımı ASLA etkilenmez.
  const { data: prevOrg } = await supabase.from("organizations").select("plan").eq("id", orgId).maybeSingle();
  const prevPlan = (prevOrg as { plan?: string | null } | null)?.plan ?? null;
  // AI Asistan ek paketi (org_addons) plan değişiminde silinmesin: plan AI içermese
  // bile paket açıksa feature_ai true kalır. Ek paket yoksa sonuç eskisiyle aynı.
  const { ai_assistant: aiAddon } = await getOrgAddons(orgId);
  await supabase.from("organizations").update({
    plan,
    subscription_status: subscriptionStatus ?? "active",
    max_staff: planConfig.max_staff,
    max_appointments_monthly: planConfig.max_appointments_monthly,
    ...planConfig.features,
    feature_ai: planConfig.features.feature_ai || aiAddon,
  }).eq("id", orgId);
  if (isEphemeralPlan(plan) && !isEphemeralPlan(prevPlan)) {
    const until = new Date(Date.now() + RETENTION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("organizations").update({ data_retention_until: until }).eq("id", orgId);
  } else if (!isEphemeralPlan(plan) && isEphemeralPlan(prevPlan)) {
    await supabase.from("organizations").update({ data_retention_until: null }).eq("id", orgId);
  }
  // Şubeler (Ek Şube paketi) ana işletmenin planını miras alır. Şube yoksa no-op, asla fırlatmaz.
  await syncBranchesFromParent(orgId);
}

/**
 * Stripe Price ID'sinden plan tespiti. Webhook'ta `subscription.metadata.plan`
 * bulunamadığında (ör. Stripe Müşteri Portalı'ndan yapılan bir değişiklik —
 * portal bizim custom metadata alanımızı yazmaz) yedek olarak kullanılır ki
 * DB'deki plan Stripe'takinden sessizce sapmasın.
 */
export function planFromPriceId(priceId: string | null | undefined): PlanKey | undefined {
  if (!priceId) return undefined;
  for (const key of Object.keys(PLANS) as PlanKey[]) {
    const cfg = PLANS[key];
    if (cfg.monthly === priceId || cfg.annual === priceId) return key;
  }
  // Mini fiyatı yükseltildi (₺399 → ₺699): eski fiyatla devam eden aboneler (grandfather) eski Price ID'de
  // kalır; opsiyonel env ile Mini olarak tanınırlar (yoksa subscription.metadata.plan yine yeterlidir).
  const legacyMini = [process.env.STRIPE_PRICE_MINI_LEGACY_MONTHLY, process.env.STRIPE_PRICE_MINI_LEGACY_ANNUAL];
  if (legacyMini.some((id) => !!id && id === priceId)) return "mini";
  return undefined;
}
