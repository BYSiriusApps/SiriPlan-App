/**
 * Telefon numaralarını karşılaştırma ve kayıt için tek biçime indirger.
 * "0555 123 45 67", "0555-123-45-67", "+90 555 123 45 67", "905551234567"
 * hepsi "05551234567" olur — böylece aynı numara farklı biçimlerde girildiğinde
 * mükerrer müşteri kaydı oluşmaz.
 */
export function normalizePhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 10) {
    digits = "0" + digits;
  }
  return digits;
}
