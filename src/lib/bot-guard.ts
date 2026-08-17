/**
 * Bot/spam savunması — CAPTCHA olmadan, kullanıcı deneyimini hiç bozmadan.
 *
 * Üç bağımsız sinyal kullanılır; hiçbiri tek başına bloke etmez, birlikte
 * otomatik form doldurucuların ezici çoğunluğunu eler:
 *
 *   1. Honeypot  — formda görünmez bir alan (`website`). Gerçek kullanıcı asla
 *                  dolduramaz, "tüm input'ları doldur" mantığıyla çalışan botlar
 *                  neredeyse her zaman doldurur.
 *   2. Zamanlama — formun ekrana geldiği an (`form_started_at`) ile gönderim anı
 *                  arasındaki fark. İnsan bir randevu formunu 3 saniyeden kısa
 *                  sürede dolduramaz; script milisaniyelerde doldurur.
 *   3. İçerik    — tek kullanımlık e-posta alan adları, URL/BBCode içeren isim
 *                  alanları (SEO spam botlarının klasik imzası).
 *
 * Not: Bunlar hız sınırlayıcının (bkz. lib/rate-limit.ts) YERİNE değil, YANINDA
 * çalışır. Hız sınırı hacmi, bot-guard ise niteliği filtreler.
 */

/** Formun ne kadar hızlı doldurulduğu insanlık için alt sınır (ms). */
const MIN_HUMAN_FILL_MS = 2500;
/** Sayfa açık kalıp saatler sonra gönderilen formlar da şüpheli sayılmaz — sadece üst sınır sanity check. */
const MAX_FORM_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Tek kullanımlık ("disposable") e-posta alan adları. Amaç: 14 günlük ücretsiz
 * denemeyi sonsuz kez sıfırlamak için sahte hesap üreten botlar. Liste kısa ve
 * yüksek isabetli tutuldu — meşru kullanıcıyı yanlışlıkla engellememek için
 * agresif genişletilmedi.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
  "throwawaymail.com", "yopmail.com", "yopmail.fr", "trashmail.com",
  "getnada.com", "dispostable.com", "fakeinbox.com", "maildrop.cc",
  "maildrop.cc", "moakt.com", "emailondeck.com", "spam4.me", "grr.la",
  "mytemp.email", "tempr.email", "discard.email", "mailnesia.com",
  "inboxbear.com", "burnermail.io", "tempmailo.com", "mail-temp.com",
  "1secmail.com", "1secmail.org", "1secmail.net", "vpndada.com",
]);

/** İsim/not alanlarında link spam'i: bot imzası olan kalıplar. */
const SPAM_CONTENT_RE = /(https?:\/\/|www\.|\[url|<a\s|\bviagra\b|\bcasino\b|\bcrypto\s?wallet\b)/i;

export type BotGuardInput = {
  /** Honeypot alanı — formdaki gizli input'un değeri. Dolu olmamalı. */
  honeypot?: unknown;
  /** Form ekrana geldiğinde alınan `Date.now()` damgası. */
  formStartedAt?: unknown;
  /** İsim, not gibi serbest metin alanları — link spam'i için taranır. */
  textFields?: (string | null | undefined)[];
  /** Kayıt/e-posta akışlarında tek kullanımlık alan adı kontrolü için. */
  email?: string | null;
};

export type BotGuardVerdict =
  | { bot: false }
  | { bot: true; reason: "honeypot" | "too_fast" | "spam_content" | "disposable_email" };

export function detectBot(input: BotGuardInput): BotGuardVerdict {
  // 1. Honeypot — herhangi bir dolu değer bot demektir.
  if (typeof input.honeypot === "string" && input.honeypot.trim() !== "") {
    return { bot: true, reason: "honeypot" };
  }

  // 2. Zamanlama. Damga hiç gelmediyse ceza verilmez (eski istemci/önbellek
  //    sürümleri hâlâ çalışsın diye) — sadece geldiğinde değerlendirilir.
  const started = Number(input.formStartedAt);
  if (Number.isFinite(started) && started > 0) {
    const elapsed = Date.now() - started;
    if (elapsed >= 0 && elapsed < MIN_HUMAN_FILL_MS) {
      return { bot: true, reason: "too_fast" };
    }
    if (elapsed > MAX_FORM_AGE_MS) {
      return { bot: true, reason: "too_fast" };
    }
  }

  // 3. Serbest metinde link spam'i.
  for (const field of input.textFields ?? []) {
    if (typeof field === "string" && SPAM_CONTENT_RE.test(field)) {
      return { bot: true, reason: "spam_content" };
    }
  }

  // 4. Tek kullanımlık e-posta.
  if (input.email && isDisposableEmail(input.email)) {
    return { bot: true, reason: "disposable_email" };
  }

  return { bot: false };
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Bot yakalandığında kullanıcıya dönülecek mesaj. Kasıtlı olarak MUĞLAK —
 * "honeypot'a takıldın" demek, saldırgana hangi alanı boş bırakması gerektiğini
 * öğretir. Gerçek bir kullanıcı yanlışlıkla takılırsa sayfayı yenilemesi yeterli.
 */
export const BOT_REJECTION_MESSAGE =
  "İsteğiniz doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.";

/**
 * Formlara eklenecek gizli honeypot input'unun alan adı. İstemci ve sunucu
 * tarafının aynı adı kullanması için tek kaynak.
 */
export const HONEYPOT_FIELD = "website";
