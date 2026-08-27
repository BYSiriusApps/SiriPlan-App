// WhatsApp Business API (Meta Cloud API) — outbound notification messages
// WHATSAPP_TOKEN  → Meta Graph API access token
// WHATSAPP_PHONE_ID → Phone number ID in Meta Business account

const META_API = "https://graph.facebook.com/v19.0";

export async function sendWhatsAppMessage(toNumber: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !toNumber) {
    console.error(`[whatsapp-notify] whatsapp_not_configured — to=${toNumber || "(boş)"}`);
    return;
  }

  // Normalize number: strip spaces/dashes, ensure it starts with country code (no +)
  const normalized = toNumber.replace(/\D/g, "");

  const res = await fetch(`${META_API}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalized,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // Not: serbest metin mesajları yalnızca 24 saatlik müşteri penceresi içinde teslim edilir —
    // pencere dışında Meta bu isteği reddeder, bu da sık görülen bir hata nedenidir.
    console.error(`[whatsapp-notify] Meta API hatası — to=${normalized} status=${res.status} detail=${errText}`);
  }
}
