import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { logAppointmentStatusChange } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tip = 0, payment_method = "nakit" } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  // Fetch appointment + service
  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select("*, service:services(contributes_loyalty, price)")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (fetchErr || !appt) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (appt.status === "tamamlandi") {
    return NextResponse.json({ error: "Zaten tamamlandı" }, { status: 400 });
  }
  if (member.role === "staff" && appt.staff_id !== member.staff_id) {
    return NextResponse.json({ error: "Bu randevu size atanmadığı için işlem yapamazsınız" }, { status: 403 });
  }

  // Mark complete
  const { error: updateErr } = await supabase
    .from("appointments")
    .update({ status: "tamamlandi", tip: tip || 0, payment_method })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  logAppointmentStatusChange({
    orgId: member.org_id,
    userId: user.id,
    actorName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Bilinmiyor",
    appointmentId: id,
    staffId: appt.staff_id,
    customerName: appt.customer_name,
    appointmentAt: appt.appointment_at,
    oldStatus: appt.status,
    newStatus: "tamamlandi",
  }).catch(() => {});

  // Add loyalty punch if applicable
  if (appt.customer_id && appt.service?.contributes_loyalty && !appt.loyalty_punch_added) {
    await supabase
      .from("customers")
      .update({ loyalty_punches: supabase.rpc("increment", { x: 1 }) })
      .eq("id", appt.customer_id);

    await supabase
      .from("appointments")
      .update({ loyalty_punch_added: true })
      .eq("id", id);
  }

  // Update customer stats
  if (appt.customer_id) {
    const totalEarned = Number(appt.price) + Number(tip || 0);
    const { data: cust } = await supabase
      .from("customers")
      .select("visit_count, total_spend")
      .eq("id", appt.customer_id)
      .single();

    if (cust) {
      await supabase
        .from("customers")
        .update({
          visit_count: (cust.visit_count || 0) + 1,
          total_spend: Number(cust.total_spend || 0) + totalEarned,
          last_visit_at: new Date().toISOString(),
        })
        .eq("id", appt.customer_id);
    }
  }

  return NextResponse.json({ success: true });
}
