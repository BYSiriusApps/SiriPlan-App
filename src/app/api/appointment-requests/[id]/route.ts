import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/appointment-requests/[id] — { action: 'approve' | 'reject' } */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const action: "approve" | "reject" = body.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  // Fetch the pending request
  const { data: reqRow, error: fetchErr } = await supabase
    .from("appointment_requests")
    .select("*")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .eq("status", "pending")
    .single();

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: "Talep bulunamadı veya zaten işlendi" }, { status: 404 });
  }

  if (action === "reject") {
    await supabase
      .from("appointment_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ status: "rejected" });
  }

  // action === "approve" → create appointment from request
  const { data: service } = await supabase
    .from("services")
    .select("price, duration_minutes, name")
    .eq("id", reqRow.service_id)
    .eq("org_id", member.org_id)
    .single();

  // Find or create customer
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("org_id", member.org_id)
    .eq("phone", reqRow.customer_phone)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        org_id: member.org_id,
        full_name: reqRow.customer_name,
        phone: reqRow.customer_phone,
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
      org_id: member.org_id,
      customer_id: customerId,
      customer_name: reqRow.customer_name,
      customer_phone: reqRow.customer_phone,
      staff_id: reqRow.staff_id,
      assigned_staff_id: reqRow.staff_id,
      service_id: reqRow.service_id,
      extra_services_json: reqRow.extra_services_json,
      appointment_at: reqRow.appointment_at,
      duration_minutes: finalDuration,
      price: finalPrice,
      source: reqRow.source,
      note: reqRow.note,
      status: "onaylandi",
      is_auto: false,
    })
    .select("*")
    .single();

  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });

  // Mark request as approved
  await supabase
    .from("appointment_requests")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);

  // Bildirim (fire-and-forget)
  notifyAppointment({
    id: (appt as { id: string }).id,
    org_id: member.org_id,
    customer_name: reqRow.customer_name,
    customer_phone: reqRow.customer_phone,
    appointment_at: reqRow.appointment_at,
    service_id: reqRow.service_id,
    staff_id: reqRow.staff_id,
    assigned_staff_id: reqRow.staff_id,
    price: finalPrice,
    note: reqRow.note,
    source: reqRow.source,
  }).catch(() => {});

  return NextResponse.json({ status: "approved", appointment: appt }, { status: 201 });
}
