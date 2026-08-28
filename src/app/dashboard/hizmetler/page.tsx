import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import type { Service, ServiceCategory } from "@/types/database";
import { HizmetlerClient } from "./HizmetlerClient";

export default async function HizmetlerPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const [{ data: services }, { data: categories }] = await Promise.all([
    supabase.from("services").select("*").eq("org_id", member.org_id).eq("is_active", true).order("display_order"),
    supabase.from("service_categories").select("*").eq("org_id", member.org_id).order("display_order"),
  ]);

  return (
    <HizmetlerClient
      initialServices={(services || []) as Service[]}
      initialCategories={(categories || []) as ServiceCategory[]}
      canEdit={true}
      orgId={member.org_id}
    />
  );
}
