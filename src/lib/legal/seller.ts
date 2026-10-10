/**
 * Satıcı (hizmet sağlayıcı) bilgileri ve ödeme-öncesi onay sürümü.
 *
 * Mesafeli satış sözleşmesi, ön bilgilendirme formu ve iade/iptal politikası
 * bu dosyadaki değerleri kullanır; tek yerden güncellenir. Metinlerde veya
 * onay kutularında esaslı bir değişiklik yapılırsa CONSENT_VERSION artırılır —
 * böylece hangi sürümün onaylandığı kayıtlarda (Stripe metadata + audit_logs)
 * ayırt edilebilir.
 */
export const CONSENT_VERSION = "2026-10-10";

export const SELLER = {
  legalName: "BY Sirius Group Ai and Technology Co Ltd.",
  jurisdiction: { tr: "İngiltere ve Galler", en: "England and Wales" },
  registrationNo: "17142392",
  // Kayıtlı adres (bysirius.com/iletisim ile aynı).
  registeredAddress: "71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom",
  email: "info@bysirius.com",
  phone: "+90 535 503 26 34",
  website: "https://siriplan.com",
  effectiveDate: { tr: "10 Ekim 2026", en: "10 October 2026" },
} as const;
