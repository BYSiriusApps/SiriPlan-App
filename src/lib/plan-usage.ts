import { createAdminClient } from "@/lib/supabase/server";

/**
 * Plana bağlı aylık kullanım sayaçları (Mini: WhatsApp mesajı, Starter: kampanya).
 * Tablo/fonksiyonlar supabase/migrations/20261006_mini_plan.sql'de; yalnızca
 * service role erişir — bu yüzden tüm çağrılar admin client ile yapılır.
 *
 * AÇIK GEÇ ("error"): sayaç altyapısı henüz kurulmamışsa ya da geçici bir DB
 * hatası varsa çağıran taraf işlemi ENGELLEMEMELİ — aksi halde bir kota hatası
 * randevu/mesaj akışını kırar. Sınır kasıtlı olarak yalnızca "exceeded" iken uygulanır.
 */

export type UsageKind = "wa_message" | "campaign";

export type ConsumeResult = "ok" | "exceeded" | "error";

/** Ayın ilk günü (UTC) — SQL fonksiyonlarındaki period ile aynı. */
function currentPeriod(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

/** Sınır aşılmadıysa sayacı 1 artırır (atomik). */
export async function consumePlanUsage(orgId: string, kind: UsageKind, limit: number): Promise<ConsumeResult> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("consume_plan_usage", { p_org: orgId, p_kind: kind, p_limit: limit });
    if (error) {
      console.error(`[plan-usage] consume hata — org=${orgId} kind=${kind}:`, error.message);
      return "error";
    }
    return data === true ? "ok" : "exceeded";
  } catch (e) {
    console.error(`[plan-usage] consume istisna — org=${orgId} kind=${kind}:`, e);
    return "error";
  }
}

/** Harcanan hakkı geri verir (gönderim/oluşturma başarısız olduysa). */
export async function releasePlanUsage(orgId: string, kind: UsageKind): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin.rpc("release_plan_usage", { p_org: orgId, p_kind: kind });
    if (error) console.error(`[plan-usage] release hata — org=${orgId} kind=${kind}:`, error.message);
  } catch (e) {
    console.error(`[plan-usage] release istisna — org=${orgId} kind=${kind}:`, e);
  }
}

/** Bu ayki kullanım (panel göstergesi için). Okunamazsa 0. */
export async function getPlanUsage(orgId: string, kind: UsageKind): Promise<number> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("plan_usage")
      .select("count")
      .eq("org_id", orgId)
      .eq("kind", kind)
      .eq("period", currentPeriod())
      .maybeSingle();
    return (data as { count?: number } | null)?.count ?? 0;
  } catch {
    return 0;
  }
}
