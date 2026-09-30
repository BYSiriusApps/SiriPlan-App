/**
 * Kampanya indirim teklifi — tanım doğrulama + mesaj metni yardımcıları.
 * İndirim tanımı yoksa (discount_type boş) kampanya eskisi gibi yalnızca
 * mesajdır; hiçbir şey değişmez.
 */

export interface CampaignOffer {
  discount_type: "percent" | "fixed";
  discount_value: number;
  /** Son geçerli gün, YYYY-MM-DD (o gün dahil). */
  valid_until: string;
  /** null = tüm hizmetler */
  service_ids: string[] | null;
  /** null = alt sınır yok */
  min_amount: number | null;
}

type OfferRow = {
  discount_type?: string | null;
  discount_value?: number | string | null;
  valid_until?: string | null;
  service_ids?: string[] | null;
  min_amount?: number | string | null;
};

/** Kampanya satırından teklif çıkarır; tanım yoksa ya da bozuksa null. */
export function getOffer(row: OfferRow | null | undefined): CampaignOffer | null {
  if (!row || (row.discount_type !== "percent" && row.discount_type !== "fixed")) return null;
  const value = Number(row.discount_value);
  if (!Number.isFinite(value) || value <= 0 || !row.valid_until) return null;
  const min = row.min_amount != null ? Number(row.min_amount) : null;
  return {
    discount_type: row.discount_type,
    discount_value: value,
    valid_until: String(row.valid_until).slice(0, 10),
    service_ids: row.service_ids && row.service_ids.length > 0 ? row.service_ids : null,
    min_amount: min != null && Number.isFinite(min) && min > 0 ? min : null,
  };
}

/** Bugünün tarihi (YYYY-MM-DD), İstanbul saatiyle. */
export function todayInIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export function isOfferExpired(offer: CampaignOffer): boolean {
  return offer.valid_until < todayInIstanbul();
}

function trMoney(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export function formatDiscount(offer: CampaignOffer): string {
  return offer.discount_type === "percent"
    ? `%${trMoney(offer.discount_value)} indirim`
    : `${trMoney(offer.discount_value)} ₺ indirim`;
}

export function formatOfferDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

/**
 * Mesajın sonuna otomatik eklenen şartlar satırı. Müşteri ne kazandığını,
 * ne zamana kadar ve hangi koşulla geçerli olduğunu ve indirimin salonda
 * işlem sonrası uygulanacağını açıkça görür — yanlış anlaşılma olmasın diye
 * şablona bağlı değildir, her zaman eklenir.
 */
export function offerTermsLine(offer: CampaignOffer, serviceNames: string[]): string {
  const parts = [`🎁 ${formatDiscount(offer)}`];
  if (serviceNames.length > 0) parts.push(`Geçerli hizmetler: ${serviceNames.join(", ")}`);
  if (offer.min_amount) parts.push(`en az ${trMoney(offer.min_amount)} ₺ tutarındaki işlemlerde`);
  parts.push(`${formatOfferDate(offer.valid_until)} tarihine kadar geçerli`);
  parts.push("Müşteri başına bir kez kullanılır");
  parts.push("İndirim, işlem sonrasında salonda uygulanır");
  return parts.join(" • ");
}

export type OfferInputResult =
  | { ok: true; offer: CampaignOffer | null }
  | { ok: false; error: string };

/** İstemciden gelen indirim alanlarını doğrular (tanım yoksa offer: null). */
export function parseOfferInput(
  body: Record<string, unknown>,
  scheduledAtIso: string | null
): OfferInputResult {
  const type = body.discount_type;
  if (type == null || type === "") return { ok: true, offer: null };
  if (type !== "percent" && type !== "fixed") return { ok: false, error: "Geçersiz indirim türü" };

  const value = Number(body.discount_value);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "İndirim değeri 0'dan büyük olmalı" };
  if (type === "percent" && value > 100) return { ok: false, error: "Yüzde indirim en fazla 100 olabilir" };
  if (type === "fixed" && value > 1_000_000) return { ok: false, error: "İndirim tutarı geçersiz" };

  const validUntil = typeof body.valid_until === "string" ? body.valid_until.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || Number.isNaN(new Date(`${validUntil}T12:00:00Z`).getTime())) {
    return { ok: false, error: "İndirim için son geçerlilik tarihi zorunlu" };
  }
  if (validUntil < todayInIstanbul()) return { ok: false, error: "Son geçerlilik tarihi geçmişte olamaz" };
  if (scheduledAtIso) {
    const sched = new Date(scheduledAtIso);
    if (!Number.isNaN(sched.getTime())) {
      const schedDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(sched);
      if (validUntil < schedDay) return { ok: false, error: "Son geçerlilik tarihi gönderim tarihinden önce olamaz" };
    }
  }

  const min = body.min_amount == null || body.min_amount === "" ? null : Number(body.min_amount);
  if (min != null && (!Number.isFinite(min) || min < 0)) return { ok: false, error: "Asgari tutar geçersiz" };

  const ids = Array.isArray(body.service_ids)
    ? (body.service_ids as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 100)
    : [];

  return {
    ok: true,
    offer: {
      discount_type: type,
      discount_value: value,
      valid_until: validUntil,
      service_ids: ids.length > 0 ? ids : null,
      min_amount: min && min > 0 ? min : null,
    },
  };
}
