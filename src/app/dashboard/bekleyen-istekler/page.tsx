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

  const { data: requests } = await supabase
    .from("appointment_requests")
    .select("*, staff(full_name), service:services(name)")
    .eq("org_id", member.org_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  type MemberWithOrg = { org_id: string; role: string; organizations: { settings_json: Record<string, unknown> | null } | null };
  const m = member as unknown as MemberWithOrg;
  const settings = (m.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhone = m.role !== "staff" || staffPhoneAccess;

  return <BekleyenIsteklerClient initialRequests={requests || []} showPhone={showPhone} />;
}
