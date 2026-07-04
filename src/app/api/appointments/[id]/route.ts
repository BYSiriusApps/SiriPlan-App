import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  return member?.org_id ?? null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("appointments")
    .select("*, staff(*), service:services(*), customer:customers(*)")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ appointment: data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ALLOWED = [
    "status", "note", "internal_note", "tip", "payment_method", "cancel_reason",
    "customer_name", "customer_phone", "customer_email",
    "staff_id", "service_id", "appointment_at", "source",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  // When service changes, sync price and duration from the new service
  if (updates.service_id) {
    const { data: svc } = await supabase
      .from("services")
      .select("price, duration_minutes")
      .eq("id", updates.service_id as string)
      .eq("org_id", orgId)
      .single();
    if (svc) {
      updates.price = svc.price;
      updates.duration_minutes = svc.duration_minutes;
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Randevu güncellenince ilgili taraflara bildirim gönder (fire-and-forget)
  // Sadece saat veya personel değişikliğinde: iç durum güncellemeleri (tamamlandi, iptal, gelmedi)
  // için bildirim gönderme — onay kanallarını gürültüye boğar.
  const appointmentChanged = updates.appointment_at || updates.staff_id;
  if (appointmentChanged && data) {
    const apptData = data as {
      id: string; org_id: string; customer_name: string; customer_phone: string;
      appointment_at: string; service_id: string; staff_id: string; price: number; note?: string; source?: string;
    };
    notifyAppointment({
      id: apptData.id,
      org_id: apptData.org_id,
      customer_name: apptData.customer_name,
      customer_phone: apptData.customer_phone,
      appointment_at: apptData.appointment_at,
      service_id: apptData.service_id,
      staff_id: apptData.staff_id,
      assigned_staff_id: apptData.staff_id,
      price: apptData.price,
      note: apptData.note,
      source: apptData.source,
    }).catch(() => {});
  }

  return NextResponse.json({ appointment: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("appointments")
    .update({ status: "iptal" })
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
