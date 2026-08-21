const TELEGRAM_API = "https://api.telegram.org";

async function sendViaBot(token: string | undefined, chatId: string, text: string): Promise<void> {
  if (!token || !chatId) {
    console.warn("[telegram] bot token veya chat_id tanımlı değil — bildirim atlandı");
    return;
  }

  // Telegram hataları (geçersiz token, bota /start denmemiş chat, HTML parse
  // hatası) 200 DEĞİL ama fetch yine de RESOLVE eder. Yanıt kontrol edilmezse
  // çağıran taraf "gönderildi" sanır: bot token'ı iptal olduğu gün yeni kayıt
  // ve iletişim bildirimleri sessizce kesilir ve bunu kimse fark etmez.
  // Bu yüzden yanıt burada okunur ve başarısızlık loglanır.
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Token gövdede geçmiyor (URL'de geçiyor, o da loglanmıyor) — sızıntı yok.
    console.error(`[telegram] gönderim başarısız (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }
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
