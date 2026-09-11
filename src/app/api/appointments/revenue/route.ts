import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

/**
 * Tamamlanan randevuların cirosu (price + tip) — Gelir-Gider ekranı bunu
 * "Randevudan otomatik" salt-okunur gelir satırları olarak gösterir.
 *
 * expenses tablosuna YAZMAZ; her istekte appointments'tan yeniden hesaplanır.
 * Böylece 012 trigger'ının canlı olup olmamasından bağımsız, tek doğru kaynak
 * appointments.price kalır.
 *
 * GET ?year=YYYY[&month=MM]
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? new Date().getFullYear().toString();
  const month = searchParams.get("month");

  let startDate: string;
  let endDate: string;
  if (month) {
    const m = month.padStart(2, "0");
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    startDate = `${year}-${m}-01T00:00:00`;
    endDate = `${year}-${m}-${String(lastDay).padStart(2, "0")}T23:59:59.999`;
  } else {
    startDate = `${year}-01-01T00:00:00`;
    endDate = `${year}-12-31T23:59:59.999`;
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, appointment_at, price, tip, customer_name, payment_method, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)"
    )
    .eq("org_id", member.org_id)
    .eq("status", "tamamlandi")
    .gte("appointment_at", startDate)
    .lte("appointment_at", endDate)
    .order("appointment_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    appointment_at: string;
    price: number | null;
    tip: number | null;
    customer_name: string;
    payment_method: string | null;
    staff?: { full_name: string } | null;
    service?: { name: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((a) => {
    const svc = a.service?.name ?? "Randevu";
    return {
      id: `appt-${a.id}`,
      appointment_id: a.id,
      auto: true as const,
      type: "gelir" as const,
      category: "randevu",
      amount: Number(a.price ?? 0) + Number(a.tip ?? 0),
      description: `${svc} — ${a.customer_name}`,
      note: a.staff?.full_name ? `Personel: ${a.staff.full_name}` : null,
      date: a.appointment_at.slice(0, 10),
      payment_method: a.payment_method ?? "nakit",
    };
  });

  return NextResponse.json(rows);
}
