/**
 * Randevu oluşturulduğunda müşteriye giden otomatik WhatsApp mesajı.
 *
 * Şablon işletme bazında organizations.settings_json.wa_appointment_template
 * alanında saklanır; boşsa DEFAULT_WA_TEMPLATE kullanılır. Salon sahibi
 * Ayarlar sayfasından metni değiştirebilir.
 *
 * Desteklenen değişkenler: {musteri} {salon} {tarih} {saat} {hizmet} {personel} {konum}
 */

export const DEFAULT_WA_TEMPLATE =
  "Sayın {musteri}, {salon} işletmesinde {tarih} tarihi ve {saat} saati için randevunuz oluşturulmuştur. Sorunuz olursa bu numaradan bize ulaşabilirsiniz. Görüşmek üzere! 💫";

export const DEFAULT_WA_CANCEL_TEMPLATE =
  "Sayın {musteri}, {salon} işletmesindeki {tarih} tarihli ve {saat} saatli randevunuz iptal edilmiştir.";

export const DEFAULT_WA_REVIZE_TEMPLATE =
  "Sayın {musteri}, {salon} işletmesindeki randevunuz {tarih} tarihi ve {saat} saati olarak güncellenmiştir.";

export const DEFAULT_WA_REMINDER_TEMPLATE =
  "Sayın {musteri}, {salon} işletmesindeki {tarih} günü saat {saat} randevunuzu hatırlatmak isteriz. Görüşmek üzere!";

export const WA_TEMPLATE_VARS = [
  { key: "{musteri}", desc: "Müşteri adı" },
  { key: "{salon}", desc: "Salon adı" },
  { key: "{tarih}", desc: "Randevu tarihi (20.07.2026)" },
  { key: "{saat}", desc: "Randevu saati (15:00)" },
  { key: "{hizmet}", desc: "Hizmet adı" },
  { key: "{personel}", desc: "Personel adı" },
  { key: "{konum}", desc: "Konum linki (Google Maps)" },
] as const;

export interface WaTemplateVars {
  musteri: string;
  salon: string;
  /** Yerel "yyyy-MM-ddTHH:mm" veya ISO string */
  appointmentAt: string;
  hizmet?: string;
  personel?: string;
  /** İşletme adresi — doluysa mesaj sonuna Google Maps linki eklenir. */
  address?: string;
  /** Kayıtlı Google Maps paylaşım linki — doluysa adresten üretilen linkin yerine kullanılır. */
  locationUrl?: string;
}

/** İşletme adresinden tıklanabilir Google Maps arama linki üretir. */
export function googleMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** "05xx...", "+90 5xx..." → "905xxxxxxxxx" (wa.me formatı) */
export function toWaPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return "9" + digits;
  if (digits.length === 10) return "90" + digits;
  return digits;
}

export function renderWaTemplate(
  template: string | null | undefined,
  vars: WaTemplateVars,
  defaultTemplate: string = DEFAULT_WA_TEMPLATE
): string {
  const d = new Date(vars.appointmentAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tarih = isNaN(d.getTime())
    ? ""
    : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const saat = isNaN(d.getTime()) ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const address = vars.address?.trim();
  const locationLink = vars.locationUrl?.trim() || (address ? googleMapsLink(address) : "");

  const raw = template?.trim() || defaultTemplate;
  const hasLocationVar = raw.includes("{konum}");

  const rendered = raw
    .replaceAll("{musteri}", vars.musteri)
    .replaceAll("{salon}", vars.salon)
    .replaceAll("{tarih}", tarih)
    .replaceAll("{saat}", saat)
    .replaceAll("{hizmet}", vars.hizmet ?? "")
    .replaceAll("{personel}", vars.personel ?? "")
    .replaceAll("{konum}", locationLink)
    .replace(/ {2,}/g, " ")
    .trim();

  // {konum} zaten şablonda kullanıldıysa sona ikinci kez eklenmesin
  return !hasLocationVar && locationLink ? `${rendered}\n\n📍 Konum: ${locationLink}` : rendered;
}

/** Hazır mesajla müşterinin WhatsApp sohbetini açan link */
export function waMessageLink(phone: string, text: string): string {
  return `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(text)}`;
}
