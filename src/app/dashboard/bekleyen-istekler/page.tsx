import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { BekleyenIsteklerClient } from "./BekleyenIsteklerClient";

export default async function BekleyenIsteklerPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const nowIso = new Date().toISOString();

  const [{ data: requests }, { data: talepRaw }, { data: inventoryItems }, { data: overdueRaw }, { data: staffRows }, { data: missingPhoneRaw }] = await Promise.all([
    supabase
      .from("appointment_requests")
      .select("*, staff(full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    // Randevu linkinden (/r/[slug]) gelip otomatik onay kapalıyken doğrudan
    // appointments'a "talep" durumuyla düşen kayıtlar — appointment_requests'ten
    // AYRI bir tablo/akış (bkz. /api/appointments POST, webAutoBookingEligible).
    // Daha önce yalnızca "Bekleme Listesi" sayfasında görünüyorlardı; salon
    // sahibi "Bekleyen İstekler"de aradığında bulamıyordu, burada da gösteriyoruz.
    supabase
      .from("appointments")
      .select("id, customer_name, customer_phone, appointment_at, duration_minutes, price, note, staff_id, staff:staff!appointments_staff_id_fkey(full_name), service:services(name), proposed_status, proposed_appointment_at")
      .eq("org_id", member.org_id)
      .eq("status", "talep")
      .order("appointment_at", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("id, name, current_stock, min_stock_alert, unit")
      .eq("org_id", member.org_id)
      .eq("is_active", true),
    // Randevu saati geçmiş ama hâlâ "Onaylandı" durumunda kalmış randevular —
    // personel tamamlandı/gelmedi/iptal işaretlemeyi unutmuş olabilir, iş
    // listesinde eksik kalmasınlar.
    supabase
      .from("appointments")
      .select("id, customer_name, appointment_at, duration_minutes, price, staff_id, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .eq("status", "onaylandi")
      .lt("appointment_at", nowIso)
      .order("appointment_at", { ascending: true })
      .limit(200),
    supabase
      .from("staff")
      .select("id, full_name")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    // Sesli/hızlı randevuda telefon bilinmeden oluşturulmuş kayıtlar (bkz. dashboard
    // layout'taki aynı sayaç) — burada tek tek listelenip numara tamamlanabiliyor.
    supabase
      .from("appointments")
      .select("id, customer_name, appointment_at, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .eq("customer_phone", "")
      .neq("status", "iptal")
      .order("appointment_at", { ascending: false })
      .limit(50),
  ]);

  type InvRow = { id: string; name: string; current_stock: number; min_stock_alert: number; unit: string };
  const criticalStock = ((inventoryItems ?? []) as InvRow[])
    .filter((i) => Number(i.min_stock_alert) > 0 && Number(i.current_stock) <= Number(i.min_stock_alert))
    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock));

  type OverdueRow = {
    id: string; customer_name: string; appointment_at: string; duration_minutes: number;
    price: number; staff_id: string | null;
    staff: { full_name: string } | null; service: { name: string } | null;
  };
  const now = new Date(nowIso).getTime();
  const overdueAppointments = ((overdueRaw ?? []) as unknown as OverdueRow[]).filter(
    (a) => new Date(a.appointment_at).getTime() + Number(a.duration_minutes || 0) * 60_000 < now
  );
  const canActOnAll = member.role !== "staff";

  type MissingPhoneRow = {
    id: string; customer_name: string; appointment_at: string;
    staff: { full_name: string } | null; service: { name: string } | null;
  };
  const missingPhone = ((missingPhoneRaw ?? []) as unknown as MissingPhoneRow[]).map((a) => ({
    id: a.id,
    customer_name: a.customer_name,
    appointment_at: a.appointment_at,
    staff_name: a.staff?.full_name ?? null,
    service_name: a.service?.name ?? null,
  }));

  type MemberWithOrg = { org_id: string; role: string; organizations: { settings_json: Record<string, unknown> | null } | null };
  const m = member as unknown as MemberWithOrg;
  const settings = (m.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhone = m.role !== "staff" || staffPhoneAccess;
  const rawSlotMinutes = Number(settings.booking_slot_minutes);
  const bookingSlotMinutes = [15, 30, 60].includes(rawSlotMinutes) ? rawSlotMinutes : 15;

  type TalepRow = {
    id: string; customer_name: string; customer_phone: string; appointment_at: string;
    duration_minutes: number | null; price: number | null; note: string | null;
    staff_id: string | null; staff: { full_name: string } | null; service: { name: string } | null;
    proposed_status?: "none" | "pending" | "accepted" | "rejected"; proposed_appointment_at?: string | null;
  };
  const talepAppointments = (talepRaw ?? []) as unknown as TalepRow[];

  return (
    <BekleyenIsteklerClient
      initialRequests={requests || []}
      initialTalepAppointments={talepAppointments}
      showPhone={showPhone}
      bookingSlotMinutes={bookingSlotMinutes}
      criticalStock={criticalStock}
      missingPhone={missingPhone}
      staffOptions={staffRows || []}
      canReassignStaff={canActOnAll}
      overdueAppointments={overdueAppointments.map((a) => ({
        id: a.id,
        customer_name: a.customer_name,
        appointment_at: a.appointment_at,
        duration_minutes: a.duration_minutes,
        price: a.price,
        staff_name: a.staff?.full_name ?? null,
        service_name: a.service?.name ?? null,
        canAct: canActOnAll || a.staff_id === member.staff_id,
      }))}
    />
  );
}
