import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { sendCampaignNow } from "@/lib/campaign-send";

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

  // Kampanyanın gerçekten bu org'a ait olduğunu doğrula (auth sınırı burada çizilir,
  // sendCampaignNow admin çağrılarında da kullanıldığı için kendi içinde org kontrolü yapmaz)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });

  const result = await sendCampaignNow(supabase, id);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    success: result.sent_count > 0,
    sent_count: result.sent_count,
    failed_count: result.failed_count,
    total: result.total,
  });
}
