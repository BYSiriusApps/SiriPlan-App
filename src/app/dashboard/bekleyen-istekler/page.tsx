import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { BekleyenIsteklerClient } from "./BekleyenIsteklerClient";

export default async function BekleyenIsteklerPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const [{ data: requests }, { data: inventoryItems }] = await Promise.all([
    supabase
      .from("appointment_requests")
      .select("*, staff(full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select("id, name, current_stock, min_stock_alert, unit")
      .eq("org_id", member.org_id)
      .eq("is_active", true),
  ]);

  type InvRow = { id: string; name: string; current_stock: number; min_stock_alert: number; unit: string };
  const criticalStock = ((inventoryItems ?? []) as InvRow[])
    .filter((i) => Number(i.min_stock_alert) > 0 && Number(i.current_stock) <= Number(i.min_stock_alert))
    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock));

  type MemberWithOrg = { org_id: string; role: string; organizations: { settings_json: Record<string, unknown> | null } | null };
  const m = member as unknown as MemberWithOrg;
  const settings = (m.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhone = m.role !== "staff" || staffPhoneAccess;

  return <BekleyenIsteklerClient initialRequests={requests || []} showPhone={showPhone} criticalStock={criticalStock} />;
}
