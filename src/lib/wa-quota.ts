import { createAdminClient } from "@/lib/supabase/server";
import { isWaQuotaEnforced, monthlyUtilityQuota, type EntitlementOrg } from "@/lib/entitlements";
import { computeWaCycle, type WaCycle } from "@/lib/wa-cycle";

/**
 * WhatsApp mesaj kotaları: plana dahil aylık UTILITY hakkı + satın alınan ek krediler
 * (utility / kampanya). Tablo ve fonksiyonlar supabase/migrations/20261017_wa_message_quotas.sql'de;
 * yalnızca service role erişir — tüm çağrılar admin client ile yapılır, bu modül
 * istemciye (client component) import EDİLMEZ.
 *
 * DÖNEM: takvim ayı değil, abonelik başlangıç (çıpa) tarihinin aylık yıldönümü (bkz. lib/wa-cycle.ts).
 *
 * AÇIK GEÇ ("error"): sayaç altyapısı kurulmamışsa ya da geçici bir DB hatası varsa çağıran
 * taraf mesajı ENGELLEMEMELİ — kota hatası randevu/mesaj akışını kırmasın. Sınır kasıtlı
 * olarak yalnızca "exceeded" iken uygulanır ve o da yalnızca isWaQuotaEnforced(org) ise.
 */

// ─── Dönem çıpası ────────────────────────────────────────────

const TRIAL_DAYS = 14;
const ANCHOR_TTL_MS = 60_000; // webhook başka örnekte güncelleyebilir; 1 dk eskilik sorun değil
const ANCHOR_MISS_TTL_MS = 5 * 60_000; // çıpa bulunamadıysa Stripe'ı her mesajda yoklama
const anchorCache = new Map<string, { anchor: string | null; exp: number }>();

/** Aboneliğin faturalama çıpasını kaydeder (Stripe webhook'u çağırır). Asla fırlatmaz. */
export async function recordWaCycleAnchor(orgId: string, billingCycleAnchorSec: number | null | undefined): Promise<void> {
  try {
    if (!billingCycleAnchorSec || !Number.isFinite(billingCycleAnchorSec)) return;
    const anchor = new Date(billingCycleAnchorSec * 1000).toISOString();
    const admin = await createAdminClient();
    const { error } = await admin
      .from("org_message_cycle")
      .upsert({ org_id: orgId, anchor, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
    if (error) {
      console.error(`[wa-quota] çıpa yazılamadı — org=${orgId}:`, error.message);
      return;
    }
    anchorCache.delete(orgId);
  } catch (e) {
    console.error(`[wa-quota] çıpa yazılamadı (istisna) — org=${orgId}:`, e);
  }
}

async function resolveAnchor(orgId: string): Promise<Date | null> {
  const hit = anchorCache.get(orgId);
  if (hit && hit.exp > Date.now()) return hit.anchor ? new Date(hit.anchor) : null;

  let anchor: Date | null = null;
  let ttl = ANCHOR_TTL_MS;
  try {
    const admin = await createAdminClient();
    const { data: row } = await admin.from("org_message_cycle").select("anchor").eq("org_id", orgId).maybeSingle();
    const stored = (row as { anchor?: string } | null)?.anchor;
    if (stored) {
      anchor = new Date(stored);
    } else {
      // Kayıt yok (mevcut aboneler / webhook henüz yazmadı): bir kez türet ve sakla.
      const { data: org } = await admin
        .from("organizations")
        .select("plan, trial_ends_at, stripe_subscription_id")
        .eq("id", orgId)
        .maybeSingle();
      const o = org as { plan?: string; trial_ends_at?: string | null; stripe_subscription_id?: string | null } | null;
      if (o?.stripe_subscription_id && o.plan !== "trial" && process.env.STRIPE_SECRET_KEY) {
        try {
          const { getStripe } = await import("@/lib/stripe/config");
          const sub = await getStripe().subscriptions.retrieve(o.stripe_subscription_id);
          if (sub.billing_cycle_anchor) {
            await recordWaCycleAnchor(orgId, sub.billing_cycle_anchor);
            anchor = new Date(sub.billing_cycle_anchor * 1000);
          }
        } catch (e) {
          console.error(`[wa-quota] Stripe çıpası okunamadı — org=${orgId}:`, e);
        }
      } else if (o?.trial_ends_at) {
        // Deneme başlangıcı = bitişten TRIAL_DAYS gün önce (deterministik; saklamaya gerek yok).
        anchor = new Date(new Date(o.trial_ends_at).getTime() - TRIAL_DAYS * 86_400_000);
      }
      if (!anchor) ttl = ANCHOR_MISS_TTL_MS;
    }
  } catch (e) {
    console.error(`[wa-quota] çıpa çözülemedi — org=${orgId}:`, e);
    ttl = ANCHOR_MISS_TTL_MS;
  }
  anchorCache.set(orgId, { anchor: anchor ? anchor.toISOString() : null, exp: Date.now() + ttl });
  return anchor;
}

/** İşletmenin geçerli kota dönemi (çıpa yoksa takvim ayı). */
export async function getWaCycle(orgId: string, now: Date = new Date()): Promise<WaCycle> {
  return computeWaCycle(await resolveAnchor(orgId), now);
}

// ─── Utility (plana dahil + ek kredi) ────────────────────────

export type UtilityConsume =
  | { result: "ok"; source: "plan" | "addon" | "plan_over"; period: string }
  | { result: "exceeded" }
  | { result: "error" };

/** Bir müşteri UTILITY mesajı hakkı tüketir (önce plan kotası, sonra ek kredi). */
export async function consumeWaUtility(orgId: string, org: EntitlementOrg | null | undefined): Promise<UtilityConsume> {
  try {
    const cycle = await getWaCycle(orgId);
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("consume_wa_utility", {
      p_org: orgId,
      p_quota: monthlyUtilityQuota(org),
      p_enforce: isWaQuotaEnforced(org),
      p_period: cycle.key,
    });
    if (error) {
      console.error(`[wa-quota] consume utility hata — org=${orgId}:`, error.message);
      return { result: "error" };
    }
    if (data === "plan" || data === "addon" || data === "plan_over") return { result: "ok", source: data, period: cycle.key };
    if (data === "exceeded") return { result: "exceeded" };
    return { result: "error" };
  } catch (e) {
    console.error(`[wa-quota] consume utility istisna — org=${orgId}:`, e);
    return { result: "error" };
  }
}

/** Mesaj Meta/360dialog'a gitmediyse hakkı (tüketildiği dönemde) geri verir. */
export async function releaseWaUtility(orgId: string, source: "plan" | "addon" | "plan_over", period: string): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin.rpc("release_wa_utility", { p_org: orgId, p_source: source, p_period: period });
    if (error) console.error(`[wa-quota] release utility hata — org=${orgId}:`, error.message);
  } catch (e) {
    console.error(`[wa-quota] release utility istisna — org=${orgId}:`, e);
  }
}

