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
/**
 * `locale` "en" ise ve İngilizce şablon onaylıysa önce o denenir; onaysız/
 * reddedilirse (Meta henüz onaylamadıysa) otomatik olarak Türkçe şablona
 * düşülür — bu da başarısız olursa çağıran taraf (notify.ts → dispatchWhatsApp)
 * serbest metne düşer. Yani üç kademeli, hiçbir aşama diğerini KIRMAZ: EN
 * şablon → TR şablon → serbest metin.
 */
export async function sendInternalTemplate(
  toNumber: string,
  purpose: WaInternalPurpose,
  params: Record<string, string>,
  locale: string = "tr"
): Promise<boolean> {
  const def = WA_INTERNAL_TEMPLATES[purpose];

  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = toWhatsAppNumber(toNumber);
  if (!token || !phoneId || !to) return false;

  const bodyParameters = def.bodyParamOrder.map((key) => {
    const cleaned = (params[key] ?? "").replace(/\s+/g, " ").trim();
    return { type: "text", text: cleaned || "-" };
  });

  async function attempt(name: string, languageCode: string): Promise<boolean> {
    try {
      const res = await fetch(`${META_API}/${phoneId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name,
            language: { code: languageCode },
            components: [{ type: "body", parameters: bodyParameters }],
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(
          `[wa-templates/internal] Meta API hatası — purpose=${purpose} template=${name} to=${to} status=${res.status} detail=${errText}`
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error(`[wa-templates/internal] ağ hatası — purpose=${purpose} to=${to}`, e);
      return false;
    }
  }

  if (locale === "ru") {
    const ruName = def.metaNameRu || def.metaNameEn || def.metaName;
    if (ruName && (await attempt(ruName, "ru"))) return true;
    if (def.metaNameEn && (await attempt(def.metaNameEn, "en"))) return true;
  } else if (locale === "ar") {
    const arName = def.metaNameAr || def.metaNameEn || def.metaName;
    if (arName && (await attempt(arName, "ar"))) return true;
    if (def.metaNameEn && (await attempt(def.metaNameEn, "en"))) return true;
  } else if (locale === "en" && def.metaNameEn) {
    if (await attempt(def.metaNameEn, "en")) return true;
  }

  if (!def.metaName) return false;
  return attempt(def.metaName, "tr");
}
