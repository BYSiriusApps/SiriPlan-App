/**
 * Hafif, bağımlılıksız hız sınırlayıcı (sliding window).
 *
 * NEDEN BÖYLE: Proje Vercel'de serverless çalışıyor; her lambda örneğinin kendi
 * belleği var. Bu yüzden buradaki sayaç GLOBAL değil, örnek-başına. Yine de tek
 * bir botun aynı sıcak örneğe saniyede yüzlerce istek yağdırmasını (kayıt spam'i,
 * randevu spam'i, Gemini/WhatsApp maliyet sömürüsü) etkili biçimde kesiyor ve
 * hiçbir dış servise/pakete bağımlı değil.
 *
 * KALICI KATMAN: Yüksek değerli akışlarda (kayıt, anonim randevu) buna ek olarak
 * veritabanı tarafında da bir kontrol var (bkz. organizations.signup_ip ve
 * appointments üzerinden IP/telefon bazlı tekrar kontrolü) — tek başına belleğe
 * güvenilmiyor. Trafik büyüdüğünde tek yapılacak: aşağıdaki `hit()` gövdesini
 * Upstash Redis / Vercel KV çağrısıyla değiştirmek; çağıran hiçbir kod değişmez.
 */

import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Süresi dolmuş kayıtları temizler — Map'in sınırsız büyümesini engeller. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * İsteği yapanın IP adresi. Vercel/Cloudflare arkasında x-forwarded-for'un İLK
 * değeri gerçek istemcidir; sonrakiler proxy zinciridir. Başlık istemci
 * tarafından uydurulabilir ama Vercel gelen değeri kendi IP'siyle yeniden
 * yazdığı için üretimde güvenilir.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = {
  ok: boolean;
  /** Pencere sıfırlanana kadar kalan saniye — 429 yanıtında Retry-After olarak döner. */
  retryAfter: number;
};

/**
 * @param key    Sayaç anahtarı — genelde `${route}:${ip}` veya `${route}:${telefon}`.
 * @param limit  Pencere içinde izin verilen istek sayısı.
 * @param windowMs Pencere uzunluğu (ms).
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

/** İstek nesnesinden IP alıp `hit()` uygular — en sık kullanılan kısayol. */
export function limitByIp(
  req: NextRequest,
  route: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  return hit(`${route}:${clientIp(req)}`, limit, windowMs);
}

/** 429 yanıtı için standart gövde + Retry-After başlığı. */
export function tooManyRequests(result: RateLimitResult, message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message ?? "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.",
      code: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
      },
    }
  );
}
