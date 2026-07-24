import { createAdminClient } from "@/lib/supabase/server";

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
