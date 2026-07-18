import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { subMinutes, subHours } from "date-fns";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();
  // Başlangıcının üzerinden 15+ dk geçmiş ve hâlâ "onaylandi" olan randevular.
  // Alt sınır 24 saat: cron aralığı ne olursa olsun randevu kaçırılmaz,
  // çok eski kayıtlara da dokunulmaz.
  const windowStart = subHours(now, 24).toISOString();
  const windowEnd = subMinutes(now, 15).toISOString();

  const { data: pastAppts } = await supabase
    .from("appointments")
    .select("id, customer_id, customer_phone, appointment_at, duration_minutes")
    .eq("status", "onaylandi")
    .gte("appointment_at", windowStart)
    .lte("appointment_at", windowEnd);

  if (!pastAppts || pastAppts.length === 0) {
    return NextResponse.json({ marked: 0 });
  }

  // Mark as gelmedi
  const ids = pastAppts.map((a) => a.id);
  await supabase
    .from("appointments")
    .update({ status: "gelmedi" })
    .in("id", ids);

  return NextResponse.json({ marked: ids.length });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
