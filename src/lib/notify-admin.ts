import { sendAdminTelegramMessage } from "@/lib/telegram";

interface SignupInfo {
  salonName: string;
  ownerName: string;
  email: string;
  phone?: string | null;
  businessType?: string;
}

/** Yeni bir işletme Siriplan'a kaydolduğunda platform admine Telegram bildirimi gönderir */
export async function notifyAdminNewSignup(info: SignupInfo): Promise<void> {
  const message =
    `🆕 <b>Yeni Kayıt — Siriplan</b>\n\n` +
    `🏢 ${info.salonName}\n` +
    `👤 ${info.ownerName}\n` +
    `📧 ${info.email}\n` +
    (info.phone ? `📱 ${info.phone}\n` : "") +
    (info.businessType ? `🏷️ ${info.businessType}` : "");

  await sendAdminTelegramMessage(message).catch(() => {});
}
