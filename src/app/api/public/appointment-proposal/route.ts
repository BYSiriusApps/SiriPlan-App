import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyAppointment, notifyProposalResponse } from "@/lib/notify";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";
import { approveAppointmentRequest, type AppointmentRequestRow } from "@/lib/appointment-requests/approve";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

// proposed_response_token 32 haneli hex üretiliyor (20260918 migration) — cancel_token
// ile aynı desen.
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

type Source = "appointment" | "appointment_request";

type ApptRow = {
  id: string;
  org_id: string;
  status: string;
  appointment_at: string;
  proposed_appointment_at: string | null;
  proposed_status: string;
  customer_name: string;
  customer_phone: string;
  staff_id: string | null;
  organizations?: { name: string; address?: string | null; location_url?: string | null; timezone?: string | null } | null;
  staff?: { full_name: string } | null;
  service?: { name: string } | null;
};

async function findByToken(token: string) {
  const supabase = await createAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, org_id, status, appointment_at, proposed_appointment_at, proposed_status, customer_name, customer_phone, staff_id, organizations(name, address, location_url, timezone), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)"
    )
    .eq("proposed_response_token", token)
    .single();

  if (appt) return { supabase, source: "appointment" as Source, row: appt as unknown as ApptRow };

  const { data: reqRow } = await supabase
    .from("appointment_requests")
    .select(
      "id, org_id, status, appointment_at, proposed_appointment_at, proposed_status, customer_name, customer_phone, staff_id, organizations(name, address, location_url, timezone), staff(full_name), service:services(name)"
    )
    .eq("proposed_response_token", token)
    .single();

  if (reqRow) return { supabase, source: "appointment_request" as Source, row: reqRow as unknown as ApptRow };

  return { supabase, source: null, row: null };
}

export async function GET(req: NextRequest) {
  const limit = limitByIp(req, "public-proposal-read", 60, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }

  const { row } = await findByToken(token);
  if (!row) {
    return NextResponse.json({ error: "Öneri bulunamadı." }, { status: 404 });
  }

  const respondable =
    row.proposed_status === "pending" &&
    !!row.proposed_appointment_at &&
    new Date(row.proposed_appointment_at) > new Date();

  return NextResponse.json({
    proposal: {
      status: row.status,
      proposed_status: row.proposed_status,
      current_appointment_at: row.appointment_at,
      proposed_appointment_at: row.proposed_appointment_at,
      customer_name: row.customer_name,
      org_name: row.organizations?.name ?? "",
      org_address: row.organizations?.address ?? "",
      location_url: row.organizations?.location_url ?? "",
      staff_name: row.staff?.full_name ?? "",
      service_name: row.service?.name ?? "",
      respondable,
    },
  });
}

export async function POST(req: NextRequest) {
  // Kabul de red de işletmeye bir bildirim tetikliyor (ve kabulde ücretli WA
  // onay şablonu gidiyor) — cancel POST ile aynı sıkılıkta sınırlanır.
  const limit = limitByIp(req, "public-proposal-respond", 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const action = body?.action;
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'accept' veya 'reject'" }, { status: 400 });
  }

  try {
    return await handleRespond(token, action);
  } catch (err) {
    console.error("[public/appointment-proposal] POST beklenmeyen hata:", err);
    return NextResponse.json({ error: "İşlem gerçekleştirilemedi, lütfen tekrar deneyin." }, { status: 500 });
  }
}

async function handleRespond(token: string, action: "accept" | "reject") {
  const { supabase, source, row } = await findByToken(token);
  if (!row || !source) {
    return NextResponse.json({ error: "Öneri bulunamadı." }, { status: 404 });
  }
  if (row.proposed_status !== "pending") {
    return NextResponse.json({ error: "Bu öneri artık geçerli değil." }, { status: 409 });
  }
  if (!row.proposed_appointment_at || new Date(row.proposed_appointment_at) <= new Date()) {
    return NextResponse.json({ error: "Önerilen saatin süresi geçmiş." }, { status: 409 });
  }

  const table = source === "appointment" ? "appointments" : "appointment_requests";

  if (action === "reject") {
    const { error } = await supabase
      .from(table)
      .update({ proposed_status: "rejected" })
      .eq("id", row.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    notifyProposalResponse({
      org_id: row.org_id,
      customer_name: row.customer_name,
      proposed_appointment_at: row.proposed_appointment_at,
      accepted: false,
      staff_id: row.staff_id,
    }).catch((err) => console.error("[public/appointment-proposal] notifyProposalResponse(reject) hata:", err));

    return NextResponse.json({ success: true, final_appointment_at: row.appointment_at });
  }

  // action === "accept"
  if (source === "appointment_request") {
    const { data: fullReq } = await supabase
      .from("appointment_requests")
      .select("*")
      .eq("id", row.id)
      .single();
    if (!fullReq) return NextResponse.json({ error: "Öneri bulunamadı." }, { status: 404 });

    const result = await approveAppointmentRequest(supabase, row.org_id, fullReq as AppointmentRequestRow, {
      appointmentAtOverride: row.proposed_appointment_at,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });

    notifyProposalResponse({
      org_id: row.org_id,
      customer_name: row.customer_name,
      proposed_appointment_at: row.proposed_appointment_at,
      accepted: true,
      staff_id: row.staff_id,
    }).catch((err) => console.error("[public/appointment-proposal] notifyProposalResponse(accept) hata:", err));

    return NextResponse.json({ success: true, final_appointment_at: row.proposed_appointment_at });
  }

  // source === "appointment" — zaten appointments tablosunda, direkt saati
  // güncelleyip onaylıyoruz.
  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      appointment_at: row.proposed_appointment_at,
      status: "onaylandi",
      proposed_status: "accepted",
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  notifyAppointment({
    id: updated.id,
    org_id: row.org_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    appointment_at: row.proposed_appointment_at,
    staff_id: row.staff_id,
    assigned_staff_id: row.staff_id,
  }).catch((err) => console.error("[public/appointment-proposal] notifyAppointment hata:", err));

  if (row.customer_phone) {
    const { date, time } = formatApptDateTime(row.proposed_appointment_at, row.organizations?.timezone || undefined);
    sendPurposeTemplate({
      toPhone: row.customer_phone,
      orgId: row.org_id,
      purpose: "onay",
      vars: { customer_name: row.customer_name, date, time },
      appointmentAt: row.proposed_appointment_at,
      cancelToken: (updated as { cancel_token?: string }).cancel_token,
    }).catch((err) => console.error("[public/appointment-proposal] sendPurposeTemplate(onay) hata:", err));
  }

  notifyProposalResponse({
    org_id: row.org_id,
    customer_name: row.customer_name,
    proposed_appointment_at: row.proposed_appointment_at,
    accepted: true,
    staff_id: row.staff_id,
  }).catch((err) => console.error("[public/appointment-proposal] notifyProposalResponse(accept) hata:", err));

  return NextResponse.json({ success: true, final_appointment_at: row.proposed_appointment_at });
}
