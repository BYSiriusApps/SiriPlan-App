import { sendAdminTelegramMessage } from "@/lib/telegram";

interface SignupInfo {
  salonName: string;
  ownerName: string;
  email: string;
  phone?: string | null;
  businessType?: string;
}

/**
 * Telegram `parse_mode: HTML` kullanıyor; kullanıcıdan gelen metin doğrudan
 * gömülürse `<b>` gibi bir girdi mesajı bozar (veya Telegram 400 döndürür ve
 * bildirim hiç gitmez). Bu yüzden serbest metin alanları HER ZAMAN buradan geçer.
 */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Yeni bir işletme Siriplan'a kaydolduğunda platform admine Telegram bildirimi gönderir */
export async function notifyAdminNewSignup(info: SignupInfo): Promise<void> {
  const message =
    `🆕 <b>Yeni Kayıt — Siriplan</b>\n\n` +
    `🏢 ${esc(info.salonName)}\n` +
    `👤 ${esc(info.ownerName)}\n` +
    `📧 ${esc(info.email)}\n` +
    (info.phone ? `📱 ${esc(info.phone)}\n` : "") +
    (info.businessType ? `🏷️ ${esc(info.businessType)}` : "");

  await sendAdminTelegramMessage(message).catch(() => {});
}

export interface ContactMessageInfo {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  /** Gönderenin IP'si — tekrarlayan spam'i elle eşleştirmek için. */
  ip?: string | null;
  /**
   * Reddetmeye yetmeyen ama insan gözüyle bakılmasını gerektiren sinyaller
   * (Tor çıkışı, tek kullanımlık e-posta, klavye gürültüsü gibi isim vb.).
   * Boşsa mesaj temiz kabul edilir.
   */
  flags?: string[];
}

/**
 * İletişim formu doldurulduğunda platform admine Telegram bildirimi gönderir.
 * Yeni kayıt bildiriminden AYRI bir başlık kullanır ("Yeni İletişim Mesajı"),
 * böylece aynı bot sohbetinde iki akış karışmaz.
 */
export async function notifyAdminContactMessage(info: ContactMessageInfo): Promise<void> {
  // Telegram tek mesajda 4096 karakter kabul eder; kalan alanı taşırmamak için
  // serbest metin kırpılır — kırpıldığı kullanıcıya değil, admine belli edilir.
  const body = info.message.length > 2500 ? `${info.message.slice(0, 2500)}\n…(kırpıldı)` : info.message;

  const message =
    `📨 <b>Yeni İletişim Mesajı — Siriplan</b>\n\n` +
    `👤 ${esc(info.name)}\n` +
    `📧 ${esc(info.email)}\n` +
    (info.phone ? `📱 ${esc(info.phone)}\n` : "") +
    `📝 <b>${esc(info.subject)}</b>\n\n` +
    `${esc(body)}` +
    (info.ip ? `\n\n🌐 <code>${esc(info.ip)}</code>` : "") +
    (info.flags?.length ? `\n⚠️ <i>Şüpheli sinyaller: ${esc(info.flags.join(", "))}</i>` : "");

  await sendAdminTelegramMessage(message).catch(() => {});
}
