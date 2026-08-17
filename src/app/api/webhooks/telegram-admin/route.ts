import { NextRequest, NextResponse } from "next/server";
import { sendAdminBotReply } from "@/lib/telegram";
import { safeCompare } from "@/lib/webhook-signature";

export const runtime = "nodejs";

// Platform admin botu — /start yazan kişiye kendi Chat ID'sini gönderir, böylece
// bu değer TELEGRAM_ADMIN_CHAT_ID ortam değişkenine elle girilebilir.
export async function POST(req: NextRequest) {
  // FAIL-CLOSED — ortam değişkeni yoksa doğrulama atlanmıyor, istek işlenmiyor
  // (bkz. webhooks/telegram/route.ts'teki aynı gerekçe).
  const expectedSecret = process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[telegram-admin webhook] TELEGRAM_ADMIN_WEBHOOK_SECRET tanımlı değil — istek yok sayıldı.");
    return NextResponse.json({ ok: true });
  }
  if (!safeCompare(req.headers.get("x-telegram-bot-api-secret-token"), expectedSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string | undefined = message?.text;

    if (!chatId || !text) return NextResponse.json({ ok: true });

    if (text.startsWith("/start")) {
      await sendAdminBotReply(
        String(chatId),
        `👋 Merhaba! Bu bot yeni Siriplan kayıtlarını bildirir.\n\nChat ID'niz:\n\n<code>${chatId}</code>\n\nBu numarayı TELEGRAM_ADMIN_CHAT_ID ortam değişkeni olarak ayarlayın.`
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
