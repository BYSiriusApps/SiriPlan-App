import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";

export const runtime = "nodejs";

// cancel_token 32 karakterlik hex üretiliyor (001_initial_schema)
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

type ApptRow = {
  id: string;
  org_id: string;
  status: string;
  appointment_at: string;
  customer_name: string;
  customer_phone: string;
  cancel_token: string;
  organizations?: { name: string } | null;
  staff?: { full_name: string } | null;
  service?: { name: string } | null;
};

async function findByToken(token: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, org_id, status, appointment_at, customer_name, customer_phone, cancel_token, organizations(name), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
    .eq("cancel_token", token)
    .single();
  return { supabase, appt: data as unknown as ApptRow | null };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }

  const { appt } = await findByToken(token);
  if (!appt) {
    return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({
    appointment: {
      status: appt.status,
      appointment_at: appt.appointment_at,
      customer_name: appt.customer_name,
      org_name: appt.organizations?.name ?? "",
      staff_name: appt.staff?.full_name ?? "",
      service_name: appt.service?.name ?? "",
      cancellable: ["talep", "onaylandi"].includes(appt.status) && new Date(appt.appointment_at) > new Date(),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }

  const { supabase, appt } = await findByToken(token);
  if (!appt) {
    return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
  }

  if (appt.status === "iptal") {
    return NextResponse.json({ success: true, already: true });
  }
  if (!["talep", "onaylandi"].includes(appt.status)) {
    return NextResponse.json({ error: "Bu randevu artık iptal edilemez." }, { status: 409 });
  }
  if (new Date(appt.appointment_at) <= new Date()) {
    return NextResponse.json({ error: "Geçmiş randevular iptal edilemez." }, { status: 409 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "iptal" })
    .eq("id", appt.id);

  if (error) {
    return NextResponse.json({ error: "İptal işlemi başarısız oldu." }, { status: 500 });
  }

  if (appt.customer_phone) {
    const { date, time } = formatApptDateTime(appt.appointment_at);
    sendPurposeTemplate({
      toPhone: appt.customer_phone,
      orgId: appt.org_id,
      purpose: "iptal",
      vars: { customer_name: appt.customer_name, date, time },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
