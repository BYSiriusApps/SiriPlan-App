import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";
import { approveAppointmentRequest } from "@/lib/appointment-requests/approve";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/appointment-requests/[id] — { action: 'approve' | 'reject' | 'reschedule', appointment_at? } */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const action: "approve" | "reject" | "reschedule" | "reassign_staff" = body.action;

  if (action !== "approve" && action !== "reject" && action !== "reschedule" && action !== "reassign_staff") {
    return NextResponse.json({ error: "action must be 'approve', 'reject', 'reschedule' veya 'reassign_staff'" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

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

  // "reassign_staff" = talep henüz onaylanmadan, "fark etmez" ile otomatik
  // atanmış (veya müşterinin seçtiği) personeli işletme değiştiriyor. Sadece
  // appointment_requests.staff_id güncellenir — onaylandığında bu değer
  // approveAppointmentRequest() tarafından appointments'e olduğu gibi kopyalanır.
  if (action === "reassign_staff") {
    if (member.role === "staff") {
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
    }
    const staffId = body.staff_id;
    if (typeof staffId !== "string" || !staffId) {
      return NextResponse.json({ error: "staff_id gerekli" }, { status: 400 });
    }
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("id", staffId)
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .single();
    if (!staffRow) {
      return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 });
    }
    const { error: reassignErr } = await supabase
      .from("appointment_requests")
      .update({ staff_id: staffId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (reassignErr) return NextResponse.json({ error: reassignErr.message }, { status: 500 });
    return NextResponse.json({ status: "reassigned", staff: { id: staffRow.id, full_name: staffRow.full_name } });
  }

  // "reschedule" = işletmenin müşteriye yeni bir saat ÖNERMESİ. appointment_at'e
  // dokunulmaz (mevcut talep bilgisi korunur) — sadece proposed_* alanları
  // doldurulur ve müşteriye linkli bir WhatsApp şablonu gider. Müşteri
  // /oneri/[token] üzerinden kabul/red eder (bkz. api/public/appointment-proposal).
  if (action === "reschedule") {
    const newAt = body.appointment_at;
    if (!newAt || Number.isNaN(new Date(newAt).getTime())) {
      return NextResponse.json({ error: "Geçerli bir tarih/saat gerekli" }, { status: 400 });
    }
    const token = crypto.randomBytes(16).toString("hex");
    const { data: updated, error: updErr } = await supabase
      .from("appointment_requests")
      .update({
        proposed_appointment_at: newAt,
        proposed_response_token: token,
        proposed_status: "pending",
        proposed_at: new Date().toISOString(),
        proposed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    if (updated.customer_phone) {
      const { date, time } = formatApptDateTime(newAt);
      sendPurposeTemplate({
        toPhone: updated.customer_phone,
        orgId: member.org_id,
        purpose: "oneri",
        vars: { customer_name: updated.customer_name, new_date: date, new_time: time },
        appointmentAt: newAt,
        cancelToken: token,
      }).catch((err) => console.error("[appointment-requests] sendPurposeTemplate(oneri) hata:", err));
    }

    return NextResponse.json({ status: "proposed", proposed_appointment_at: updated.proposed_appointment_at });
  }

  // action === "approve" → create appointment from request (ortak yardımcı,
  // müşterinin /oneri/[token] üzerinden kabul etmesiyle AYNI mantığı kullanır)
  const result = await approveAppointmentRequest(supabase, member.org_id, reqRow);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({ status: "approved", appointment: result.appointment }, { status: 201 });
}
