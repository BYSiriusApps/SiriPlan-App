import { createAdminClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsAppMessage } from "@/lib/whatsapp-notify";

/**
 * Mini planın aylık müşteri WhatsApp mesajı hakkı dolmadan (%80) ve dolunca (%100)
 * salon sahibini bilgilendirir. Mesajlar sınıra ulaşınca müşteriye sessizce
 * gönderilmez; sahibin bunu panelden bakmadan da öğrenmesi için.
 *
 * notify.ts'teki kritik stok uyarısıyla aynı kanallar (Telegram + WhatsApp serbest
 * metin) ve aynı kanal tercihleri (settings_json.notify_channel_*, varsayılan açık).
 * notify.ts ile döngüsel içe aktarma olmasın diye (o dosya wa-templates/send.ts'i
 * içe aktarır) ayrı bir modüldür. Hata asla gönderim akışını engellemez.
 */
export function shouldNotifyWaQuota(used: number, limit: number): "warn" | "full" | null {
  if (used === limit) return "full";
  if (used === Math.ceil(limit * 0.8)) return "warn";
  return null;
}

export async function notifyWaQuota(orgId: string, kind: "warn" | "full", used: number, limit: number): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("telegram_chat_id, whatsapp_number, settings_json")
      .eq("id", orgId)
      .single();
    if (!org) return;

    const settings = ((org as { settings_json?: Record<string, unknown> | null }).settings_json ?? {}) as Record<string, unknown>;
    const telegramOn = settings.notify_channel_telegram !== false;
    const whatsappOn = settings.notify_channel_whatsapp !== false;

    const message =
      kind === "full"
        ? `⚠️ <b>WhatsApp mesaj hakkınız doldu</b>\n\nBu ayki ${limit} müşteri mesajı hakkınızın tamamı kullanıldı (${used}/${limit}). ` +
          `Yeni aya kadar müşterilerinize otomatik onay/hatırlatma WhatsApp mesajı gönderilmeyecek; randevularınız normal şekilde kaydedilmeye devam eder.\n\n` +
          `Daha fazla mesaj için planınızı yükseltebilirsiniz: siriplan.com/dashboard/abonelik`
        : `⚠️ <b>WhatsApp mesaj hakkınızın %80'i doldu</b>\n\nBu ay ${used}/${limit} müşteri mesajı kullandınız. ` +
          `Hak dolunca yeni aya kadar otomatik onay/hatırlatma mesajı gönderilmez.\n\n` +
          `Planınızı yükseltmek için: siriplan.com/dashboard/abonelik`;

    const tasks: Promise<unknown>[] = [];
    const chatId = (org as { telegram_chat_id?: string | null }).telegram_chat_id;
    if (chatId && telegramOn) tasks.push(sendTelegramMessage(chatId, message));
    const wa = (org as { whatsapp_number?: string | null }).whatsapp_number;
    if (wa && whatsappOn) tasks.push(sendWhatsAppMessage(wa, message.replace(/<[^>]+>/g, "")));
    await Promise.allSettled(tasks);
  } catch (e) {
    console.error(`[plan-limit-notify] hata — org=${orgId}:`, e);
  }
}
