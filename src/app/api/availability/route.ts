import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { istanbulDateStr, istanbulMinutesOfDay, zonedWallTimeToUtc } from "@/lib/istanbul-time";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

// Bu uç herkese açık (anonim randevu sayfası kullanır) ve artık service role ile
// çalışıyor — anon rolünün appointments/staff tablolarına doğrudan erişimi
// kaldırıldı (bkz. 20260817_public_data_lockdown.sql). Service role Node
// runtime'ı gerektirdiği için edge'den nodejs'e alındı.
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Generate time slots between start and end, every `step` minutes
function generateSlots(startTime: string, endTime: string, durationMins: number, stepMins = 15) {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em - durationMins;
  while (current <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += stepMins;
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgSlug = searchParams.get("slug");
  const staffId = searchParams.get("staff_id");
  const serviceId = searchParams.get("service_id");
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!orgSlug || !staffId || !serviceId || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Girdi doğrulaması: staffId aşağıda PostgREST'in `.or(...)` filtre metnine
  // string olarak GÖMÜLÜYOR. Doğrulanmazsa saldırgan `staff_id.eq.x,org_id.eq.y`
  // gibi bir değerle filtre mantığını değiştirebilir (PostgREST filtre
  // enjeksiyonu). UUID/tarih biçimi zorunlu kılınarak bu kapatılıyor.
  if (!UUID_RE.test(staffId) || !UUID_RE.test(serviceId) || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Geçersiz parametre" }, { status: 400 });
  }
  // "Farketmez" akışında her personel için bir istek atılır; bir salonun 15
  // personeli varsa tek ziyaretçi 15 istek yapabilir. Tavan buna göre geniş
  // tutuldu, yine de takvim kazıma denemelerini keser.
  const limit = limitByIp(req, "availability", 240, 60_000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  const supabase = await createAdminClient();

  // Salon slug'ı üzerinden org çözülür. Önceden org, doğrudan staff_id'den
  // türetiliyordu ve slug hiç doğrulanmıyordu — başka bir salonun personel
  // id'si verilerek o personelin çalışma saatleri ve dolu saatleri
  // sorgulanabiliyordu. Artık personel/hizmetin bu org'a ait olması şart.
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("id, timezone, settings_json")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!orgRow) return NextResponse.json({ error: "Salon bulunamadı" }, { status: 404 });
  const timeZone = orgRow.timezone || "Europe/Istanbul";
  const stepMins = Number((orgRow.settings_json as Record<string, unknown> | null)?.booking_slot_minutes) || 15;

  // Get service duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .eq("org_id", orgRow.id)
    .maybeSingle();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Get staff working hours
  const { data: staff } = await supabase
    .from("staff")
    .select("org_id, start_time, end_time, working_days")
    .eq("id", staffId)
    .eq("org_id", orgRow.id)
    .maybeSingle();

  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  // Check if staff works on this day
  const dayOfWeek = new Date(date + "T12:00:00").getDay(); // 0=Sun
  if (!(staff.working_days as number[]).includes(dayOfWeek)) {
    return NextResponse.json({ slots: [], reason: "off_day" });
  }

  // Personel izinli mi veya işletme geneli kapalı gün mü? (staff_time_off, staff_id NULL = geneli kapatır)
  const { data: timeOff } = await supabase
    .from("staff_time_off")
    .select("id")
    .eq("org_id", staff.org_id ?? "")
    .or(`staff_id.eq.${staffId},staff_id.is.null`)
    .lte("starts_on", date)
    .gte("ends_on", date)
    .limit(1);
  if (timeOff && timeOff.length > 0) {
    return NextResponse.json({ slots: [], reason: "time_off" });
  }

  // Generate all theoretical slots
  const allSlots = generateSlots(staff.start_time, staff.end_time, service.duration_minutes, stepMins);

  // Get existing appointments for that day and staff.
  // Sınırlar işletmenin saat dilimine göre MUTLAK ana çevrilir: ham
  // "2026-08-20T00:00:00" metni veritabanı oturumunun saat diliminde (UTC)
  // yorumlanıyordu, bu yüzden UTC+3'te gece yarısına yakın randevular yanlış
  // güne düşüp dolu saatler boş görünebiliyordu.
  const dayStart = zonedWallTimeToUtc(date, "00:00", timeZone).toISOString();
  const dayEnd = new Date(zonedWallTimeToUtc(date, "00:00", timeZone).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("appointments")
    .select("appointment_at, duration_minutes")
    .eq("org_id", orgRow.id)
    .eq("staff_id", staffId)
    .gte("appointment_at", dayStart)
    .lt("appointment_at", dayEnd)
    .not("status", "in", '("iptal","gelmedi")');

  // Convert existing appointments to occupied minute ranges (İstanbul yerel saatine göre —
  // sunucu UTC çalışır, ham getHours() var olan randevuları 3 saat kaydırıp
  // dolu saatleri boşmuş gibi gösteriyordu).
  const occupied: Array<{ start: number; end: number }> = (existing || []).map((a) => {
    const d = new Date(a.appointment_at);
    const startMin = istanbulMinutesOfDay(d, timeZone);
    return { start: startMin, end: startMin + a.duration_minutes };
  });

  // Filter out occupied slots
  const available = allSlots.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + service.duration_minutes;
    return !occupied.some((o) => slotStart < o.end && slotEnd > o.start);
  });

  // Don't return past slots for today (İstanbul yerel saatine göre)
  const now = new Date();
  const todayStr = istanbulDateStr(now, timeZone);
  const finalSlots = date === todayStr
    ? available.filter((s) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m > istanbulMinutesOfDay(now, timeZone) + 30;
      })
    : available;

  return NextResponse.json({ slots: finalSlots });
}
