import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { hasProTools } from "@/lib/entitlements";
import { redirect } from "next/navigation";
import {
  BeklemeListesiClient,
  type WaitlistEntry,
  type PendingAppt,
  type PendingRequest,
  type StaffOption,
  type ServiceOption,
} from "./BeklemeListesiClient";

/**
 * Eskiden bu sayfa tamamen client component'ti: mount olunca 6 ayrı API ucuna
 * (/api/waitlist, /api/appointments, /api/appointment-requests, /api/staff,
 * /api/services, /api/org) paralel istek atıyordu — her uç kendi auth.getUser()
 * + üyelik sorgusunu ayrı ayrı tekrarlıyordu. Veriler boşken bile mobilde
 * "takılma"/3+ sn açılış şikayetine yol açan asıl sebep buydu. Komşu sayfa
 * (bekleyen-istekler) zaten server component + tek Promise.all deseniyle
 * yazılmıştı; aynı desen burada da uygulanıyor — başlangıç verisi sunucuda tek
 * seferde çekilip client'a prop olarak geçiriliyor, ekleme/onay/silme gibi
 * aksiyonlar sonrası tazeleme client'ta (fetchData) aynen kalıyor.
 */
export default async function BeklemeListesiPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const proTools = hasProTools(member.organizations);

  const [{ data: waitlistRaw }, { data: talepRaw }, { data: requestsRaw }, { data: staffRows }, { data: serviceRows }] =
    await Promise.all([
      // Bekleme listesi Pro+ özelliği — değilse tablo hiç sorgulanmaz (eskiden
      // /api/waitlist zaten 403 dönüyordu, burada baştan atlanıyor).
      proTools
        ? supabase
            .from("waitlist")
            .select(
              "id, customer_name, customer_phone, service_id, staff_id, preferred_dates, status, requested_at, service:services(name), staff:staff!waitlist_staff_id_fkey(full_name)"
            )
            .eq("org_id", member.org_id)
            .order("requested_at", { ascending: false })
        : Promise.resolve({ data: [] as unknown[] }),
      supabase
        .from("appointments")
        .select(
          "id, customer_name, customer_phone, appointment_at, staff:staff!appointments_staff_id_fkey(full_name), service:services(name), proposed_status, proposed_appointment_at"
        )
        .eq("org_id", member.org_id)
        .eq("status", "talep")
        .order("appointment_at", { ascending: true }),
      supabase
        .from("appointment_requests")
        .select(
          "id, customer_name, customer_phone, appointment_at, source, staff(full_name), service:services(name), proposed_status, proposed_appointment_at"
        )
        .eq("org_id", member.org_id)
        .eq("status", "pending")
        .order("appointment_at", { ascending: true }),
      // Yalnızca "Bekleme Listesine Ekle" formundaki dropdown'lar için — maaş/prim
      // gibi hassas kolonları hiç seçmiyoruz (personel rolü zaten bunları hiç
      // görmemeli; select("*") yerine id+full_name ile bu risk baştan kapatılıyor).
      proTools
        ? supabase
            .from("staff")
            .select("id, full_name")
            .eq("org_id", member.org_id)
            .eq("is_active", true)
            .order("display_order")
        : Promise.resolve({ data: [] as unknown[] }),
      proTools
        ? supabase
            .from("services")
            .select("id, name")
            .eq("org_id", member.org_id)
            .eq("is_active", true)
            .order("display_order")
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

  const settings = (member.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhone = member.role !== "staff" || staffPhoneAccess;
  const rawSlotMinutes = Number(settings.booking_slot_minutes);
  const bookingSlotMinutes = [15, 30, 60].includes(rawSlotMinutes) ? rawSlotMinutes : 15;

  return (
    <BeklemeListesiClient
      initialEntries={(waitlistRaw ?? []) as unknown as WaitlistEntry[]}
      initialPendingAppts={(talepRaw ?? []) as unknown as PendingAppt[]}
      initialPendingRequests={(requestsRaw ?? []) as unknown as PendingRequest[]}
      staffOptions={(staffRows ?? []) as unknown as StaffOption[]}
      serviceOptions={(serviceRows ?? []) as unknown as ServiceOption[]}
      showPhone={showPhone}
      bookingSlotMinutes={bookingSlotMinutes}
    />
  );
}
