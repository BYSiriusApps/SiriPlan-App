/**
 * Cloudflare Turnstile doğrulaması (reCAPTCHA/hCaptcha alternatifi).
 *
 * NEDEN reCAPTCHA DEĞİL: reCAPTCHA v3 bir "skor" döndürür ve o skoru üretmek
 * için ziyaretçiyi Google'a tanıtır — KVKK/GDPR açısından ek bir veri aktarımı
 * beyanı gerektirir. Turnstile aynı işi çerezsiz ve kişisel veri toplamadan
 * yapar, üstelik ücretsizdir. Kullanıcıya %99 oranda hiçbir bulmaca göstermez.
 *
 * OPSİYONEL KATMAN: Anahtarlar tanımlı değilse bu katman sessizce devre dışı
 * kalır ve form diğer beş katmanla (honeypot, zamanlama, IP/e-posta hız sınırı,
 * Tor, içerik) çalışmaya devam eder. Anahtar TANIMLIYSA fail-closed davranır:
 * doğrulanamayan gönderim reddedilir — aksi hâlde saldırgan token'ı hiç
 * göndermeyerek katmanı atlardı.
 *
 * KURULUM: dash.cloudflare.com → Turnstile → Add site
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (istemci, gizli değil)
 *   TURNSTILE_SECRET_KEY            (sunucu, gizli)
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

export type TurnstileResult =
  /** Anahtar tanımlı değil — katman kurulmamış. */
  | { status: "disabled" }
  | { status: "passed" }
  /** Token yok/geçersiz — reddedilmeli. */
  | { status: "failed"; reason: string }
  /** Cloudflare'a ulaşılamadı — reddedilmemeli, sadece işaretlenmeli. */
  | { status: "unavailable" };

export async function verifyTurnstile(token: unknown, ip?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return { status: "disabled" };

  if (typeof token !== "string" || !token) return { status: "failed", reason: "missing_token" };

  const form = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") form.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { status: "passed" };
    return { status: "failed", reason: data["error-codes"]?.join(",") || "rejected" };
  } catch {
    // Cloudflare'a ulaşılamıyor. Yapılandırılmış bir katmanın ağ hatası yüzünden
    // TÜM iletişim formunu kapatması orantısız olurdu; diğer katmanlar devrede.
    return { status: "unavailable" };
  }
}
