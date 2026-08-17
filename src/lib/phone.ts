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

/**
 * Telefon numarasını "0535 *** ** 34" biçiminde maskeler — ilk 4 ve son 2 hane
 * görünür kalır.
 *
 * NEDEN: KVKK "veri minimizasyonu" ilkesi — randevusuna bakmakla görevli bir
 * personelin, salonun tüm müşteri listesindeki numaraları okuyup dışarı
 * çıkarabilmesi için bir sebep yok. Numaranın son haneleri, personelin "doğru
 * müşteriye mi bakıyorum" doğrulamasını yapabilmesi için bırakılır.
 *
 * Bu yalnızca GÖRÜNTÜLEME katmanıdır: maskeleme uygulandığında arama/WhatsApp
 * butonları da gizlenir (bkz. showPhoneButtons), yoksa numara `tel:` linkinden
 * yine okunabilirdi.
 */
export function maskPhone(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  // Önce tek biçime indir: aksi halde aynı numara "0535…" kayıtlıysa
  // "0535 *** ** 34", "+90 535…" kayıtlıysa "9053 *** ** 34" görünür —
  // hem çirkin hem de maskenin nerede başladığı numaradan numaraya değişir.
  const digits = normalizePhone(value);
  // Beklenmedik kısalıkta bir kayıt (eksik/hatalı veri) tamamen gizlenir —
  // "maskeledim" sanılan ama aslında numaranın çoğunu gösteren çıktı olmasın.
  if (digits.length < 7) return "•••";

  return `${digits.slice(0, 4)} *** ** ${digits.slice(-2)}`;
}
