import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { resolveCampaignRecipients } from "@/lib/campaign-segment";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (fetchErr || !campaign) return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });

  const { data: logs } = await supabase
    .from("campaign_logs")
    .select("id, customer_id, phone, status, error_msg, sent_at, customers(full_name)")
    .eq("campaign_id", id)
    .order("sent_at", { ascending: false });

  let previewCount: number | null = null;
  if (campaign.status === "draft") {
    const recipients = await resolveCampaignRecipients(supabase, member.org_id, campaign.segment_json);
    previewCount = recipients.length;
  }

  return NextResponse.json({ campaign, logs: logs ?? [], preview_count: previewCount });
}
