import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/config";

/**
 * Ek paketler (plan aboneliğinden AYRI Stripe aboneliği olarak satılır).
 *
 * NEDEN ayrı abonelik: plan akışı (checkout / change-plan / webhook) tüm
 * mantığını `organizations.stripe_subscription_id` ve aboneliğin İLK kalemi
 * üzerine kurar. Ek paketi plan aboneliğine kalem olarak eklemek bu varsayımları
 * bozardı. Ayrı abonelikte plan akışı hiç değişmez; webhook yalnızca ek paket
 * aboneliklerini (metadata.kind="addon" ya da bilinen fiyat ID'si) erkenden
 * ayırıp plan mantığından uzak tutar.
 */
export const ADDONS = {
  ai_assistant: {
    name: "AI Asistan (WhatsApp + Instagram)",
    monthly: process.env.STRIPE_PRICE_AIASSISTANT || process.env.STRIPE_PRICE_AI_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_AI_ANNUAL || "",
    /** Business planı AI'yı zaten içerir; Mini tek kişilik/kısıtlı plandır. */
    eligiblePlans: ["starter", "pro"],
  },
  extra_branch: {
    name: "Ek Şube",
    monthly: process.env.STRIPE_PRICE_BRANCH || process.env.STRIPE_PRICE_BRANCH_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_BRANCH_ANNUAL || "",
    eligiblePlans: ["starter", "pro", "business"],
  },
} as const;

export type AddonKey = keyof typeof ADDONS;

/** Bir ek paket aboneliği bu durumlarda "açık" sayılır (past_due = ödeme toparlama süresi). */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function addonFromPriceId(priceId: string | null | undefined): AddonKey | undefined {
  if (!priceId) return undefined;
  for (const key of Object.keys(ADDONS) as AddonKey[]) {
    const cfg = ADDONS[key];
    if ((cfg.monthly && cfg.monthly === priceId) || (cfg.annual && cfg.annual === priceId)) return key;
  }
  return undefined;
}

/**
 * Bir Stripe aboneliğinin ek paket olup olmadığı. Önce bizim yazdığımız
 * metadata, yoksa fiyat ID'si (Müşteri Portalı metadata yazmaz).
 * Plan abonelikleri için `undefined` döner → çağıran mevcut akışa devam eder.
 */
export function addonFromSubscription(sub: Stripe.Subscription): { addon: AddonKey; quantity: number } | undefined {
  const items = sub.items?.data ?? [];
  let addon: AddonKey | undefined;
  if (sub.metadata?.kind === "addon") {
    const m = sub.metadata.addon;
    if (m === "ai_assistant" || m === "extra_branch") addon = m;
  }
  if (!addon) {
    for (const it of items) {
      addon = addonFromPriceId(it.price?.id);
      if (addon) break;
    }
  }
  if (!addon) return undefined;
  const quantity = items.reduce((sum, it) => sum + (it.quantity ?? 1), 0) || 1;
  return { addon, quantity };
}

export interface OrgAddons {
  ai_assistant: boolean;
  extra_branch_slots: number;
  ai_subscription_id: string | null;
  branch_subscription_id: string | null;
}

const NO_ADDONS: OrgAddons = {
  ai_assistant: false,
  extra_branch_slots: 0,
  ai_subscription_id: null,
  branch_subscription_id: null,
};

/** Hata/eksik tablo durumunda "ek paket yok" döner — asla fırlatmaz (ana akış etkilenmesin). */
export async function getOrgAddons(orgId: string): Promise<OrgAddons> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("org_addons")
      .select("ai_assistant, extra_branch_slots, ai_subscription_id, branch_subscription_id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error || !data) return NO_ADDONS;
    return data as OrgAddons;
  } catch {
    return NO_ADDONS;
  }
}

