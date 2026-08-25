import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notify";
import { logAppointmentStatusChange } from "@/lib/audit";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";
import { isStaffOnTimeOff } from "@/lib/staff-availability";

type Params = { params: Promise<{ id: string }> };

async function getAuthContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const member = await getActiveMember(supabase);
  if (!member) return null;
  return { user, member };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("appointments")
    .select("*, staff:staff!appointments_staff_id_fkey(*), service:services(*), customer:customers(*)")
    .eq("id", id)
    .eq("org_id", ctx.member.org_id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ appointment: data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, member } = ctx;

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

  // Personel yalnızca kendi üzerine atanan randevu üzerinde işlem yapabilir —
  // notlar, müşteri iletişim bilgileri dahil hangi alan güncellenirse
  // güncellensin (sahip/yönetici kısıtlamasız). Önceden bu kontrol yalnızca
  // durum/personel/saat değişince çalışıyordu; başka personele ait bir
  // randevunun iç notu/telefonu gibi alanlar korumasız kalıyordu.
  const touchesSchedule = "staff_id" in updates || "appointment_at" in updates;
  const { data: current } = await supabase
    .from("appointments")
    .select("status, staff_id, customer_name, appointment_at, duration_minutes")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();
  if (!current) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (member.role === "staff" && current.staff_id !== member.staff_id) {
    return NextResponse.json({ error: "Bu randevu size atanmadığı için işlem yapamazsınız" }, { status: 403 });
  }
  const previous = current;

  // When service changes, sync price and duration from the new service
  if (updates.service_id) {
    const { data: svc } = await supabase
      .from("services")
      .select("price, duration_minutes")
      .eq("id", updates.service_id as string)
      .eq("org_id", member.org_id)
      .single();
    if (svc) {
      updates.price = svc.price;
      updates.duration_minutes = svc.duration_minutes;
    }
  }

  // Personel/saat değişiyorsa, hedef personelin o tarihte izinli olmadığını doğrula
  // (çakışma zaten DB'deki exclusion constraint ile garanti altında).
  if (touchesSchedule && previous) {
    const targetStaffId = (updates.staff_id as string | undefined) ?? previous.staff_id;
    const targetAt = (updates.appointment_at as string | undefined) ?? previous.appointment_at;
    const { data: orgTz } = await supabase
      .from("organizations")
      .select("timezone")
      .eq("id", member.org_id)
      .single();
    if (targetStaffId && (await isStaffOnTimeOff(supabase, member.org_id, targetStaffId, targetAt, orgTz?.timezone || "Europe/Istanbul"))) {
      return NextResponse.json({ error: "Personel bu tarihte izinli." }, { status: 409 });
    }
  }

  let data: Record<string, unknown>;
  try {
    const { data: updated, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .eq("org_id", member.org_id)
      .select("*")
      .single();
    if (error) throw error;
    data = updated;
  } catch (err) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "23P01") {
      return NextResponse.json({ error: "Bu saatte personelin başka bir randevusu var." }, { status: 409 });
    }
    return NextResponse.json({ error: pgErr.message || "Randevu güncellenemedi" }, { status: 500 });
  }

  if (previous && data && typeof updates.status === "string" && previous.status !== updates.status) {
    logAppointmentStatusChange({
      orgId: member.org_id,
      userId: user.id,
      actorName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Bilinmiyor",
      appointmentId: id,
      staffId: previous.staff_id,
      customerName: previous.customer_name,
      appointmentAt: previous.appointment_at,
      oldStatus: previous.status,
      newStatus: updates.status as string,
    }).catch(() => {});
  }

  // Randevu güncellenince ilgili taraflara bildirim gönder (fire-and-forget)
  // Sadece saat veya personel değişikliğinde: iç durum güncellemeleri (tamamlandi, gelmedi)
  // için bildirim gönderme — onay kanallarını gürültüye boğar. İptal ayrı ele alınır.
  const appointmentChanged = updates.appointment_at || updates.staff_id;
  const becameCancelled = previous && previous.status !== "iptal" && updates.status === "iptal";
  const becameApproved = previous && previous.status === "talep" && updates.status === "onaylandi";

  if (appointmentChanged && data && updates.status !== "iptal") {
    const apptData = data as {
      id: string; org_id: string; customer_name: string; customer_phone: string;
      appointment_at: string; service_id: string; staff_id: string; price: number; note?: string; source?: string;
      cancel_token?: string;
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

    // Müşteriye Meta onaylı WhatsApp şablonu — randevu revize edildi
    if (apptData.customer_phone) {
      const { date, time } = formatApptDateTime(apptData.appointment_at);
      sendPurposeTemplate({
        toPhone: apptData.customer_phone,
        orgId: apptData.org_id,
        purpose: "revize",
        vars: { customer_name: apptData.customer_name, new_date: date, new_time: time },
        appointmentAt: apptData.appointment_at,
      }).catch((err) => console.error("[appointments/[id]] sendPurposeTemplate(revize) hata:", err));
    }
  }

  if (becameCancelled && data) {
    const apptData = data as {
      org_id: string; customer_name: string; customer_phone: string; appointment_at: string; cancel_token?: string;
    };
    if (apptData.customer_phone) {
      const { date, time } = formatApptDateTime(apptData.appointment_at);
      sendPurposeTemplate({
        toPhone: apptData.customer_phone,
        orgId: apptData.org_id,
        purpose: "iptal",
        vars: { customer_name: apptData.customer_name, date, time },
        appointmentAt: apptData.appointment_at,
      }).catch((err) => console.error("[appointments/[id]] sendPurposeTemplate(iptal) hata:", err));
    }
  }

  // Bekleyen bir randevu talebi (talep) panelden onaylandığında müşteriye
  // onay WhatsApp şablonu gönderilir — oluşturma anında sadece otomatik
  // onaylanan randevularda gönderiliyordu, elle onayda müşteri hiç haber almıyordu.
  if (becameApproved && data) {
    const apptData = data as {
      org_id: string; customer_name: string; customer_phone: string; appointment_at: string;
    };
    if (apptData.customer_phone) {
      const { date, time } = formatApptDateTime(apptData.appointment_at);
      sendPurposeTemplate({
        toPhone: apptData.customer_phone,
        orgId: apptData.org_id,
        purpose: "onay",
        vars: { customer_name: apptData.customer_name, date, time },
        appointmentAt: apptData.appointment_at,
      }).catch((err) => console.error("[appointments/[id]] sendPurposeTemplate(onay) hata:", err));
    }
  }

  return NextResponse.json({ appointment: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, member } = ctx;

  const { data: current } = await supabase
    .from("appointments")
    .select("status, staff_id, customer_name, customer_phone, appointment_at, cancel_token")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();
  if (!current) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (member.role === "staff" && current.staff_id !== member.staff_id) {
    return NextResponse.json({ error: "Bu randevu size atanmadığı için işlem yapamazsınız" }, { status: 403 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "iptal" })
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (current.status !== "iptal") {
    logAppointmentStatusChange({
      orgId: member.org_id,
      userId: user.id,
      actorName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Bilinmiyor",
      appointmentId: id,
      staffId: current.staff_id,
      customerName: current.customer_name,
      appointmentAt: current.appointment_at,
      oldStatus: current.status,
      newStatus: "iptal",
    }).catch(() => {});

    if (current.customer_phone) {
      const { date, time } = formatApptDateTime(current.appointment_at);
      sendPurposeTemplate({
        toPhone: current.customer_phone,
        orgId: member.org_id,
        purpose: "iptal",
        vars: { customer_name: current.customer_name, date, time },
        appointmentAt: current.appointment_at,
      }).catch((err) => console.error("[appointments/[id]] sendPurposeTemplate(iptal/DELETE) hata:", err));
    }
  }

  return NextResponse.json({ success: true });
}
