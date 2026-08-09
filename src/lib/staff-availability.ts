import type { SupabaseClient } from "@supabase/supabase-js";

export interface StaffScheduleRow {
  start_time: string;
  end_time: string;
  working_days: number[];
}

/** staff.start_time/end_time/working_days'e göre randevunun mesai içinde olup olmadığını kontrol eder. */
export function isWithinWorkingHours(
  appointmentAt: string,
  durationMinutes: number,
  staff: StaffScheduleRow
): boolean {
  const d = new Date(appointmentAt);
  if (!staff.working_days.includes(d.getDay())) return false;

  const [sh, sm] = staff.start_time.split(":").map(Number);
  const [eh, em] = staff.end_time.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const apptStartMin = d.getHours() * 60 + d.getMinutes();
  const apptEndMin = apptStartMin + durationMinutes;
  return apptStartMin >= startMin && apptEndMin <= endMin;
}

/** Personelin (veya staff_id NULL ise işletme genelinin) o tarihte izinli/kapalı olup olmadığını kontrol eder. */
export async function isStaffOnTimeOff(
  supabase: SupabaseClient,
  orgId: string,
  staffId: string,
  appointmentAt: string
): Promise<boolean> {
  const dateStr = appointmentAt.slice(0, 10);
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

/** "Farketmez" seçildiğinde, hizmeti verebilen ve o saatte müsait olan ilk personeli bulur. */
export async function findAvailableStaff(
  supabase: SupabaseClient,
  orgId: string,
  serviceId: string,
  appointmentAt: string,
  durationMinutes: number
): Promise<string | null> {
  const { data: assigned } = await supabase
    .from("staff_services")
    .select("staff:staff!inner(id, org_id, is_active, start_time, end_time, working_days)")
    .eq("service_id", serviceId);

  // staff_services'te bu hizmete kimse atanmamışsa (salon sahibi hiç kısıtlama
  // yapmamış olabilir — çoğu işletme için varsayılan durum budur), online randevu
  // sayfasındaki müsaitlik gösterimiyle tutarlı olması için tüm aktif personeli
  // aday kabul et. Aksi halde "Farketmez" ile hiç randevu alınamaz (bkz. bu
  // fonksiyonun tetiklediği "Seçilen saatte uygun personel yok" hatası).
  let candidates: { staff: unknown }[] = assigned ?? [];
  if (candidates.length === 0) {
    const { data: allStaff } = await supabase
      .from("staff")
      .select("id, org_id, is_active, start_time, end_time, working_days")
      .eq("org_id", orgId)
      .eq("is_active", true);
    candidates = (allStaff ?? []).map((s) => ({ staff: s }));
  }

  for (const row of candidates) {
    const staff = row.staff as unknown as CandidateStaff;
    if (!staff || staff.org_id !== orgId || !staff.is_active) continue;
    if (!isWithinWorkingHours(appointmentAt, durationMinutes, staff)) continue;
    if (await isStaffOnTimeOff(supabase, orgId, staff.id, appointmentAt)) continue;
    if (await hasOverlappingAppointment(supabase, staff.id, appointmentAt, durationMinutes)) continue;
    return staff.id;
  }
  return null;
}
