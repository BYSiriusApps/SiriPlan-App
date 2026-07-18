import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (fetchErr || !campaign) return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
  if (campaign.status === "sent") return NextResponse.json({ error: "Zaten gönderildi" }, { status: 400 });

  // Build customer segment
  let custQuery = supabase
    .from("customers")
    .select("id, full_name, phone")
    .eq("org_id", member.org_id);

  const seg = (campaign.segment_json ?? {}) as Record<string, unknown>;

  // Validate all numeric filter values to prevent injection
  const minScore = Number(seg.min_score);
  const maxScore = Number(seg.max_score);
  const inactiveDays = Math.floor(Number(seg.inactive_days));

  if (seg.min_score !== undefined && !isNaN(minScore) && minScore >= 0) {
    custQuery = custQuery.gte("score", minScore);
  }
  if (seg.max_score !== undefined && !isNaN(maxScore) && maxScore >= 0) {
    custQuery = custQuery.lte("score", maxScore);
  }
  if (seg.inactive_days !== undefined && !isNaN(inactiveDays) && inactiveDays > 0 && inactiveDays <= 3650) {
    const cutoff = new Date(Date.now() - inactiveDays * 86400_000).toISOString();
    custQuery = custQuery.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`);
  }

  const { data: customers } = await custQuery.limit(500);
  const sentCount = customers?.length || 0;

  // Log each recipient
  if (customers && customers.length > 0) {
    await supabase.from("campaign_logs").insert(
      customers.map((c) => ({
        campaign_id: id,
        customer_id: c.id,
        status: "queued",
        sent_at: new Date().toISOString(),
      }))
    );
  }

  // Mark campaign as sent
  await supabase
    .from("campaigns")
    .update({ status: "sent", sent_count: sentCount, sent_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true, sent_count: sentCount });
}
