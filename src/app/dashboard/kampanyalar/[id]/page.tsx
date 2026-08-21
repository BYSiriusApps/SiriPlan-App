import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect, notFound } from "next/navigation";
import type { Campaign } from "@/types/database";
import { resolveCampaignRecipients } from "@/lib/campaign-segment";
import KampanyaDetayClient, { type CampaignLogRow } from "./KampanyaDetayClient";

export default async function KampanyaDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const { data: org } = await supabase
    .from("organizations")
    .select("feature_campaigns")
    .eq("id", member.org_id)
    .single();

  if (!org?.feature_campaigns) redirect("/dashboard/kampanyalar");

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (error || !campaign) notFound();

  const { data: logs } = await supabase
    .from("campaign_logs")
    .select("id, customer_id, phone, status, error_msg, sent_at, customers(full_name)")
    .eq("campaign_id", id)
    .order("sent_at", { ascending: false });

  let previewCount: number | null = null;
  if (campaign.status === "draft" || campaign.status === "scheduled") {
    const recipients = await resolveCampaignRecipients(supabase, member.org_id, campaign.segment_json);
    previewCount = recipients.length;
  }

  return (
    <KampanyaDetayClient
      campaign={campaign as Campaign}
      logs={(logs ?? []) as unknown as CampaignLogRow[]}
      previewCount={previewCount}
      canSend={member.role !== "staff"}
    />
  );
}
