import { createHmac, timingSafeEqual } from "crypto";

/**
 * Meta (WhatsApp Cloud API / Instagram Messaging) webhook imza doğrulaması.
 *
 * Meta her POST'u uygulama gizli anahtarıyla (App Secret) imzalayıp
 * `X-Hub-Signature-256: sha256=<hex>` başlığında gönderir. Bu doğrulama
 * yapılmazsa webhook adresini bilen HERKES sahte "gelen mesaj" isteği
 * atabilir; bizim uçlarımız buna karşılık salonun WhatsApp kotasından
 * mesaj gönderir ve Gemini API'sini çağırır — yani doğrudan para maliyeti
 * olan bir spam/DoS vektörü doğar.
 *
 * `hub.verify_token` SADECE ilk abonelik (GET) el sıkışması içindir; gelen
 * POST'ları doğrulamaz. İkisi farklı şeydir ve ikisi de gereklidir.
 */

/**
 * @param rawBody Gövdenin HAM metni. `await req.text()` ile alınmalı —
 *                JSON.parse edilip yeniden stringify edilen gövde imzayı bozar.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): boolean {
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const provided = signatureHeader.slice("sha256=".length).trim();
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  // timingSafeEqual eşit uzunluk şart koşar — yukarıdaki regex bunu garantiliyor.
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

/**
 * Telegram/cron gibi paylaşılan-sır ile korunan uçlar için sabit zamanlı
 * karşılaştırma — `a !== b` erken çıktığı için teorik olarak zamanlama
 * saldırısına açıktır, bu sürüm değildir.
 */
/**
 * Cron/otomasyon uçları için yetki kontrolü (Vercel Cron ve pg_cron
 * `Authorization: Bearer <CRON_SECRET>` gönderir).
 *
 * Önceki yazım `auth !== \`Bearer ${process.env.CRON_SECRET}\`` şeklindeydi:
 * CRON_SECRET tanımlı DEĞİLSE karşılaştırma "Bearer undefined" metnine dönüşüyor
 * ve bu başlığı gönderen herkes toplu WhatsApp/SMS gönderen cron uçlarını
 * tetikleyebiliyordu. Bu sürüm sır yoksa fail-closed davranır.
 */
export function isCronAuthorized(authorizationHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET tanımlı değil — istek reddedildi.");
    return false;
  }
  return safeCompare(authorizationHeader, `Bearer ${secret}`);
}

export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
