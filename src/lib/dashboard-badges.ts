import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { monthlyWaMessageLimit } from "@/lib/entitlements";
import { getPlanUsage } from "@/lib/plan-usage";

export interface DashboardBadgeCounts {
  /** Sidebar/MobileNav "Bekleyen İşler" rozeti — stok + talep + telefonsuz + gecikmiş toplamı. */
  pendingWorkCount: number;
  /** Randevu linki/WhatsApp/Instagram üzerinden gelen, henüz onaylanmamış talep sayısı (rol kısıtı burada YOK). */
  pendingApprovalsCount: number;
  /** Kritik stok seviyesinin altındaki ürün sayısı. */
  lowStockCount: number;
  /** Mini plan: bu ayki müşteri WhatsApp mesajı kullanımı. Sınırsız planlarda null. */
  waQuota: { used: number; limit: number } | null;
}

/**
 * Önceden `dashboard/layout.tsx`'te HER panel sayfası geçişinde senkron
 * çalışan 5 sorgu (stok + 4 randevu sayımı) buradaydı — hesap birebir aynı,
 * yalnızca taşındı + `unstable_cache` ile 20 sn önbelleklendi (bkz. çağıran
 * `getDashboardBadgeCounts`). Servis rolü (`createAdminClient`) kullanılıyor
 * çünkü `unstable_cache` içinde `cookies()` çağrısı yapılamıyor (Next.js
 * kısıtı); güvenlik sınırı `.eq("org_id", orgId)` filtreleriyle korunuyor —
 * `orgId` yalnızca çağıran tarafta zaten doğrulanmış `getActiveMember()`
 * sonucundan geliyor (bkz. dashboard/layout.tsx, /api/dashboard/badge-counts).
 */
async function computeDashboardBadgeCounts(orgId: string): Promise<DashboardBadgeCounts> {
  const supabase = await createAdminClient();
  const nowIso = new Date().toISOString();
  // Mini planın aylık mesaj sınırı için plan bilgisi (diğer planlarda sonuç null → ek sorgu yok).
  const orgPromise = supabase.from("organizations").select("plan, trial_ends_at").eq("id", orgId).single();

  const [{ data: inventoryItems }, { count: talepCount }, { count: requestCount }, { count: missingPhoneCount }, { data: overdueRaw }] =
    await Promise.all([
      supabase
        .from("inventory_items")
        .select("current_stock, min_stock_alert")
        .eq("org_id", orgId)
        .eq("is_active", true),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "talep"),
      supabase
        .from("appointment_requests")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "pending"),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("customer_phone", "")
        .neq("status", "iptal"),
      supabase
        .from("appointments")
        .select("appointment_at, duration_minutes")
        .eq("org_id", orgId)
        .eq("status", "onaylandi")
        .lt("appointment_at", nowIso)
        .limit(500),
    ]);

  let lowStockCount = 0;
  if (inventoryItems) {
    lowStockCount = inventoryItems.filter(
      (item: { current_stock: number; min_stock_alert: number | null }) =>
        Number(item.min_stock_alert) > 0 && Number(item.current_stock) <= Number(item.min_stock_alert)
    ).length;
  }

  const nowMs = new Date(nowIso).getTime();
  const overdueCount = (overdueRaw ?? []).filter(
    (a: { appointment_at: string; duration_minutes: number | null }) =>
      new Date(a.appointment_at).getTime() + Number(a.duration_minutes || 0) * 60_000 < nowMs
  ).length;

  const pendingApprovalsCount = (talepCount ?? 0) + (requestCount ?? 0);
  const pendingWorkCount = lowStockCount + (requestCount ?? 0) + (missingPhoneCount ?? 0) + (talepCount ?? 0) + overdueCount;

  let waQuota: DashboardBadgeCounts["waQuota"] = null;
  const { data: orgRow } = await orgPromise;
  const waLimit = monthlyWaMessageLimit(orgRow);
  if (waLimit !== null) {
    waQuota = { used: Math.min(await getPlanUsage(orgId, "wa_message"), waLimit), limit: waLimit };
  }

  return { pendingWorkCount, pendingApprovalsCount, lowStockCount, waQuota };
}

/**
 * 20 sn önbellek: bu sayıların saniyelik hassasiyete ihtiyacı yok (yeni bir
 * randevu/talep geldiğinde LiveNotifications realtime kanalıyla zaten ayrıca
 * tazeleniyor, bkz. components/dashboard/LiveNotifications.tsx). Art arda
 * panel içi gezinmede (Takvim→Müşteriler→Randevular gibi) aynı 20 sn
 * penceresinde bu 5 sorgu tekrar tekrar çalışmaz — cache hit anlık döner.
 */
export const getDashboardBadgeCounts = unstable_cache(
  computeDashboardBadgeCounts,
  ["dashboard-badge-counts"],
  { revalidate: 20 }
);
