import { NextRequest, NextResponse } from "next/server";
import { verifyMetaSignature, safeCompare } from "@/lib/webhook-signature";

export const runtime = "nodejs";

// Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // safeCompare: sabit zamanlı karşılaştırma — `===` erken çıktığı için teorik
  // olarak zamanlama saldırısıyla token çözülebilir.
  if (mode === "subscribe" && safeCompare(token, process.env.INSTAGRAM_VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  // İMZA DOĞRULAMASI — WhatsApp webhook'uyla aynı gerekçe: hub.verify_token
  // sadece ilk abonelik (GET) el sıkışmasını doğrular, gelen POST'ları DEĞİL.
  // Doğrulama olmadan bu adrese isteyen istediğini POST edebilir; uç şu an
  // sadece log yazıyor olsa da (AI yanıtı henüz bağlı değil) bu, log kirletme
  // ve ileride buraya gerçek bir işlem eklendiğinde sessizce açık kalacak bir
  // kapı demek. Gövde HAM metin olarak okunur; parse edilip yeniden
  // stringify edilen gövdenin HMAC'i tutmaz.
  const rawBody = await req.text();
  const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    console.error("[IG webhook] META_APP_SECRET tanımlı değil — istek doğrulanamadığı için yok sayıldı.");
    return NextResponse.json({ ok: true });
  }

  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
    console.warn("[IG webhook] geçersiz imza — istek reddedildi.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const entry = body?.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) return NextResponse.json({ ok: true });

    const senderId = messaging.sender?.id;
    const text = messaging.message?.text;

    if (!senderId || !text) return NextResponse.json({ ok: true });

    // AI auto-reply is handled separately via the AI assistant
    // For now, log the incoming message (mesaj gövdesi loglanmıyor: kullanıcı
    // içeriği KVKK kapsamında kişisel veridir, sadece uzunluğu kaydedilir).
    console.log(`[IG] From ${senderId}: ${String(text).length} karakterlik mesaj`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
