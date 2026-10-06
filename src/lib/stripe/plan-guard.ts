import { createAdminClient } from "@/lib/supabase/server";
import { PLAN_USAGE_LIMITS } from "@/lib/entitlements";
import type { PlanKey } from "./config";

/**
 * Mini plan 1 aktif personelle sınırlıdır. İşletme denemede/Pro'da birden fazla
 * aktif personel eklemişse Mini'ye geçmeden önce fazlasını pasife almalıdır —
 * aksi halde sınır fiilen aşılmış kalırdı. Diğer planlarda her zaman null
 * (mevcut satın alma/plan değiştirme davranışı aynen korunur).
 *
 * @returns Mini'ye geçişi engelleyen aktif personel sayısı; engel yoksa null.
 */
export async function activeStaffBlockingPlan(orgId: string, plan: PlanKey): Promise<number | null> {
  if (plan !== "mini") return null;
  const admin = await createAdminClient();
  const { count } = await admin
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_active", true);
  return (count ?? 0) > PLAN_USAGE_LIMITS.mini.staff ? (count ?? 0) : null;
}

export function staffBlockingMessage(activeCount: number): string {
  return `Mini plan 1 aktif personel içindir; şu an ${activeCount} aktif personeliniz var. Önce fazla personeli pasife alın veya Starter/Pro planını seçin.`;
}
