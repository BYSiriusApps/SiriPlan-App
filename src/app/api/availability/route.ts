import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

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

  const supabase = await createClient();

  // Get service duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Get staff working hours
  const { data: staff } = await supabase
    .from("staff")
    .select("org_id, start_time, end_time, working_days")
    .eq("id", staffId)
    .single();

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
  const allSlots = generateSlots(staff.start_time, staff.end_time, service.duration_minutes);

  // Get existing appointments for that day and staff
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const { data: existing } = await supabase
    .from("appointments")
    .select("appointment_at, duration_minutes")
    .eq("staff_id", staffId)
    .gte("appointment_at", dayStart)
    .lte("appointment_at", dayEnd)
    .not("status", "in", '("iptal","gelmedi")');

  // Convert existing appointments to occupied minute ranges
  const occupied: Array<{ start: number; end: number }> = (existing || []).map((a) => {
    const d = new Date(a.appointment_at);
    const startMin = d.getHours() * 60 + d.getMinutes();
    return { start: startMin, end: startMin + a.duration_minutes };
  });

  // Filter out occupied slots
  const available = allSlots.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + service.duration_minutes;
    return !occupied.some((o) => slotStart < o.end && slotEnd > o.start);
  });

  // Don't return past slots for today
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const finalSlots = date === todayStr
    ? available.filter((s) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 30;
      })
    : available;

  return NextResponse.json({ slots: finalSlots });
}
