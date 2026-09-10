/**
 * Paket / seans takibi — paylaşılan iş mantığı.
 *
 * Randevu tamamlama (`/api/appointments/[id]/complete`), müşteri detayındaki
 * elle "seans düş" düğmesi ve `/api/packages/*` uçları buradan geçer. Böylece
 * `customer_package_usages` insert'i ve eşleştirme mantığı tek yerde kalır.
 * `used_sessions` + `status` senkronu DB trigger'ında (tr_sync_package_counter).
 *
 * NOT: Çağıran org doğrulamasını (getActiveMember) yapmış olmalıdır. Verilen
 * `supabase` istemcisi RLS kapsamlı kullanıcı ya da admin istemci olabilir;
 * tüm sorgular `orgId` ile sınırlanır.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerPackage } from "@/types/database";

export interface ActivePackageMatch {
  id: string;
  name: string;
  total_sessions: number;
  used_sessions: number;
  remaining: number;
  service_id: string | null;
  expires_at: string | null;
}

/**
 * Bir müşterinin belirli bir hizmet için kullanabileceği aktif paketi bulur.
 * En yakında biten (expires_at) veya en eski paket önce tüketilir.
 * `serviceId` verilmezse hizmete bağlı olmayan (service_id IS NULL) paketlere bakar.
 */
export async function findActivePackageForService(
  supabase: SupabaseClient,
  orgId: string,
  customerId: string,
  serviceId: string | null,
): Promise<ActivePackageMatch | null> {
  if (!customerId) return null;

  let query = supabase
    .from("customer_packages")
    .select("id, name, total_sessions, used_sessions, service_id, expires_at, status")
    .eq("org_id", orgId)
    .eq("customer_id", customerId)
    .eq("status", "active");

  query = serviceId ? query.eq("service_id", serviceId) : query.is("service_id", null);

  const { data } = await query;
  const rows = (data ?? []) as Pick<
    CustomerPackage,
    "id" | "name" | "total_sessions" | "used_sessions" | "service_id" | "expires_at"
  >[];

  const today = new Date().toISOString().slice(0, 10);
  const usable = rows
    .map((p) => ({
      id: p.id,
      name: p.name,
      total_sessions: p.total_sessions,
      used_sessions: p.used_sessions,
      remaining: p.total_sessions - p.used_sessions,
      service_id: p.service_id,
      expires_at: p.expires_at,
    }))
    .filter((p) => p.remaining > 0 && (!p.expires_at || p.expires_at >= today))
    .sort((a, b) => {
      if (a.expires_at && b.expires_at) return a.expires_at.localeCompare(b.expires_at);
      if (a.expires_at) return -1;
      if (b.expires_at) return 1;
      return 0;
    });

  return usable[0] ?? null;
}

export interface RecordUsageResult {
  ok: boolean;
  error?: string;
  /** Zaten düşülmüştü (aynı randevu) — hata değil, sessiz geçilir. */
  alreadyUsed?: boolean;
  usageId?: string;
  remaining?: number;
  packageName?: string;
  packageCompleted?: boolean;
}

/**
 * Bir paketten seans düşer (delta = +1). `appointmentId` verilirse aynı randevu
 * için ikinci kez çağrılsa bile (unique index) `alreadyUsed: true` döner.
 */
export async function recordPackageUsage(
  supabase: SupabaseClient,
  orgId: string,
  userId: string | null,
  input: { packageId: string; appointmentId?: string | null; note?: string | null },
): Promise<RecordUsageResult> {
  const { packageId, appointmentId = null, note = null } = input;
  if (!packageId) return { ok: false, error: "Paket belirtilmedi" };

  const { data: pkg } = await supabase
    .from("customer_packages")
    .select("id, name, total_sessions, used_sessions, status, expires_at")
    .eq("id", packageId)
    .eq("org_id", orgId)
    .single();

  if (!pkg) return { ok: false, error: "Paket bulunamadı" };
  if (pkg.status === "cancelled") return { ok: false, error: "Paket iptal edilmiş" };

  const remainingBefore = pkg.total_sessions - pkg.used_sessions;
  if (remainingBefore <= 0) {
    return { ok: false, error: "Pakette kalan seans yok" };
  }

  // Aynı randevu bu paketten daha önce düştü mü? (unique index'e güvenmek yerine
  // önce bakıp anlamlı sonuç döndürüyoruz.)
  if (appointmentId) {
    const { data: existing } = await supabase
      .from("customer_package_usages")
      .select("id")
      .eq("package_id", packageId)
      .eq("appointment_id", appointmentId)
      .eq("delta", 1)
      .maybeSingle();
    if (existing) {
      return {
        ok: true,
        alreadyUsed: true,
        remaining: remainingBefore,
        packageName: pkg.name,
      };
    }
  }

  const { data: usage, error } = await supabase
    .from("customer_package_usages")
    .insert({
      org_id: orgId,
      package_id: packageId,
      appointment_id: appointmentId,
      delta: 1,
      note: note?.trim() || null,
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation (yarış durumunda ikinci çağrı)
    if ((error as { code?: string }).code === "23505") {
      return { ok: true, alreadyUsed: true, remaining: remainingBefore, packageName: pkg.name };
    }
    return { ok: false, error: error.message };
  }

  const remaining = remainingBefore - 1;
  return {
    ok: true,
    usageId: usage.id,
    remaining,
    packageName: pkg.name,
    packageCompleted: remaining <= 0,
  };
}

/**
 * Yanlış düşülen bir seansı geri alır (delta = -1). `appointmentId` verilirse
 * o randevunun +1 hareketini nötrler.
 */
export async function revertPackageUsage(
  supabase: SupabaseClient,
  orgId: string,
  userId: string | null,
  input: { packageId: string; appointmentId?: string | null; note?: string | null },
): Promise<RecordUsageResult> {
  const { packageId, appointmentId = null, note = null } = input;
  if (!packageId) return { ok: false, error: "Paket belirtilmedi" };

  const { data: pkg } = await supabase
    .from("customer_packages")
    .select("id, name, total_sessions, used_sessions")
    .eq("id", packageId)
    .eq("org_id", orgId)
    .single();
  if (!pkg) return { ok: false, error: "Paket bulunamadı" };
  if (pkg.used_sessions <= 0) return { ok: false, error: "Geri alınacak seans yok" };

  const { error } = await supabase.from("customer_package_usages").insert({
    org_id: orgId,
    package_id: packageId,
    appointment_id: appointmentId,
    delta: -1,
    note: note?.trim() || "Seans geri alındı",
    ...(userId ? { created_by: userId } : {}),
  });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    remaining: pkg.total_sessions - pkg.used_sessions + 1,
    packageName: pkg.name,
  };
}
