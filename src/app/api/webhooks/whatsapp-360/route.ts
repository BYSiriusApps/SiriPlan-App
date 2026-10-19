import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { safeCompare } from "@/lib/webhook-signature";
import { hit } from "@/lib/rate-limit";
import { isMarketingOptOut, recordMarketingOptOutAllOrgs } from "@/lib/marketing-opt-out";
import { getWaLine, postWaMessage, type WaLineName } from "@/lib/wa-line";

export const runtime = "nodejs";

/**
 * 360dialog gelen-mesaj webhook'u (SiriPlan'ın KENDİ 360dialog numaraları için).
 *
 * 360dialog, Meta'nın X-Hub-Signature imzasını sağlamaz; bu yüzden istek, 360dialog Hub'da
 * webhook'a tanımlanan paylaşılan bir gizli anahtarla doğrulanır (header `x-siriplan-webhook-secret`
 * ya da `?secret=`). Her numara kendi gizli anahtarını kullanır, böylece hangi hattın mesajı
 * aldığı da bilinir ve yanıt AYNI numaradan gider:
 *   WHATSAPP_360_WEBHOOK_SECRET          → utility (randevu bildirim) numarası
 *   WHATSAPP_CAMPAIGN_360_WEBHOOK_SECRET → kampanya numarası
 * Gizli anahtar tanımlı değilse istek işlenmez (fail-closed).
 *
 * Yalnızca pazarlama RET'i (6563 m.9 / İYS) işlenir: müşteri "RET"/"STOP" yazarsa telefonun tüm
 * işletmelerdeki pazarlama onayı geri çekilir ve teyit mesajı gönderilir. Başka gelen mesaja
 * otomatik yanıt VERİLMEZ (AI/işletme akışlarına bu uç karışmaz); işletmelerin kendi numaralarına
 * gelen mesajlar mevcut /api/webhooks/whatsapp ucunda işlenmeye devam eder.
 */

const OPT_OUT_CONFIRM =
  "Talebiniz alındı. Bu numaraya artık tanıtım ve kampanya mesajı gönderilmeyecek. Randevu onay ve hatırlatmaları devam eder.";

function resolveLine(req: NextRequest): WaLineName | null {
  const provided = req.headers.get("x-siriplan-webhook-secret") ?? new URL(req.url).searchParams.get("secret");
  if (safeCompare(provided, process.env.WHATSAPP_360_WEBHOOK_SECRET)) return "utility";
  if (safeCompare(provided, process.env.WHATSAPP_CAMPAIGN_360_WEBHOOK_SECRET)) return "marketing";
  return null;
}

type InboundMessage = {
  from?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string } };
};

export async function POST(req: NextRequest) {
  const lineName = resolveLine(req);
  if (!lineName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { entry?: { changes?: { value?: { messages?: InboundMessage[] } }[] }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const line = getWaLine(lineName);
    const supabase = await createAdminClient();
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          const from = msg.from;
          const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || "";
          if (!from || !text || !isMarketingOptOut(text)) continue;
          // Gönderen başına tavan (Meta ucundaki ile aynı mantık).
          if (!hit(`wa360-in:${lineName}:${from}`, 10, 5 * 60 * 1000).ok) continue;

          await recordMarketingOptOutAllOrgs(supabase, {
            phone: from.replace(/^90/, "0"),
            messageSnapshot: text,
          });
          if (line) {
            await postWaMessage(line, {
              messaging_product: "whatsapp",
              to: from.replace(/\D/g, ""),
              type: "text",
              text: { body: OPT_OUT_CONFIRM },
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.error("WA 360 webhook error:", err);
  }
  // 360dialog yeniden denemesin diye her durumda 200.
  return NextResponse.json({ ok: true });
}
