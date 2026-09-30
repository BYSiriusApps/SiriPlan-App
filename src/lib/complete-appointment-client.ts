/**
 * Panelde "Tamamlandı" isteğinin tek giriş noktası. /complete uç noktasını
 * çağırır; müşterinin kullanılabilir bir kampanya indirim hakkı varsa sunucu
 * 409 OFFER_CHOICE döner ve burada çalışana sorulur (uygula / uygulama /
 * vazgeç). Hak yoksa davranış eskisiyle birebir aynıdır: tek istek, aynı yanıt.
 *
 * Geriye uyumluluk için hep bir Response döner (vazgeçilirse 409 + açıklayıcı
 * hata) — çağıran kodların `res.ok` / `res.json()` mantığı değişmez.
 */

export interface OfferChoiceOffer {
  log_id: string;
  campaign_name: string;
  label: string;
  discount_amount: number;
  final_price: number;
  valid_until: string;
}

export type OfferChoiceResult = string | "none" | null; // log_id | "none" | null (vazgeç)

type Asker = (offers: OfferChoiceOffer[]) => Promise<OfferChoiceResult>;
let asker: Asker | null = null;

/** OfferChoiceHost tarafından kaydedilir. */
export function registerOfferAsker(fn: Asker | null) {
  asker = fn;
}

export async function completeAppointmentRequest(
  id: string,
  body: Record<string, unknown> = {}
): Promise<Response> {
  const post = (extra?: Record<string, unknown>) =>
    fetch(`/api/appointments/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...extra }),
    });

  const res = await post();
  if (res.status !== 409) return res;

  const data = await res.clone().json().catch(() => null);
  if (data?.code !== "OFFER_CHOICE") return res;

  // Soru penceresi yoksa (beklenmedik) güvenli varsayılan: indirimsiz tamamla —
  // hak kullanılmamış kalır, kaybolmaz.
  if (!asker) return post({ apply_campaign_log_id: "none" });

  const choice = await asker((data.offers ?? []) as OfferChoiceOffer[]);
  if (!choice) {
    return new Response(
      JSON.stringify({ error: "İşlem iptal edildi, randevu tamamlanmadı" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
  return post({ apply_campaign_log_id: choice });
}
