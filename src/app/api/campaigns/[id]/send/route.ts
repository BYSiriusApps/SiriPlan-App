import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { sendCampaignNow } from "@/lib/campaign-send";
import { logAudit } from "@/lib/audit";

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

  // KVKK denetim izi: toplu WhatsApp/SMS gönderimi müşteri iletişim verisinin
  // işlendiği en geniş kapsamlı eylem — "kim bu mesajı kime gönderdi" sorusunun
  // cevabı kayda geçmeli. Başarısız denemeler de yazılır (kasıtlı kötüye
  // kullanım denemesi de bir izdir).
  await logAudit({
    orgId: member.org_id, userId: user.id, action: "campaign_bulk_send",
    tableName: "campaigns", recordId: id,
    details: {
      role: member.role,
      ok: result.ok,
      sent_count: result.ok ? result.sent_count : 0,
      failed_count: result.ok ? result.failed_count : 0,
      total: result.ok ? result.total : 0,
      error: result.ok ? null : result.error,
    },
    req,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    success: result.sent_count > 0,
    sent_count: result.sent_count,
    failed_count: result.failed_count,
    total: result.total,
  });
}
