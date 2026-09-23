import { toWhatsAppNumber } from "@/lib/phone";
import { WA_INTERNAL_TEMPLATES, type WaInternalPurpose } from "@/lib/wa-templates/internal-registry";

const META_API = "https://graph.facebook.com/v19.0";

/**
 * Personele/sahibe Meta onaylı ŞABLON mesajıyla bildirim göndermeyi dener.
 *
 * Serbest metnin aksine (bkz. whatsapp-notify.ts) şablon mesajları 24 saatlik
 * "müşteri hizmetleri penceresi" kısıtına takılmaz — bu yüzden güvenilir
 * personel/sahip bildirimi için asıl hedef budur. Meta'da henüz onaylı
 * şablon yoksa (metaName boş) veya gönderim reddedilirse `false` döner;
 * çağıran taraf bu durumda serbest-metin yoluna düşmelidir.
 */
export async function sendInternalTemplate(
  toNumber: string,
  purpose: WaInternalPurpose,
  params: Record<string, string>
): Promise<boolean> {
  const def = WA_INTERNAL_TEMPLATES[purpose];
  if (!def.metaName) return false;

  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = toWhatsAppNumber(toNumber);
  if (!token || !phoneId || !to) return false;

  const bodyParameters = def.bodyParamOrder.map((key) => {
    const cleaned = (params[key] ?? "").replace(/\s+/g, " ").trim();
    return { type: "text", text: cleaned || "-" };
  });

  try {
    const res = await fetch(`${META_API}/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: def.metaName,
          language: { code: "tr" },
          components: [{ type: "body", parameters: bodyParameters }],
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        `[wa-templates/internal] Meta API hatası — purpose=${purpose} template=${def.metaName} to=${to} status=${res.status} detail=${errText}`
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[wa-templates/internal] ağ hatası — purpose=${purpose} to=${to}`, e);
    return false;
  }
}
