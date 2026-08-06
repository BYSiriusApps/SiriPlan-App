import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { googleMapsLink } from "@/lib/wa-template";

export const runtime = "nodejs";

// cancel_token 32 karakterlik hex üretiliyor (001_initial_schema) — randevu
// detay linki (WhatsApp dinamik buton hedefi /randevu/[token]) aynı token'ı kullanır.
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

export async function GET(req: NextRequest) {
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
