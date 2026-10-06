import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { resolveCampaignRecipients } from "@/lib/campaign-segment";
import { hasPermission } from "@/lib/permissions";
import { monthlyCampaignLimit } from "@/lib/entitlements";
import { releasePlanUsage } from "@/lib/plan-usage";

/**
 * Yalnızca TASLAK (status = 'draft') kampanyalar silinebilir. Gönderilmiş,
 * planlanmış ya da gönderilmekte olan kampanyalar geçmiş/kayıt olduğu için
 * silinemez. Sorgu hem org_id hem status ile sınırlıdır: başka kiracının
 * kampanyası ya da taslak olmayan kampanya hiçbir koşulda silinmez.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (!hasPermission(member, "manage_campaigns")) {
    return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });
  }

  const { data: deleted, error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("org_id", member.org_id)
    .eq("status", "draft")
    .select("id, created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!deleted || deleted.length === 0) {
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .eq("org_id", member.org_id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
    return NextResponse.json({ error: "Yalnızca taslak kampanyalar silinebilir" }, { status: 409 });
  }
  // Starter'ın aylık kampanya hakkı: hiç gönderilmemiş (taslak) bir kampanya silinirse
  // bu ay oluşturulmuşsa hakkı geri verilir; geçmiş ayın taslağı bu ayın sayacına dokunmaz.
  if (monthlyCampaignLimit(member.organizations) !== null) {
    const createdAt = (deleted[0] as { created_at?: string }).created_at;
    if (createdAt && createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)) {
      await releasePlanUsage(member.org_id, "campaign");
    }
  }
  return NextResponse.json({ ok: true });
}

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
