import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email/send";
import { notifyAppointment, notifyAppointmentRequest } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findAvailableStaff, isStaffOnTimeOff } from "@/lib/staff-availability";
import { sendPurposeTemplate, formatApptDateTime } from "@/lib/wa-templates/send";
import { normalizePhone } from "@/lib/phone";
import { isTrialActive } from "@/lib/entitlements";
import { getSubscriptionLock } from "@/lib/subscription-lock";

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
  staff_id: z.string().uuid().optional(),
  auto_assign_staff: z.boolean().optional().default(false),
  service_id: z.string().uuid(),
  extra_services_json: z.array(ExtraServiceSchema).optional().default([]),
  total_price_override: z.number().optional(),
  total_duration_override: z.number().optional(),
  appointment_at: z.string(),
  note: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  source: z.enum(["web", "website", "whatsapp", "instagram", "tiktok", "telefon", "yuzyuze", "manual"]).default("web"),
  kvkk_consent: z.boolean().optional(),
  marketing_consent: z.boolean().optional(),
  kvkk_notice_snapshot: z.string().optional(),
  kvkk_captured_via: z.enum(["inline_web", "staff_attested"]).optional(),
  preferred_language: z.enum(["tr", "en", "ru", "ar"]).optional(),
}).refine((d) => d.auto_assign_staff || !!d.staff_id, {
  message: "Personel seçimi zorunlu",
  path: ["staff_id"],
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
  // Aynı numaranın "0555 123 45 67" / "+90 555..." gibi farklı yazımlarla
  // mükerrer müşteri kaydı oluşturmasını önlemek için tek biçime indirger.
  data.customer_phone = normalizePhone(data.customer_phone);
  const supabase = await createClient();

  // Server-side quota: check max_appointments_monthly
  const { data: org } = await supabase
    .from("organizations")
    .select("max_appointments_monthly, subscription_status, trial_ends_at, has_auto_booking, plan, timezone")
    .eq("id", data.org_id)
    .single();

  if (!org) return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });

  // Block booking if org is subscription-locked (trial dolmuş veya ödeme başarısız).
  // NOT: subscription_status kolonu kayıtta 'active' olarak yazılır ve trial bittiğinde
  // otomatik değişmez — bu yüzden ham "subscription_status === 'active'" kontrolü trial
  // dolsa da hep true döner. getSubscriptionLock plan+trial_ends_at'i esas alır.
  const lock = getSubscriptionLock(org);
  if (lock.locked) {
    return NextResponse.json({ error: "Bu salon şu an aktif aboneliğe sahip değil." }, { status: 403 });
  }

  // Panelden (giriş yapmış, org üyesi) girilen randevular ile anonim
  // /r/[slug] self-servis rezervasyonlarını ayırt etmek için erkenden çözülür —
  // hem çakışma engeli (online_booking_blocked) hem initialStatus hesaplaması bunu kullanır.
  const { data: { user: callingUser } } = await supabase.auth.getUser();
  let isPanelBooking = false;
  if (callingUser) {
    const callingMember = await getActiveMember(supabase);
    isPanelBooking = callingMember?.org_id === data.org_id;
  }

  // ── Otomatik Randevu Akışı ────────────────────────────────────
  // instagram/whatsapp kaynağından gelen istekler has_auto_booking flag'ine göre
  // ya direkt appointments'a düşer ya da onay kuyruğuna gönderilir.
  const isExternalSource = data.source === "instagram" || data.source === "whatsapp";
  if (isExternalSource && !data.staff_id) {
    return NextResponse.json({ error: "Personel seçimi zorunlu" }, { status: 400 });
  }

  // Dışarıdan randevu akışı (has_auto_booking) Pro/Business ve aktif deneme
  // (Pro'ya denk) planlarında aktif
  const planAllowsAutoBooking =
    org.plan === "pro" || org.plan === "business" || isTrialActive(org);
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

  // Find or create customer — admin client: anonim /r/[slug] rezervasyonlarında
  // caller'ın customers tablosunda org_member RLS'i geçecek bir oturumu olmayabilir.
  const adminSupabase = await createAdminClient();

  // ── Personel çözümleme: "farketmez" seçildiyse uygun bir personel bul,
  // aksi halde seçilen personelin o tarihte izinli olmadığını doğrula.
  const requestedDuration = data.total_duration_override ?? service.duration_minutes;
  let resolvedStaffId: string | null = data.staff_id ?? null;
  const orgTimezone = org.timezone || "Europe/Istanbul";
  if (data.auto_assign_staff) {
    resolvedStaffId = await findAvailableStaff(
      adminSupabase,
      data.org_id,
      data.service_id,
      data.appointment_at,
      requestedDuration,
      orgTimezone
    );
    if (!resolvedStaffId) {
      return NextResponse.json({ error: "Seçilen saatte uygun personel yok." }, { status: 409 });
    }
  } else if (resolvedStaffId && (await isStaffOnTimeOff(adminSupabase, data.org_id, resolvedStaffId, data.appointment_at, orgTimezone))) {
    return NextResponse.json({ error: "Personel bu tarihte izinli." }, { status: 409 });
  }
  if (!resolvedStaffId) {
    return NextResponse.json({ error: "Personel seçimi zorunlu" }, { status: 400 });
  }

  let customerId: string | null = null;
  const { data: existingCustomer } = await adminSupabase
    .from("customers")
    .select("id, online_booking_blocked")
    .eq("org_id", data.org_id)
    .eq("phone", data.customer_phone)
    .single();

  // Sık gelmeyen/no-show müşteriler için: sadece anonim self-servis akışını
  // (online widget) engeller — panelden (isPanelBooking) elle randevu her zaman serbest.
  if (!isPanelBooking && existingCustomer?.online_booking_blocked) {
    return NextResponse.json(
      { error: "Bu saat için online randevu alınamıyor. Lütfen bizi arayın." },
      { status: 403 }
    );
  }

  const consentFields =
    typeof data.kvkk_consent === "boolean"
      ? {
          kvkk_consent: data.kvkk_consent,
          kvkk_consent_at: new Date().toISOString(),
          marketing_consent: !!data.marketing_consent,
          marketing_consent_at: data.marketing_consent ? new Date().toISOString() : null,
        }
      : null;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    const customerUpdates = {
      ...(consentFields ?? {}),
      ...(data.preferred_language ? { preferred_language: data.preferred_language } : {}),
    };
    if (Object.keys(customerUpdates).length) {
      await adminSupabase.from("customers").update(customerUpdates).eq("id", customerId);
    }
  } else {
    const { data: newCustomer } = await adminSupabase
      .from("customers")
      .insert({
        org_id: data.org_id,
        full_name: data.customer_name,
        phone: data.customer_phone,
        email: data.customer_email,
        source: data.source,
        preferred_language: data.preferred_language ?? null,
        ...(consentFields ?? {}),
      })
      .select("id")
      .single();
    if (newCustomer) customerId = newCustomer.id;
  }

  if (consentFields) {
    const capturedVia = data.kvkk_captured_via ?? "inline_web";
    const consentRows = [
      {
        org_id: data.org_id,
        customer_id: customerId,
        phone: data.customer_phone,
        consent_type: "kvkk",
        given: data.kvkk_consent,
        source_channel: data.source,
        ip_address: req.headers.get("x-forwarded-for"),
        user_agent: req.headers.get("user-agent"),
        consent_text_snapshot: data.kvkk_notice_snapshot ?? "",
        captured_via: capturedVia,
      },
      ...(data.marketing_consent
        ? [
            {
              org_id: data.org_id,
              customer_id: customerId,
              phone: data.customer_phone,
              consent_type: "marketing",
              given: true,
              source_channel: data.source,
              ip_address: req.headers.get("x-forwarded-for"),
              user_agent: req.headers.get("user-agent"),
              consent_text_snapshot: data.kvkk_notice_snapshot ?? "",
              captured_via: capturedVia,
            },
          ]
        : []),
    ];
    await adminSupabase.from("customer_consents").insert(consentRows);
  }

  // Create appointment — use overrides when multiple services selected
  const finalPrice = data.total_price_override ?? service.price;
  const finalDuration = data.total_duration_override ?? service.duration_minutes;

  // Panelden (giriş yapmış, org üyesi) girilen randevular direkt onaylı düşer.
  // Herkese açık rezervasyon widget'ından (/r/[slug], anonim) gelenler VARSAYILAN
  // OLARAK direkt onaylanır (deneme/Starter dahil — ilk kayıttan itibaren sürtünmesiz
  // rezervasyon deneyimi). Manuel onay kuyruğu ("bekliyor") sadece Pro/Business'ta,
  // salon sahibi has_auto_booking'i bilinçli olarak KAPATIRSA devreye girer.
  const webAutoBookingEligible = data.source === "web" && (!planAllowsAutoBooking || !!org.has_auto_booking);
  const initialStatus = isPanelBooking || webAutoBookingEligible ? "onaylandi" : "talep";

  let appt: Record<string, unknown>;
  try {
    const { data: insertedAppt, error } = await supabase
      .from("appointments")
      .insert({
        org_id: data.org_id,
        customer_id: customerId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        staff_id: resolvedStaffId,
        assigned_staff_id: resolvedStaffId,
        service_id: data.service_id,
        extra_services_json: data.extra_services_json,
        appointment_at: data.appointment_at,
        duration_minutes: finalDuration,
        price: finalPrice,
        source: data.source,
        note: data.note,
        status: initialStatus,
        is_auto: (isExternalSource && !!org.has_auto_booking) || webAutoBookingEligible,
      })
      .select("*")
      .single();

    if (error) throw error;
    appt = insertedAppt;
  } catch (err) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "23P01") {
      return NextResponse.json({ error: "Bu saatte personelin başka bir randevusu var." }, { status: 409 });
    }
    return NextResponse.json({ error: pgErr.message || "Randevu oluşturulamadı" }, { status: 500 });
  }

  // Bildirim gönder (fire-and-forget)
  notifyAppointment({
    id: (appt as { id: string }).id,
    org_id: data.org_id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    appointment_at: data.appointment_at,
    service_id: data.service_id,
    staff_id: resolvedStaffId,
    assigned_staff_id: resolvedStaffId,
    price: finalPrice,
    note: data.note,
    source: data.source,
  }).catch(() => {});

  // Müşteriye anlık WhatsApp onay bildirimi — telefon zorunlu alan olduğu
  // için email girilmemiş olsa bile bu kanal her zaman devreye girer.
  // Sadece gerçekten onaylanmış randevularda gönderilir.
  if (initialStatus === "onaylandi") {
    const { date, time } = formatApptDateTime(data.appointment_at, orgTimezone);
    sendPurposeTemplate({
      toPhone: data.customer_phone,
      orgId: data.org_id,
      purpose: "onay",
      vars: { customer_name: data.customer_name, date, time },
    }).catch(() => {});
  }

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
      .eq("id", resolvedStaffId)
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
        timeZone: orgTimezone,
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

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const status = searchParams.get("status");
  const date = searchParams.get("date");

  let query = supabase
    .from("appointments")
    .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
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