// ─── Kampanya (yalnızca satın alınan kredi) ──────────────────

/**
 * Bir KAMPANYA kredisi tüketir ve (başarılıysa) tüketildiği dönem anahtarını döner; yoksa null.
 * Altyapı hatasında null (kampanya kredisi bir maliyet kalemidir: emin olunamıyorsa gönderilmez —
 * utility'den farklı olarak AÇIK GEÇMEZ).
 */
export async function consumeWaMarketing(orgId: string): Promise<string | null> {
  try {
    const cycle = await getWaCycle(orgId);
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("consume_wa_marketing", { p_org: orgId, p_period: cycle.key });
    if (error) {
      console.error(`[wa-quota] consume marketing hata — org=${orgId}:`, error.message);
      return null;
    }
    return data === true ? cycle.key : null;
  } catch (e) {
    console.error(`[wa-quota] consume marketing istisna — org=${orgId}:`, e);
    return null;
  }
}

export async function releaseWaMarketing(orgId: string, period: string): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin.rpc("release_wa_marketing", { p_org: orgId, p_period: period });
    if (error) console.error(`[wa-quota] release marketing hata — org=${orgId}:`, error.message);
  } catch (e) {
    console.error(`[wa-quota] release marketing istisna — org=${orgId}:`, e);
  }
}

// ─── Panel özeti ─────────────────────────────────────────────

export interface WaUsageSummary {
  /** Plana dahil aylık utility hakkı; null = sınır tanımsız. */
  utilityQuota: number | null;
  utilityUsed: number;
  /** Plan kotasından kalan (negatif olmaz). */
  utilityPlanRemaining: number | null;
  /** Satın alınan ek utility kredisi bakiyesi. */
  utilityAddonBalance: number;
  marketingBalance: number;
  marketingUsed: number;
  /** Kota dolunca mesaj gerçekten duruyor mu (WA_QUOTA_ENFORCE_PLANS). */
  enforced: boolean;
  /** Dönem başlangıcı ve bir sonraki yenilenme (abonelik yıldönümü) — ISO. */
  periodStart: string;
  periodEnd: string;
}

/** Panel göstergesi için geçerli dönemin özeti. Okunamazsa sıfırlarla döner. */
export async function getWaUsageSummary(orgId: string, org: EntitlementOrg | null | undefined): Promise<WaUsageSummary> {
  const cycle = await getWaCycle(orgId);
  const quota = monthlyUtilityQuota(org);
  const base: WaUsageSummary = {
    utilityQuota: quota,
    utilityUsed: 0,
    utilityPlanRemaining: quota,
    utilityAddonBalance: 0,
    marketingBalance: 0,
    marketingUsed: 0,
    enforced: isWaQuotaEnforced(org),
    periodStart: cycle.start.toISOString(),
    periodEnd: cycle.end.toISOString(),
  };
  try {
    const admin = await createAdminClient();
    const [{ data: usage }, { data: addons }] = await Promise.all([
      admin
        .from("org_message_usage")
        .select("utility_used, marketing_used")
        .eq("org_id", orgId)
        .eq("period", cycle.key)
        .maybeSingle(),
      admin.from("org_message_addons").select("utility_balance, marketing_balance").eq("org_id", orgId).maybeSingle(),
    ]);
    const u = usage as { utility_used?: number; marketing_used?: number } | null;
    const a = addons as { utility_balance?: number; marketing_balance?: number } | null;
    const used = u?.utility_used ?? 0;
    return {
      ...base,
      utilityUsed: used,
      utilityPlanRemaining: quota === null ? null : Math.max(0, quota - used),
      utilityAddonBalance: a?.utility_balance ?? 0,
      marketingBalance: a?.marketing_balance ?? 0,
      marketingUsed: u?.marketing_used ?? 0,
    };
  } catch {
    return base;
  }
}
