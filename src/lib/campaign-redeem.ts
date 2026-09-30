import type { SupabaseClient } from "@supabase/supabase-js";
import { getOffer, formatDiscount, type CampaignOffer } from "@/lib/campaign-offer";

/**
 * Kampanya indirim hakkının randevu tamamlanırken uygulanması.
 *
 * Hak = `campaign_logs` satırı (mesaj o müşteriye başarıyla gitti) + kampanyanın
 * indirim tanımı. Bir satır yalnızca bir kez kullanılır (`redeemed_at`).
 * Bu dosya yalnızca okuma/hesap yapar; "kullanıldı" işaretini ve fiyatı
 * /api/appointments/[id]/complete yazar.
 *
 * ÖNEMLİ: Buradaki hiçbir hata randevu tamamlamayı engellememeli. Migration
 * henüz uygulanmamışsa ya da sorgu düşerse fonksiyonlar "hak yok" gibi davranır
 * — ana işleyiş eskisi gibi çalışır.
 */

export interface EligibleOffer {
  log_id: string;
  campaign_id: string;
  campaign_name: string;
  label: string;
  discount_amount: number;
  final_price: number;
  valid_until: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** İndirim tutarını hesaplar: fiyatı aşamaz, negatif olamaz. */
export function calcDiscount(offer: CampaignOffer, price: number): number {
  if (!(price > 0)) return 0;
  const raw = offer.discount_type === "percent"
    ? (price * offer.discount_value) / 100
    : offer.discount_value;
  return round2(Math.min(Math.max(raw, 0), price));
}

/** Randevunun işletme saat dilimindeki günü (YYYY-MM-DD). */
export function apptLocalDate(appointmentAt: string, timezone: string | null | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Europe/Istanbul" }).format(new Date(appointmentAt));
  } catch {
    return new Date(appointmentAt).toISOString().slice(0, 10);
  }
}

/** Bir randevu için bu teklif geçerli mi? (tarih randevu gününe göre, hizmet, asgari tutar) */
export function offerAppliesTo(
  offer: CampaignOffer,
  appt: { service_id: string | null; price: number; appointment_at: string },
  timezone: string | null | undefined
): boolean {
  // Randevu günü son gün içindeyse tamamlama sonra yapılsa da hak geçerli (mağduriyet olmasın).
  if (apptLocalDate(appt.appointment_at, timezone) > offer.valid_until) return false;
  if (offer.service_ids && (!appt.service_id || !offer.service_ids.includes(appt.service_id))) return false;
  if (offer.min_amount && Number(appt.price) < offer.min_amount) return false;
  return Number(appt.price) > 0;
}

type JoinedCampaign = {
  id: string; name: string; org_id: string;
  discount_type: string | null; discount_value: number | null;
  valid_until: string | null; service_ids: string[] | null; min_amount: number | null;
};

/**
 * Müşterinin bu randevuya uygulanabilecek, kullanılmamış hakları (en yüksek
 * indirim önce). Tek indeksli sorgu; hata/eksik kolon → boş liste.
 */
export async function findEligibleOffers(
  supabase: SupabaseClient,
  orgId: string,
  appt: { customer_id: string | null; service_id: string | null; price: number; appointment_at: string },
  timezone: string | null | undefined
): Promise<EligibleOffer[]> {
  if (!appt.customer_id || !(Number(appt.price) > 0)) return [];
  try {
    const { data, error } = await supabase
      .from("campaign_logs")
      .select("id, campaigns!inner(id, name, org_id, discount_type, discount_value, valid_until, service_ids, min_amount)")
      .eq("customer_id", appt.customer_id)
      .eq("status", "sent")
      .is("redeemed_at", null)
      .eq("campaigns.org_id", orgId)
      .not("campaigns.discount_type", "is", null)
      .limit(20);
    if (error || !data) return [];

    const out: EligibleOffer[] = [];
    for (const row of data as unknown as { id: string; campaigns: JoinedCampaign | JoinedCampaign[] }[]) {
      const c = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns;
      if (!c || c.org_id !== orgId) continue;
      const offer = getOffer(c);
      if (!offer || !offerAppliesTo(offer, appt, timezone)) continue;
      const discount = calcDiscount(offer, Number(appt.price));
      if (discount <= 0) continue;
      out.push({
        log_id: row.id,
        campaign_id: c.id,
        campaign_name: c.name,
        label: formatDiscount(offer),
        discount_amount: discount,
        final_price: round2(Number(appt.price) - discount),
        valid_until: offer.valid_until,
      });
    }
    return out.sort((a, b) => b.discount_amount - a.discount_amount);
  } catch {
    return [];
  }
}
