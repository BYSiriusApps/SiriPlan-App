import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { resolveCampaignRecipients, renderCampaignMessage } from "@/lib/campaign-segment";
import { sendSms } from "@/lib/sms";

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return "90" + digits.slice(1);
  if (digits.length === 10) return "90" + digits;
  return digits;
}

async function sendWhatsappFreeform(
  { waToken, waPhoneNumberId }: { waToken: string; waPhoneNumberId: string },
  toPhone: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/v19.0/${waPhoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(toPhone),
        type: "text",
        text: { body: message },
      }),
    });
  } catch {
    return { ok: false, error: "WhatsApp API'sine ulaşılamadı" };
  }

  if (res.ok) return { ok: true };
  const detail = await res.text().catch(() => "");
  return { ok: false, error: detail || "WhatsApp API hatası" };
}

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

  const { data: org } = await supabase
    .from("organizations")
    .select("name, wa_token, wa_phone_number_id")
    .eq("id", member.org_id)
    .single();

  if (!org) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });

  const recipients = await resolveCampaignRecipients(supabase, member.org_id, campaign.segment_json);

  if (recipients.length === 0) {
    await supabase
      .from("campaigns")
      .update({ status: "failed", sent_count: 0, sent_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ error: "Bu segmentte kampanya bildirimi onaylı müşteri bulunamadı" }, { status: 400 });
  }

  const channel = campaign.channel === "sms" ? "sms" : "whatsapp";
  const waConfigured = !!(org.wa_token && org.wa_phone_number_id);

  const logs: { campaign_id: string; customer_id: string; phone: string; status: string; error_msg: string | null }[] = [];
  let sentCount = 0;

  for (const c of recipients) {
    if (!c.phone) {
      logs.push({ campaign_id: id, customer_id: c.id, phone: "", status: "failed", error_msg: "Telefon numarası yok" });
      continue;
    }

    const message = renderCampaignMessage(campaign.message_template, {
      customerName: c.full_name,
      orgName: org.name,
      lastVisitAt: c.last_visit_at,
    });

    if (channel === "sms") {
      const result = await sendSms({ toPhone: c.phone, orgId: member.org_id, message });
      if ("sent" in result) {
        sentCount++;
        logs.push({ campaign_id: id, customer_id: c.id, phone: c.phone, status: "sent", error_msg: null });
      } else if ("skipped" in result) {
        logs.push({ campaign_id: id, customer_id: c.id, phone: c.phone, status: "failed", error_msg: `SMS gönderilemedi: ${result.reason}` });
      } else {
        logs.push({ campaign_id: id, customer_id: c.id, phone: c.phone, status: "failed", error_msg: result.detail || result.error });
      }
    } else {
      if (!waConfigured) {
        logs.push({ campaign_id: id, customer_id: c.id, phone: c.phone, status: "failed", error_msg: "WhatsApp Business hesabı bağlı değil" });
        continue;
      }
      const result = await sendWhatsappFreeform(
        { waToken: org.wa_token!, waPhoneNumberId: org.wa_phone_number_id! },
        c.phone,
        message
      );
      if (result.ok) {
        sentCount++;
        logs.push({ campaign_id: id, customer_id: c.id, phone: c.phone, status: "sent", error_msg: null });
      } else {
        logs.push({ campaign_id: id, customer_id: c.id, phone: c.phone, status: "failed", error_msg: result.error });
      }
    }
  }

  if (logs.length > 0) {
    await supabase.from("campaign_logs").insert(logs);
  }

  const finalStatus = sentCount > 0 ? "sent" : "failed";
  await supabase
    .from("campaigns")
    .update({ status: finalStatus, sent_count: sentCount, sent_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({
    success: sentCount > 0,
    sent_count: sentCount,
    failed_count: logs.length - sentCount,
    total: recipients.length,
  });
}
