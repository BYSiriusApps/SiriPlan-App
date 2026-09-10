/**
 * Bir dosyanın gerçekten desteklenen bir raster görsel olup olmadığını İÇERİĞİNE
 * bakarak doğrular — tarayıcının beyan ettiği `file.type` değerine değil.
 *
 * NEDEN: Panel yüklemelerinde tek kontrol `file.type.startsWith("image/")` idi;
 * bu değer istemci tarafından uydurulabilir (bir HTML/script dosyası `image/png`
 * olarak işaretlenip yüklenebilir). Burada ilk baytlardaki imzaya (magic bytes)
 * bakılır. SVG bilinçli olarak REDDEDİLİR: XML tabanlıdır, `<script>` / event
 * handler / harici referans taşıyabilir ve herkese açık bucket'tan servis
 * edildiğinde stored-XSS'e döner.
 *
 * Bağımlılıksız — sadece ilk ~32 baytı okur.
 */

export type SniffedImage = "jpeg" | "png" | "webp" | "gif" | "avif" | "heic";

/** İlk baytlardan görsel türünü çıkarır; tanınmayan/başka her şey için null. */
export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" / "GIF89a"
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "gif";

  // RIFF....WEBP  (bytes 0-3 "RIFF", bytes 8-11 "WEBP")
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "webp";
  }

  // ISO-BMFF kutusu: bytes 4-7 "ftyp", ardından marka. AVIF / HEIC bu ailede.
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "avif" || brand === "avis") return "avif";
    if (brand.startsWith("hei") || brand.startsWith("hev") || brand === "mif1" || brand === "msf1") {
      return "heic";
    }
  }

  return null;
}
