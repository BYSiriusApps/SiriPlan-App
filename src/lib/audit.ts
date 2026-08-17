import { createAdminClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

/**
 * KVKK denetim izi — "kim, ne zaman, hangi IP'den, hangi kişisel veriye
 * dokundu" sorusunun cevabı. Veri ihlali bildiriminde (KVKK m.12) ve bir
 * personelin müşteri listesini dışarı çıkarmasından şüphelenildiğinde
 * dayanılacak tek kayıt budur.
 *
 * audit_logs'ta yalnızca SELECT policy'si var (INSERT yok) — bu yüzden admin
 * client (service role) ile yazılır; böylece kayıt oluşturan kullanıcı kendi
 * izini silemez/değiştiremez. Hata olursa ana akış BLOKLANMAZ: denetim kaydı
 * tutulamadı diye salon sahibinin raporunu indirememesi kabul edilebilir bir
 * takas değil.
 */
export async function logAudit(params: {
  orgId: string;
  userId: string;
  /** Serbest metin eylem kodu — örn. "data_export", "campaign_bulk_send". */
  action: string;
  tableName?: string;
  recordId?: string | null;
  /** Eylemin kapsamı: kaç kayıt, hangi format, hangi kanal… */
  details?: Record<string, unknown>;
  /** İstek nesnesi verilirse IP otomatik çıkarılır. */
  req?: NextRequest;
}): Promise<void> {
  try {
    const supabase = await createAdminClient();
    await supabase.from("audit_logs").insert({
      org_id: params.orgId,
      user_id: params.userId,
      action: params.action,
      table_name: params.tableName ?? null,
      record_id: params.recordId ?? null,
      new_data: params.details ?? null,
      // INET kolonu: "unknown" gibi IP olmayan değerler insert'i patlatır,
      // o yüzden ayrıştırılamayan durumda null bırakılır.
      ip_address: params.req ? normalizeIp(clientIp(params.req)) : null,
    });
  } catch {
    console.error(`[audit] '${params.action}' kaydedilemedi (org: ${params.orgId})`);
  }
}

/** INET kolonuna yazılamayacak değerleri (örn. "unknown") null'a çevirir. */
function normalizeIp(ip: string): string | null {
  if (!ip || ip === "unknown") return null;
  // IPv4 veya IPv6 kaba kontrolü — port ekli değerleri de eler.
  return /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}

/**
 * Randevu durum değişikliklerini audit_logs'a yazar. audit_logs tablosunda
 * sadece SELECT RLS policy'si var (INSERT yok) — bu yüzden admin client
 * (service role, RLS bypass) kullanılır. Hata olursa ana akışı bloklamaz.
 */
export async function logAppointmentStatusChange(params: {
  orgId: string;
  userId: string;
  actorName: string;
  appointmentId: string;
  staffId: string | null;
  customerName: string;
  appointmentAt: string;
  oldStatus: string;
  newStatus: string;
}): Promise<void> {
  try {
    const supabase = await createAdminClient();
    await supabase.from("audit_logs").insert({
      org_id: params.orgId,
      user_id: params.userId,
      action: "appointment_status_change",
      table_name: "appointments",
      record_id: params.appointmentId,
      old_data: { status: params.oldStatus },
      new_data: {
        status: params.newStatus,
        staff_id: params.staffId,
        customer_name: params.customerName,
        appointment_at: params.appointmentAt,
        actor_name: params.actorName,
      },
    });
  } catch {
    console.error("[audit] Randevu durum değişikliği kaydedilemedi:", params.appointmentId);
  }
}
