/**
 * Facebook Messenger ve Instagram Direct gönderim yardımcıları.
 *
 * İkisi de Meta'nın birleşik Sayfa Gönderim API'sini kullanır: bir Sayfaya
 * bağlı Instagram Professional hesabına gelen DM'lere de aynı Sayfa Erişim
 * Belirteciyle, aynı `/me/messages` uç noktasından yanıt verilir — ayrı bir
 * Instagram token/endpoint gerekmez.
 */

async function sendMetaReply(recipientId: string, text: string, pageToken: string): Promise<void> {
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(pageToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });
}

export async function sendMessengerReply(psid: string, text: string, pageToken: string): Promise<void> {
  await sendMetaReply(psid, text, pageToken);
}

export async function sendInstagramReply(igsid: string, text: string, pageToken: string): Promise<void> {
  await sendMetaReply(igsid, text, pageToken);
}
