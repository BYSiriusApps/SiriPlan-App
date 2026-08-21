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

  return <BekleyenIsteklerClient initialRequests={requests || []} />;
}
