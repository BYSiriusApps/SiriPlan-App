import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { safeCompare } from "@/lib/webhook-signature";

export const runtime = "nodejs";

// Telegram Bot API update webhook — /start yazan kullanıcıya kendi Chat ID'sini
// gönderir, böylece salon sahibi bu numarayı Ayarlar sayfasına yapıştırabilir.
// setWebhook çağrısı sırasında verilen secret_token, Telegram tarafından bu
// header'da geri gönderilir; rastgele isteklerin botu tetiklemesini engeller.
export async function POST(req: NextRequest) {
  // FAIL-CLOSED: önceden bu kontrol `if (expectedSecret)` ile sarılıydı; ortam
  // değişkeni tanımlı değilse (yeni ortam, yanlış yazılmış anahtar, silinmiş
  // değişken) doğrulama tamamen atlanıyor ve uç herkese açık hale geliyordu.
  // Sır yoksa artık hiçbir istek işlenmez.
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[telegram webhook] TELEGRAM_WEBHOOK_SECRET tanımlı değil — istek yok sayıldı.");
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
      await sendTelegramMessage(
        String(chatId),
        `👋 Merhaba! Randevu bildirimlerini bu sohbete almak için Chat ID'niz:\n\n<code>${chatId}</code>\n\nBu numarayı kopyalayıp Siriplan panelinde <b>Ayarlar → Sosyal Medya &amp; Entegrasyonlar → Telegram Bildirimleri</b> alanına yapıştırıp kaydedin.`
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
