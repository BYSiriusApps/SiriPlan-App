import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { googleMapsLink } from "@/lib/wa-template";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

// cancel_token 32 karakterlik hex üretiliyor (001_initial_schema) — randevu
// detay linki (WhatsApp dinamik buton hedefi /randevu/[token]) aynı token'ı kullanır.
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

export async function GET(req: NextRequest) {
  // Kimlik doğrulaması yok; erişim yalnızca token'ın gizliliğine dayanıyor.
  // Token uzayı (16^32) kaba kuvvete kapalı olsa da sınırsız deneme, servis
  // rolüyle çalışan bir sorguyu istek başına tetikler. Kardeş uç
  // (public/cancel GET) ile aynı sınır: gerçek bir müşteri linkine birkaç kez
  // bakar, 10 dakikada 60 istek fazlasıyla yeter.
  const limit = limitByIp(req, "public-appointment-read", 60, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("status, appointment_at, customer_name, organizations(name, address, location_url), staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
    .eq("cancel_token", token)
    .single();

  if (!data) return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });

  const appt = data as unknown as {
    status: string; appointment_at: string; customer_name: string;
    organizations?: { name: string; address?: string | null; location_url?: string | null } | null;
    staff?: { full_name: string } | null;
    service?: { name: string } | null;
  };

  const org = appt.organizations;
  const locationUrl =
    org?.location_url?.trim() || (org?.address?.trim() ? googleMapsLink(org.address.trim()) : "");

  return NextResponse.json({
    appointment: {
      status: appt.status,
      appointment_at: appt.appointment_at,
      customer_name: appt.customer_name,
      org_name: org?.name ?? "",
      org_address: org?.address ?? "",
      location_url: locationUrl,
      staff_name: appt.staff?.full_name ?? "",
      service_name: appt.service?.name ?? "",
      cancellable: ["talep", "onaylandi"].includes(appt.status) && new Date(appt.appointment_at) > new Date(),
    },
  });
}
