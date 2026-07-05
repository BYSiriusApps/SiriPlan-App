import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email/send";
import { notifyAppointment, notifyAppointmentRequest } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ExtraServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number(),
  duration_minutes: z.number(),
});

const CreateSchema = z.object({
  org_id: z.string().uuid(),
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(10).max(20),
  customer_email: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().optional()
  ),
  staff_id: z.string().uuid(),
  service_id: z.string().uuid(),
  extra_services_json: z.array(ExtraServiceSchema).optional().default([]),
  total_price_override: z.number().optional(),
  total_duration_override: z.number().optional(),
  appointment_at: z.string(),
  note: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  source: z.enum(["web", "website", "whatsapp", "instagram", "telefon", "yuzyuze", "manual"]).default("web"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
    return NextResponse.json({ error: firstError || "Geçersiz form verisi" }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Server-side quota: check max_appointments_monthly
  const { data: org } = await supabase
    .from("organizations")
    .select("max_appointments_monthly, subscription_status, trial_ends_at, has_auto_booking, plan")
    .eq("id", data.org_id)
    .single();

  if (!org) return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });

  // Block booking if org is not active/in-trial
  const isActive =
    org.subscription_status === "active" ||
    (org.trial_ends_at && new Date(org.trial_ends_at) > new Date());
  if (!isActive) {
    return NextResponse.json({ error: "Bu salon şu an aktif aboneliğe sahip değil." }, { status: 403 });
  }

  // ── Otomatik Randevu Akışı ────────────────────────────────────
  // instagram/whatsapp kaynağından gelen istekler has_auto_booking flag'ine göre
  // ya direkt appointments'a düşer ya da onay kuyruğuna gönderilir.
  const isExternalSource = data.source === "instagram" || data.source === "whatsapp";

  // Dışarıdan randevu akışı (has_auto_booking) yalnızca Pro/Business planlarında aktif
  const planAllowsAutoBooking = org.plan === "pro" || org.plan === "business";
  if (isExternalSource && org.has_auto_booking && !planAllowsAutoBooking) {
    return NextResponse.json(
      { error: "Otomatik randevu özelliği Pro veya Business planı gerektirir." },
      { status: 403 }
    );
  }

  if (isExternalSource && !org.has_auto_booking) {
    // Onay gerekiyor: appointment_requests tablosuna yaz
    const [{ data: svcForReq }, { data: staffForReq }] = await Promise.all([
      supabase.from("services").select("name, price, duration_minutes").eq("id", data.service_id).eq("org_id", data.org_id).single(),
      supabase.from("staff").select("full_name").eq("id", data.staff_id).single(),
    ]);

    const { data: reqRow, error: reqErr } = await supabase
      .from("appointment_requests")
      .insert({
        org_id: data.org_id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        staff_id: data.staff_id,
        service_id: data.service_id,
        extra_services_json: data.extra_services_json,
        appointment_at: data.appointment_at,
        duration_minutes: data.total_duration_override ?? (svcForReq as { duration_minutes: number } | null)?.duration_minutes,
        price: data.total_price_override ?? (svcForReq as { price: number } | null)?.price,
        note: data.note,
        source: data.source,
        status: "pending",
      })
      .select("id")
      .single();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

    // Salon sahibine bildirim gönder (fire-and-forget)
    notifyAppointmentRequest({
      id: reqRow.id,
      org_id: data.org_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      appointment_at: data.appointment_at,
      service_id: data.service_id,
      staff_id: data.staff_id,
      price: data.total_price_override ?? (svcForReq as { price: number } | null)?.price,
      note: data.note,
      source: data.source,
      serviceName: (svcForReq as { name: string } | null)?.name,
      staffName: (staffForReq as { full_name: string } | null)?.full_name,
    }).catch(() => {});

    return NextResponse.json({ request_id: reqRow.id, status: "pending" }, { status: 202 });
  }

  if (org.max_appointments_monthly && org.max_appointments_monthly < 999999) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("org_id", data.org_id)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    if (count !== null && count >= org.max_appointments_monthly) {
      return NextResponse.json(
        { error: `Bu ay için randevu limitine ulaşıldı (${org.max_appointments_monthly}). Sonraki ay veya plan yükseltme ile devam edilebilir.` },
        { status: 429 }
      );
    }
  }

  // Get service for price/duration
  const { data: service } = await supabase
    .from("services")
    .select("price, duration_minutes, name")
    .eq("id", data.service_id)
    .eq("org_id", data.org_id)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Find or create customer
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("org_id", data.org_id)
    .eq("phone", data.customer_phone)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        org_id: data.org_id,
        full_name: data.customer_name,
        phone: data.customer_phone,
        email: data.customer_email,
        source: data.source,
      })
      .select("id")
      .single();
    if (newCustomer) customerId = newCustomer.id;
  }

  // Create appointment — use overrides when multiple services selected
  const finalPrice = data.total_price_override ?? service.price;
  const finalDuration = data.total_duration_override ?? service.duration_minutes;

  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      org_id: data.org_id,
      customer_id: customerId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      staff_id: data.staff_id,
      assigned_staff_id: data.staff_id,
      service_id: data.service_id,
      extra_services_json: data.extra_services_json,
      appointment_at: data.appointment_at,
      duration_minutes: finalDuration,
      price: finalPrice,
      source: data.source,
      note: data.note,
      status: "onaylandi",
      is_auto: isExternalSource && !!org.has_auto_booking,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bildirim gönder (fire-and-forget)
  notifyAppointment({
    id: (appt as { id: string }).id,
    org_id: data.org_id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    appointment_at: data.appointment_at,
    service_id: data.service_id,
    staff_id: data.staff_id,
    assigned_staff_id: data.staff_id,
    price: finalPrice,
    note: data.note,
    source: data.source,
  }).catch(() => {});

  // Send confirmation email
  if (data.customer_email) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", data.org_id)
      .single();
    const { data: staffRow } = await supabase
      .from("staff")
      .select("full_name")
      .eq("id", data.staff_id)
      .single();
    if (org) {
      sendConfirmationEmail({
        to: data.customer_email,
        customerName: data.customer_name,
        orgName: (org as { name: string }).name,
        serviceName: service.name,
        staffName: (staffRow as { full_name: string } | null)?.full_name ?? "",
        appointmentAt: new Date(data.appointment_at),
        cancelToken: (appt as { cancel_token?: string }).cancel_token,
      }).catch(() => {});
    }
  }

  // Sayfaları cache'den temizle — yeni randevu hemen listede görünsün
  revalidatePath("/dashboard/randevular");
  revalidatePath("/dashboard/takvim");

  return NextResponse.json({ appointment: appt }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const status = searchParams.get("status");
  const date = searchParams.get("date");

  let query = supabase
    .from("appointments")
    .select("*, staff(full_name), service:services(name)")
    .eq("org_id", member.org_id)
    .order("appointment_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);
  if (date) {
    query = query
      .gte("appointment_at", `${date}T00:00:00`)
      .lte("appointment_at", `${date}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ appointments: data });
}
