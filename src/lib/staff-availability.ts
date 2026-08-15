import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_TIMEZONE, istanbulDateStr, istanbulDayOfWeek, istanbulMinutesOfDay } from "@/lib/istanbul-time";
import { resolveEligibleStaffIds } from "@/lib/staff-eligibility";

export interface StaffScheduleRow {
  start_time: string;
  end_time: string;
  working_days: number[];
}

/** staff.start_time/end_time/working_days'e göre randevunun mesai içinde olup olmadığını kontrol eder.
 * timeZone verilmezse geriye dönük uyumluluk için Europe/Istanbul kullanılır. */
export function isWithinWorkingHours(
  appointmentAt: string,
  durationMinutes: number,
  staff: StaffScheduleRow,
  timeZone: string = DEFAULT_ORG_TIMEZONE
): boolean {
  const d = new Date(appointmentAt);
  if (!staff.working_days.includes(istanbulDayOfWeek(d, timeZone))) return false;

  const [sh, sm] = staff.start_time.split(":").map(Number);
  const [eh, em] = staff.end_time.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const apptStartMin = istanbulMinutesOfDay(d, timeZone);
  const apptEndMin = apptStartMin + durationMinutes;
  return apptStartMin >= startMin && apptEndMin <= endMin;
}

/** Personelin (veya staff_id NULL ise işletme genelinin) o tarihte izinli/kapalı olup olmadığını kontrol eder. */
export async function isStaffOnTimeOff(
  supabase: SupabaseClient,
  orgId: string,
  staffId: string,
  appointmentAt: string,
  timeZone: string = DEFAULT_ORG_TIMEZONE
): Promise<boolean> {
  const dateStr = istanbulDateStr(new Date(appointmentAt), timeZone);
  const { data } = await supabase
    .from("staff_time_off")
    .select("id")
    .eq("org_id", orgId)
    .or(`staff_id.eq.${staffId},staff_id.is.null`)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .limit(1);
  return !!data && data.length > 0;
}

/** Aynı personelin, verilen zaman aralığıyla çakışan (iptal/gelmedi hariç) bir randevusu var mı? */
export async function hasOverlappingAppointment(
  supabase: SupabaseClient,
  staffId: string,
  appointmentAt: string,
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const start = new Date(appointmentAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const scanFrom = new Date(start.getTime() - 24 * 60 * 60000);

  let query = supabase
    .from("appointments")
    .select("id, appointment_at, duration_minutes")
    .eq("staff_id", staffId)
    .not("status", "in", '("iptal","gelmedi")')
    .gte("appointment_at", scanFrom.toISOString())
    .lt("appointment_at", end.toISOString());
  if (excludeAppointmentId) query = query.neq("id", excludeAppointmentId);

  const { data } = await query;
  return (data || []).some((a) => {
    const aStart = new Date(a.appointment_at);
    const aEnd = new Date(aStart.getTime() + a.duration_minutes * 60000);
    return aStart < end && aEnd > start;
  });
}

interface CandidateStaff extends StaffScheduleRow {
  id: string;
  org_id: string;
  is_active: boolean;
}

/**
 * "Farketmez" seçildiğinde, hizmeti verebilen ve o saatte müsait olan personeller
 * arasından, o gün içinde en az randevusu olanı (yoğunluğa göre dengeli dağıtım)
 * seçer. Örn. A personeli o gün 3 randevu almışsa, B personeli 1 almışsa, "Farketmez"
 * randevusu B'ye atanır.
 *
 * Aday listesi resolveEligibleStaffIds (bkz. staff-eligibility.ts) ile belirlenir —
 * bu, frontend'in (PublicBookingClient) müşteriye "müsait" diye gösterdiği personel
 * listesiyle birebir aynı kuralı kullanır. Ayrı ayrı yazılmasın.
 */
export async function findAvailableStaff(
  supabase: SupabaseClient,
  orgId: string,
  serviceId: string,
  appointmentAt: string,
  durationMinutes: number,
  timeZone: string = DEFAULT_ORG_TIMEZONE
): Promise<string | null> {
  const { data: allStaff } = await supabase
    .from("staff")
    .select("id, org_id, is_active, start_time, end_time, working_days")
    .eq("org_id", orgId)
    .eq("is_active", true);
  const activeStaff: CandidateStaff[] = (allStaff ?? []) as CandidateStaff[];

  const { data: assignedRows } = await supabase
    .from("staff_services")
    .select("staff_id")
    .eq("service_id", serviceId);
  const assignedIds = (assignedRows ?? []).map((r) => r.staff_id as string);

  // staff_services'te bu hizmete kimse atanmamışsa, ya da atanan personelin
  // hepsi sonradan pasife alınmışsa, tüm aktif personeli aday kabul et —
  // aksi halde "Farketmez" ile hiç randevu alınamaz (bkz. bu fonksiyonun
  // tetiklediği "Seçilen saatte uygun personel yok" hatası).
  const eligibleIds = new Set(resolveEligibleStaffIds(activeStaff.map((s) => s.id), assignedIds));
  const candidates = activeStaff.filter((s) => eligibleIds.has(s.id));

  const available: CandidateStaff[] = [];
  for (const staff of candidates) {
    if (!isWithinWorkingHours(appointmentAt, durationMinutes, staff, timeZone)) continue;
    if (await isStaffOnTimeOff(supabase, orgId, staff.id, appointmentAt, timeZone)) continue;
    if (await hasOverlappingAppointment(supabase, staff.id, appointmentAt, durationMinutes)) continue;
    available.push(staff);
  }
  if (available.length === 0) return null;
  if (available.length === 1) return available[0].id;

  // Uygun personeller arasından o gün (işletmenin yerel timezone'ında) en az
  // randevusu olanı bul — appointment_at gerçek UTC anı olduğu için düz string
  // slice yerine timezone'a göre gün sınırı hesaplanmalı (gece yarısına yakın
  // randevularda yanlış güne düşmesin).
  const dateStr = istanbulDateStr(new Date(appointmentAt), timeZone);
  const { data: dayAppts } = await supabase
    .from("appointments")
    .select("staff_id")
    .eq("org_id", orgId)
    .not("status", "in", '("iptal","gelmedi")')
    .gte("appointment_at", `${dateStr}T00:00:00`)
    .lte("appointment_at", `${dateStr}T23:59:59`)
    .in("staff_id", available.map((s) => s.id));

  const counts = new Map<string, number>();
  for (const a of dayAppts ?? []) {
    counts.set(a.staff_id, (counts.get(a.staff_id) ?? 0) + 1);
  }

  available.sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
  return available[0].id;
}
