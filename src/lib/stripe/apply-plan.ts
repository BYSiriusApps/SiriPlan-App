import { createAdminClient } from "@/lib/supabase/server";
import { PLANS, type PlanKey } from "./config";
import { getOrgAddons } from "./addons";
import { syncBranchesFromParent } from "@/lib/branches";

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
  return undefined;
}
