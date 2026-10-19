// WhatsApp Business API (Meta Cloud API) — outbound notification messages
// WHATSAPP_TOKEN  → Meta Graph API access token
// WHATSAPP_PHONE_ID → Phone number ID in Meta Business account

import { toWhatsAppNumber } from "@/lib/phone";
import { getWaLine, postWaMessage } from "@/lib/wa-line";

/**
 * Serbest metin WhatsApp mesajı gönderir.
 *
 * DÖNÜŞ: gönderim gerçekten Meta tarafından kabul edildiyse `true`.
 * NOT: Meta serbest metni yalnızca alıcının işletmeye son 24 saatte yazdığı
 * "müşteri hizmetleri penceresi" içinde teslim eder. Pencere dışında (ör. hiç
 * yazışmamış bir personele davet) istek reddedilir → `false`. Bu durumda çağıran
 * taraf kullanıcıya "linki elle iletin" seçeneği sunmalı.
 */
export async function sendWhatsAppMessage(toNumber: string, text: string): Promise<boolean> {
  // SiriPlan utility hattı (sağlayıcı: meta | 360dialog — bkz. lib/wa-line.ts).
  const waLine = getWaLine("utility");
  const to = toWhatsAppNumber(toNumber);
  if (!waLine || !to) {
    console.error(`[whatsapp-notify] whatsapp_not_configured — to=${to || "(boş)"}`);
    return false;
  }

  let res: Response;
  try {
    res = await postWaMessage(waLine, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    });
  } catch (e) {
    console.error(`[whatsapp-notify] ağ hatası — to=${to}`, e);
    return false;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // Pencere dışı serbest metin reddi burada sık görülür (kod 131047 / 470).
    console.error(`[whatsapp-notify] Meta API hatası — to=${to} status=${res.status} detail=${errText}`);
    return false;
  }
  return true;
}