/**
 * Ek paket aboneliğinin durumunu org_addons'a yazar ve gerekiyorsa
 * organizations.feature_ai'yi eşitler. Webhook'tan çağrılır; `deleted` true ise
 * paket kapatılır. Eski (iptal edilmiş) bir aboneliğin olayı, yerine geçen
 * yeni aboneliği kapatmasın diye kapatma yalnızca kayıtlı abonelik ID'si eşleşirse yapılır.
 * Hata fırlatır → webhook 500 döner, Stripe olayı yeniden dener.
 */
export async function syncAddonSubscription(orgId: string, sub: Stripe.Subscription, deleted = false) {
  const info = addonFromSubscription(sub);
  if (!info) return;
  const admin = await createAdminClient();
  const active = !deleted && ACTIVE_STATUSES.has(sub.status);

  const { data: existing } = await admin
    .from("org_addons")
    .select("ai_subscription_id, branch_subscription_id")
    .eq("org_id", orgId)
    .maybeSingle();

  const idCol = info.addon === "ai_assistant" ? "ai_subscription_id" : "branch_subscription_id";
  const storedId = (existing as Record<string, string | null> | null)?.[idCol] ?? null;
  if (!active && storedId && storedId !== sub.id) return;

  const patch: Record<string, unknown> = { org_id: orgId, updated_at: new Date().toISOString() };
  if (info.addon === "ai_assistant") {
    patch.ai_assistant = active;
    patch.ai_subscription_id = active ? sub.id : null;
  } else {
    patch.extra_branch_slots = active ? info.quantity : 0;
    patch.branch_subscription_id = active ? sub.id : null;
  }
  const { error } = await admin.from("org_addons").upsert(patch, { onConflict: "org_id" });
  if (error) throw new Error(`org_addons yazılamadı: ${error.message}`);

  if (info.addon === "ai_assistant") await recomputeFeatureAi(orgId);
}

/**
 * Plan iptal/iptal-geri-al ile birlikte ek paket aboneliklerini de aynı yöne çeker
 * (`cancel_at_period_end`): plan bitince paketler faturalanmaya devam etmesin.
 * En iyi çaba — plan iptalini ASLA engellemez/başarısız kılmaz.
 */
export async function setAddonsCancelAtPeriodEnd(orgId: string, cancel: boolean): Promise<void> {
  try {
    const a = await getOrgAddons(orgId);
    const stripe = getStripe();
    for (const id of [a.ai_subscription_id, a.branch_subscription_id]) {
      if (!id) continue;
      try {
        await stripe.subscriptions.update(id, { cancel_at_period_end: cancel });
      } catch (err) {
        console.error("[addons] paket aboneliği güncellenemedi:", id, err instanceof Error ? err.message : err);
      }
    }
  } catch {
    // paket bilgisi okunamadı → plan akışı etkilenmesin
  }
}

/** Hesap silinirken ek paket aboneliklerini hemen iptal eder (en iyi çaba). */
export async function cancelAddonsNow(orgId: string): Promise<void> {
  try {
    const a = await getOrgAddons(orgId);
    const stripe = getStripe();
    for (const id of [a.ai_subscription_id, a.branch_subscription_id]) {
      if (!id) continue;
      try {
        await stripe.subscriptions.cancel(id);
      } catch {
        // zaten iptal edilmiş olabilir
      }
    }
  } catch {
    // yoksay
  }
}

/**
 * organizations.feature_ai = plan'ın içerdiği AI (Business) VEYA AI Asistan ek paketi.
 * feature_ai'yi okuyan tüm yerler (WA/IG webhook'ları, panel) değişmeden çalışsın
 * diye ek paket bu mevcut kolona yansıtılır.
 */
export async function recomputeFeatureAi(orgId: string) {
  const admin = await createAdminClient();
  const { data: org } = await admin.from("organizations").select("plan, feature_ai").eq("id", orgId).maybeSingle();
  if (!org) return;
  const addons = await getOrgAddons(orgId);
  const want = org.plan === "business" || addons.ai_assistant;
  if (!!org.feature_ai !== want) {
    await admin.from("organizations").update({ feature_ai: want }).eq("id", orgId);
  }
}
