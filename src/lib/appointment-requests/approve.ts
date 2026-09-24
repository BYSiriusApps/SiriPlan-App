import type { createClient, createAdminClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notify";
import { normalizePhone } from "@/lib/phone";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";

type SupabaseClient = Awaited<ReturnType<typeof createClient>> | Awaited<ReturnType<typeof createAdminClient>>;

export interface AppointmentRequestRow {
  id: string;
  org_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  staff_id: string | null;
  service_id: string;
  extra_services_json?: unknown;
  appointment_at: string;
  duration_minutes: number | null;
  price: number | null;
  source: string;
  note: string | null;
  proposed_appointment_at?: string | null;
  proposed_status?: string;
}

/**
 * appointment_requests → appointments dönüşümünün TEK gerçek uygulaması.
 * Hem panelden "Onayla" butonu hem müşterinin /oneri/[token] sayfasından
 * "Kabul Et" demesi bu fonksiyonu çağırır — mantık iki yerde tekrar
 * edilmesin, davranış asla sapmasın diye (appointment-requests/[id]/route.ts'ten
 * taşındı, 18 Eyl "Yeni Saat Öner" özelliği).
 */
export async function approveAppointmentRequest(
  supabase: SupabaseClient,
  orgId: string,
  reqRow: AppointmentRequestRow,
  opts?: { appointmentAtOverride?: string }
): Promise<{ appointment: Record<string, unknown> } | { error: string; status?: number }> {
  const effectiveAt = opts?.appointmentAtOverride ?? reqRow.appointment_at;

  const { data: service } = await supabase
    .from("services")
    .select("price, duration_minutes, name")
    .eq("id", reqRow.service_id)
    .eq("org_id", orgId)
    .single();

  const normalizedPhone = normalizePhone(reqRow.customer_phone);
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone", normalizedPhone)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        org_id: orgId,
        full_name: reqRow.customer_name,
        phone: normalizedPhone,
        email: reqRow.customer_email,
        source: reqRow.source,
      })
      .select("id")
      .single();
    if (newCustomer) customerId = newCustomer.id;
  }

  const svc = service as { price: number; duration_minutes: number; name: string } | null;
  const finalPrice = reqRow.price ?? svc?.price;
  const finalDuration = reqRow.duration_minutes ?? svc?.duration_minutes;

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      org_id: orgId,
      customer_id: customerId,
      customer_name: reqRow.customer_name,
      customer_phone: reqRow.customer_phone,
      staff_id: reqRow.staff_id,
      assigned_staff_id: reqRow.staff_id,
      service_id: reqRow.service_id,
      extra_services_json: reqRow.extra_services_json,
      appointment_at: effectiveAt,
      duration_minutes: finalDuration,
      price: finalPrice,
      source: reqRow.source,
      note: reqRow.note,
      status: "onaylandi",
      is_auto: false,
    })
    .select("*")
    .single();

  if (apptErr) {
    const pgErr = apptErr as { code?: string; message?: string };
    if (pgErr.code === "23P01") {
      return { error: "Bu saatte personelin başka bir randevusu var. Lütfen farklı bir saat seçin veya çakışan randevuyu düzenleyin.", status: 409 };
    }
    return { error: apptErr.message, status: 500 };
  }

  await supabase
    .from("appointment_requests")
    .update({
      status: "approved",
      proposed_status: reqRow.proposed_status === "pending" ? "accepted" : reqRow.proposed_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reqRow.id);

  notifyAppointment({
    id: (appt as { id: string }).id,
    org_id: orgId,
    customer_name: reqRow.customer_name,
    customer_phone: reqRow.customer_phone,
    appointment_at: effectiveAt,
    service_id: reqRow.service_id,
    staff_id: reqRow.staff_id,
    assigned_staff_id: reqRow.staff_id,
    price: finalPrice,
    note: reqRow.note,
    source: reqRow.source,
  }).catch((err) => console.error("[approveAppointmentRequest] notifyAppointment hata:", err));

  if (reqRow.customer_phone) {
    const { date, time } = formatApptDateTime(effectiveAt);
    sendPurposeTemplate({
      toPhone: reqRow.customer_phone,
      orgId,
      purpose: "onay",
      vars: { customer_name: reqRow.customer_name, date, time },
      appointmentAt: effectiveAt,
      cancelToken: (appt as { cancel_token?: string }).cancel_token,
    })
      .then((r) => console.log(`[approveAppointmentRequest] onay WA sonucu — id=${reqRow.id}`, JSON.stringify(r)))
      .catch((err) => console.error("[approveAppointmentRequest] sendPurposeTemplate(onay) hata:", err));
  }

  return { appointment: appt as Record<string, unknown> };
}
