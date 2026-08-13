import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Kampanya hedef kitlesini segment_json filtrelerine göre çözer. Hem gönderim
 * öncesi önizleme (kaç kişiye gidecek) hem de gerçek gönderim aynı sorguyu
 * kullanır — ikisi arasında sonuç farkı olmaması için tek yerden yönetilir.
 */

export interface CampaignRecipient {
  id: string;
  full_name: string;
  phone: string;
  last_visit_at: string | null;
}

export async function resolveCampaignRecipients(
  supabase: SupabaseClient,
  orgId: string,
  segmentJson: Record<string, unknown> | null | undefined
): Promise<CampaignRecipient[]> {
  let query = supabase
    .from("customers")
    .select("id, full_name, phone, last_visit_at")
    .eq("org_id", orgId);

  const seg = (segmentJson ?? {}) as Record<string, unknown>;

  // Sayısal filtre değerlerini enjeksiyona karşı doğrula
  const minScore = Number(seg.min_score);
  const maxScore = Number(seg.max_score);
  const inactiveDays = Math.floor(Number(seg.inactive_days));

  if (seg.min_score !== undefined && !isNaN(minScore) && minScore >= 0) {
    query = query.gte("score", minScore);
  }
  if (seg.max_score !== undefined && !isNaN(maxScore) && maxScore >= 0) {
    query = query.lte("score", maxScore);
  }
  if (seg.inactive_days !== undefined && !isNaN(inactiveDays) && inactiveDays > 0 && inactiveDays <= 3650) {
    const cutoff = new Date(Date.now() - inactiveDays * 86400_000).toISOString();
    query = query.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`);
  }

  // Kampanya oluşturulurken elle seçilen müşteriler (filtreleme/seçme paneli)
  if (Array.isArray(seg.customer_ids) && seg.customer_ids.length > 0) {
    const ids = (seg.customer_ids as unknown[])
      .filter((v): v is string => typeof v === "string")
      .slice(0, 500);
    if (ids.length > 0) query = query.in("id", ids);
  }

  // KVKK: yalnızca kampanya bildirimi onayı olan müşterilere gönderilir
  query = query.eq("marketing_consent", true);

  const { data } = await query.limit(500);
  return (data ?? []) as CampaignRecipient[];
}

/** Şablon değişkenlerini ({{musteri_adi}} vb.) gerçek değerlerle değiştirir. */
export function renderCampaignMessage(
  template: string,
  vars: { customerName: string; orgName: string; lastVisitAt: string | null }
): string {
  const inactiveDaysLabel =
    vars.lastVisitAt != null
      ? String(Math.max(0, Math.floor((Date.now() - new Date(vars.lastVisitAt).getTime()) / 86400_000)))
      : "";

  return template
    .replace(/\{\{\s*musteri_adi\s*\}\}/g, vars.customerName || "")
    .replace(/\{\{\s*salon_adi\s*\}\}/g, vars.orgName || "")
    .replace(/\{\{\s*son_ziyaret_gun\s*\}\}/g, inactiveDaysLabel)
    .replace(/\{\{\s*indirim_kodu\s*\}\}/g, "");
}
