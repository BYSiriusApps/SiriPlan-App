// WhatsApp Business API (Meta Cloud API) — outbound notification messages
// WHATSAPP_TOKEN  → Meta Graph API access token
// WHATSAPP_PHONE_ID → Phone number ID in Meta Business account

const META_API = "https://graph.facebook.com/v19.0";

export async function sendWhatsAppMessage(toNumber: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !toNumber) return;

  // Normalize number: strip spaces/dashes, ensure it starts with country code (no +)
  const normalized = toNumber.replace(/\D/g, "");

  await fetch(`${META_API}/${phoneId}/messages`, {
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
}
