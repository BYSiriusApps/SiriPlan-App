const TELEGRAM_API = "https://api.telegram.org";

async function sendViaBot(token: string | undefined, chatId: string, text: string): Promise<void> {
  if (!token || !chatId) return;

  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

/** İşletme bildirim botu — org/personel bazlı chat_id'lere randevu bildirimi gönderir */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  return sendViaBot(process.env.TELEGRAM_BOT_TOKEN, chatId, text);
}

/** Platform admin botu — sabit tek alıcıya (TELEGRAM_ADMIN_CHAT_ID) yeni kayıt bildirimi gönderir */
export async function sendAdminTelegramMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) return;
  return sendViaBot(process.env.TELEGRAM_ADMIN_BOT_TOKEN, chatId, text);
}

/** Admin botuna /start yazan kişiye kendi chat_id'sini bildirmek için — henüz TELEGRAM_ADMIN_CHAT_ID bilinmeden kullanılır */
export async function sendAdminBotReply(chatId: string, text: string): Promise<void> {
  return sendViaBot(process.env.TELEGRAM_ADMIN_BOT_TOKEN, chatId, text);
}
