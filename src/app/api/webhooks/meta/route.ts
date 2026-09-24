import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyMetaSignature, safeCompare } from "@/lib/webhook-signature";
import { hit } from "@/lib/rate-limit";
import { sanitizeUserMessage } from "@/lib/ai-input";
import { generateAIReply } from "@/lib/ai-reply";
import { sendMessengerReply, sendInstagramReply } from "@/lib/meta-messaging";

export const runtime = "nodejs";

// Meta webhook verification — tek app hem Messenger ("page") hem Instagram
// Direct ("instagram") ürünlerine bu tek URL'den abone olur.
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
  // Doğrulama olmadan bu adrese isteyen istediğini POST edip salonun Gemini
  // kotasını tüketebilir ve sahte müşterilere yanıt gönderttirebilir. Gövde
  // HAM metin olarak okunur; parse edilip yeniden stringify edilen gövdenin
  // HMAC'i tutmaz.
  const rawBody = await req.text();
  const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    console.error("[Meta webhook] META_APP_SECRET tanımlı değil — istek doğrulanamadığı için yok sayıldı.");
    return NextResponse.json({ ok: true });
  }

  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
    console.warn("[Meta webhook] geçersiz imza — istek reddedildi.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const payload = body as {
      object?: string;
      entry?: {
        id?: string;
        messaging?: { sender?: { id?: string }; recipient?: { id?: string }; message?: { text?: string; is_echo?: boolean } }[];
      }[];
    };

    const isInstagram = payload.object === "instagram";
    const isMessenger = payload.object === "page";
    if (!isInstagram && !isMessenger) {
      return NextResponse.json({ ok: true });
    }

    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0];
    const pageId = entry?.id;

    if (!messaging || !pageId) return NextResponse.json({ ok: true });
    if (messaging.message?.is_echo) return NextResponse.json({ ok: true }); // kendi gönderdiğimiz mesajın yankısı

    const senderId = messaging.sender?.id;
    const messageText = messaging.message?.text;

    if (!senderId || !messageText) return NextResponse.json({ ok: true });

    // Gönderen başına tavan — WA webhook'undaki gerekçeyle aynı: imza
    // doğrulaması sahte istekleri keser ama gerçek bir kullanıcı da saniyede
    // onlarca DM atarak her mesaj için bir Gemini çağrısı tetikleyebilir.
    if (!hit(`meta-in:${pageId}:${senderId}`, 10, 5 * 60 * 1000).ok) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createAdminClient();

    // Sayfa hem Messenger'ı hem bağlı Instagram hesabını kapsadığı için tek
    // ig_page_id alanı iki kanal için de org eşleştirmesine yeter (bu alanlar
    // 001_initial_schema.sql'de zaten mevcuttu, bu değişiklik onları ilk kez
    // gerçekten kullanıma alıyor).
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, type, locale, ig_page_access_token, ig_page_id, feature_ai")
      .eq("ig_page_id", pageId)
      .single();

    if (!org || !org.ig_page_access_token) {
      return NextResponse.json({ ok: true });
    }

    const channel = isInstagram ? "Instagram Direct" : "Facebook Messenger";
    const sendReply = isInstagram ? sendInstagramReply : sendMessengerReply;

    if (!org.feature_ai) {
      await sendReply(senderId, `Merhaba! Mesajınız için teşekkürler. Ekibimiz size en kısa sürede geri dönecek. 😊`, org.ig_page_access_token);
      return NextResponse.json({ ok: true });
    }

    let aiReply: string;
    try {
      aiReply = await generateAIReply(
        channel,
        org.name,
        org.type,
        // Uzunluk sınırı + görünmez karakter/rol etiketi temizliği: bkz.
        // lib/ai-input.ts — WA webhook'uyla aynı savunma.
        sanitizeUserMessage(messageText, 800),
        "Yeni müşteri", // DM gönderen kişinin telefon numarası bilinmediği için müşteri kaydıyla eşleştirilemiyor
        org.locale || "tr"
      );
    } catch {
      aiReply = `Merhaba! Mesajınız için teşekkürler. Ekibimiz en kısa sürede size geri dönecek. 😊`;
    }

    await sendReply(senderId, aiReply, org.ig_page_access_token);
  } catch (err) {
    console.error("Meta webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
