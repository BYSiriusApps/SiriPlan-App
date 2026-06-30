import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Service } from "@/types/database";
import { HizmetlerClient } from "./HizmetlerClient";

export default async function HizmetlerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("org_id", member.org_id)
    .order("display_order");

  const canEdit = member.role !== "staff";

  return <HizmetlerClient initialServices={(services || []) as Service[]} canEdit={canEdit} />;
}
