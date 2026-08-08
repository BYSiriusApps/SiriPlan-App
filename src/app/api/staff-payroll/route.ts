import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

/**
 * Personel maaş hesaplama özeti — tamamlanan randevu cirosu üzerinden
 * (taban maaş + komisyon + bahşiş) toplamını döner. Kayıt oluşturmaz;
 * kaydetme işlemi mevcut /api/expenses uç noktası üzerinden yapılır.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  const m = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const rangeStart = `${year}-${m}-01T00:00:00`;
  const rangeEnd = `${year}-${m}-${String(lastDay).padStart(2, "0")}T23:59:59`;

  type StaffRow = { id: string; full_name: string; commission_rate: number; base_salary?: number };

  const [staffRes, apptRes] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, base_salary, commission_rate")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("appointments")
      .select("staff_id, price, tip")
      .eq("org_id", member.org_id)
      .eq("status", "tamamlandi")
      .gte("appointment_at", rangeStart)
      .lte("appointment_at", rangeEnd),
  ]);

  let staffList = staffRes.data as StaffRow[] | null;
  let staffErr = staffRes.error;
  const { data: appts, error: apptErr } = apptRes;

  // Migration 20260808 (base_salary) henüz uygulanmamışsa kolon olmadan tekrar dene.
  if (staffErr && staffErr.message.includes("base_salary")) {
    const retry = await supabase
      .from("staff")
      .select("id, full_name, commission_rate")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order");
    staffList = retry.data as StaffRow[] | null;
    staffErr = retry.error;
  }

  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });

  const byStaff: Record<string, { revenue: number; tip: number }> = {};
  for (const a of appts ?? []) {
    const key = a.staff_id as string;
    if (!byStaff[key]) byStaff[key] = { revenue: 0, tip: 0 };
    byStaff[key].revenue += Number(a.price) || 0;
    byStaff[key].tip += Number(a.tip) || 0;
  }

  const rows = (staffList ?? []).map((s) => {
    const agg = byStaff[s.id] ?? { revenue: 0, tip: 0 };
    const baseSalary = Number(s.base_salary) || 0;
    const commissionRate = Number(s.commission_rate) || 0;
    const commissionAmount = Math.round(agg.revenue * commissionRate * 100) / 100;
    const total = Math.round((baseSalary + commissionAmount + agg.tip) * 100) / 100;
    return {
      staff_id: s.id,
      full_name: s.full_name,
      base_salary: baseSalary,
      commission_rate: commissionRate,
      revenue: agg.revenue,
      tip: agg.tip,
      commission_amount: commissionAmount,
      total,
    };
  });

  return NextResponse.json({ year, month, rows });
}
