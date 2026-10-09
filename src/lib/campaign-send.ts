import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCampaignRecipients, renderCampaignMessage } from "@/lib/campaign-segment";
import { sendSms } from "@/lib/sms";
import { optOutFooter } from "@/lib/marketing-opt-out";
import { campaignRecipientLimit, monthlyCampaignWaLimit } from "@/lib/entitlements";
import { consumePlanUsage, getPlanUsage, releasePlanUsage } from "@/lib/plan-usage";
import { campaignLang, getCampaignWaConfig, sendCampaignTemplate } from "@/lib/campaign-wa-template";
import { getOffer, isOfferExpired, offerTermsLine } from "@/lib/campaign-offer";

/**
 * Kampanya gönderiminin tek gerçek uygulaması. Hem kullanıcının "Şimdi Gönder"
 * butonu (oturum client'ıyla, /api/campaigns/[id]/send) hem de zamanlanmış
 * kampanyaları tetikleyen cron (admin client'la, /api/cron/campaigns) bunu
 * kullanır — mantık iki yerde tekrar edilmesin diye.
 */

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

export type CampaignSendResult =
  | { ok: true; sent_count: number; failed_count: number; total: number }
  | { ok: false; error: string };

export async function sendCampaignNow(
  supabase: SupabaseClient,
  campaignId: string
): Promise<CampaignSendResult> {
  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (fetchErr || !campaign) return { ok: false, error: "Kampanya bulunamadı" };
  if (campaign.status === "sent") return { ok: false, error: "Zaten gönderildi" };

  const { data: org } = await supabase
    .from("organizations")
    .select("name, wa_token, wa_phone_number_id, plan, trial_ends_at")
    .eq("id", campaign.org_id)
    .single();

  if (!org) return { ok: false, error: "İşletme bulunamadı" };

  // İndirim teklifi varsa: süresi dolmuş bir teklif asla gönderilmez (müşteri
  // "indirim var" mesajı alıp salonda geçersiz bulmasın). Planlı kampanya bu
  // yüzden her 5 dakikada yeniden denenmesin diye başarısız işaretlenir.
  const offer = getOffer(campaign);
  let offerLine = "";
  let serviceNames: string[] = [];
  if (offer) {
    if (isOfferExpired(offer)) {
      if (campaign.status === "scheduled") {
        await supabase.from("campaigns").update({ status: "failed", sent_count: 0 }).eq("id", campaignId);
      }
      return { ok: false, error: "İndirimin son geçerlilik tarihi geçmiş — yeni bir kampanya oluşturun" };
    }
    if (offer.service_ids) {
      const { data: svc } = await supabase
        .from("services")
        .select("name")
        .eq("org_id", campaign.org_id)
        .in("id", offer.service_ids);
      serviceNames = (svc ?? []).map((s: { name: string }) => s.name);
    }
    offerLine = "\n\n" + offerTermsLine(offer, serviceNames);
  }

  // Üst sınırın 1 fazlası çekilir: sınır aşımı sessizce kırpılmak yerine fark edilsin.
  const recipientLimit = campaignRecipientLimit(org);
  const recipients = await resolveCampaignRecipients(supabase, campaign.org_id, campaign.segment_json, recipientLimit + 1);

  if (recipients.length === 0) {
    await supabase
      .from("campaigns")
      .update({ status: "failed", sent_count: 0, sent_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { ok: false, error: "Bu segmentte kampanya bildirimi onaylı müşteri bulunamadı" };
  }

  // Alıcı üst sınırı: aşılırsa HİÇBİR mesaj gönderilmez (kısmi gönderim yok).
  // Planlı kampanya her 5 dakikada yeniden denenmesin diye başarısız işaretlenir.
  if (recipients.length > recipientLimit) {
    if (campaign.status === "scheduled") {
      await supabase.from("campaigns").update({ status: "failed", sent_count: 0 }).eq("id", campaignId);
    }
    return {
      ok: false,
      error: `Bu segmentte ${recipients.length} alıcı var; tek kampanyada en fazla ${recipientLimit} alıcıya gönderilebilir. Segmenti daraltıp kampanyayı bölün.`,
    };
  }

  const channel = campaign.channel === "sms" ? "sms" : "whatsapp";
  const waConfigured = !!(org.wa_token && org.wa_phone_number_id);

  // Ayrı kampanya numarası tanımlıysa WhatsApp kampanyaları onaylı MARKETING
  // şablonuyla o numaradan gider (soğuk müşteriye serbest metin Meta'ca reddedilir).
  // Tanımlı değilse yukarıdaki eski akış aynen sürer.
  const campaignWa = channel === "whatsapp" ? getCampaignWaConfig() : null;
  const waQuota = monthlyCampaignWaLimit(org);
  let waQuotaExhausted = false;
  if (campaignWa) {
    const used = await getPlanUsage(campaign.org_id, "campaign_wa_message");
    if (used + recipients.length > waQuota) {
      if (campaign.status === "scheduled") {
        await supabase.from("campaigns").update({ status: "failed", sent_count: 0 }).eq("id", campaignId);
      }
      return {
        ok: false,
        error: `Bu ayki WhatsApp kampanya mesaj hakkınız yetersiz (kalan ${Math.max(0, waQuota - used)}, gerekli ${recipients.length}). SMS kanalını kullanın veya segmenti daraltın.`,
      };
    }
  }

  const logs: { campaign_id: string; customer_id: string; phone: string; status: string; error_msg: string | null }[] = [];
  let sentCount = 0;

  for (const c of recipients) {
    if (!c.phone) {
      logs.push({ campaign_id: campaignId, customer_id: c.id, phone: "", status: "failed", error_msg: "Telefon numarası yok" });
      continue;
    }

    const message =
      renderCampaignMessage(campaign.message_template, {
        customerName: c.full_name,
        orgName: org.name,
        lastVisitAt: c.last_visit_at,
      }) + offerLine + optOutFooter(channel === "sms" ? "sms" : "whatsapp");

    if (channel === "sms") {
      const result = await sendSms({ toPhone: c.phone, orgId: campaign.org_id, message });
      if ("sent" in result) {
        sentCount++;
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "sent", error_msg: null });
      } else if ("skipped" in result) {
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: `SMS gönderilemedi: ${result.reason}` });
      } else {
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: result.detail || result.error });
      }
    } else if (campaignWa) {
      // Hak, Meta'ya gitmeden önce atomik tüketilir; gitmezse geri verilir.
      if (waQuotaExhausted) {
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: "Aylık WhatsApp kampanya mesaj hakkı doldu" });
        continue;
      }
      const usage = await consumePlanUsage(campaign.org_id, "campaign_wa_message", waQuota);
      if (usage === "exceeded") {
        waQuotaExhausted = true;
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: "Aylık WhatsApp kampanya mesaj hakkı doldu" });
        continue;
      }
      const result = await sendCampaignTemplate(
        campaignWa,
        normalizePhone(c.phone),
        campaignLang(c.preferred_language),
        offer
          ? { kind: "discount", customerName: c.full_name, orgName: org.name, offer, serviceNames }
          : {
              kind: "announcement",
              customerName: c.full_name,
              orgName: org.name,
              message: renderCampaignMessage(campaign.message_template, {
                customerName: c.full_name,
                orgName: org.name,
                lastVisitAt: c.last_visit_at,
              }),
            }
      );
      if (result.ok) {
        sentCount++;
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "sent", error_msg: null });
      } else {
        if (usage === "ok") await releasePlanUsage(campaign.org_id, "campaign_wa_message");
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: result.error });
      }
    } else {
      if (!waConfigured) {
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: "WhatsApp Business hesabı bağlı değil" });
        continue;
      }
      const result = await sendWhatsappFreeform(
        { waToken: org.wa_token!, waPhoneNumberId: org.wa_phone_number_id! },
        c.phone,
        message
      );
      if (result.ok) {
        sentCount++;
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "sent", error_msg: null });
      } else {
        logs.push({ campaign_id: campaignId, customer_id: c.id, phone: c.phone, status: "failed", error_msg: result.error });
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
    .eq("id", campaignId);

  return { ok: true, sent_count: sentCount, failed_count: logs.length - sentCount, total: recipients.length };
}
