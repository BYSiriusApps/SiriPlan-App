import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyMetaSignature, safeCompare } from "@/lib/webhook-signature";
import { hit } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function sendWAMessage(phone: string, message: string, token: string, phoneNumberId: string) {
  const to = phone.replace(/\D/g, "").replace(/^0/, "90");
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });
}

async function generateAIReply(
  salonName: string,
  salonType: string,
  userMessage: string,
  customerHistory: string,
  language: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    throw new Error("No Gemini API key");
  }

  const systemPrompt = `Sen "${salonName}" adlı ${salonType} işletmesinin AI asistanısın.
Müşterilere WhatsApp üzerinden yanıt veriyorsun.
Dil: ${language}
Ton: Sıcak, profesyonel ve kısa (maksimum 3 cümle).
Müşteri geçmişi: ${customerHistory}
Randevu bilgileri için müşteriyi web sitesine yönlendir veya çalışma saatlerini paylaş.
Hiçbir zaman hassas bilgi paylaşma. Kesinlikle uygun ve kibar ol.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 200 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // safeCompare: sabit zamanlı karşılaştırma (`===` erken çıkar ve teorik olarak
  // zamanlama saldırısıyla token karakter karakter çözülebilir).
  if (mode === "subscribe" && safeCompare(token, process.env.WHATSAPP_VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Incoming messages (POST)
export async function POST(req: NextRequest) {
  // İMZA DOĞRULAMASI — bu uç herkese açıktır ve her çağrısı salonun WhatsApp
  // kotasından mesaj gönderip Gemini API'sini çağırır. İmza kontrolü olmadan
  // webhook adresini bilen herkes sahte "gelen mesaj" isteğiyle bize doğrudan
  // para maliyeti çıkarabilir (ve müşterilere istenmeyen mesaj gönderttirebilir).
  // hub.verify_token yalnızca ilk abonelik (GET) el sıkışması içindir, gelen
  // POST'ları doğrulamaz — ikisi farklı mekanizmadır.
  //
  // Gövde HAM metin olarak okunur: JSON.parse edilip yeniden stringify edilen
  // gövdenin HMAC'i tutmaz.
  const rawBody = await req.text();
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    // Fail-closed: sır tanımlı değilse doğrulanamayan istek işlenmez. Meta'ya
    // 200 döneriz ki webhook aboneliği devre dışı bırakılmasın, ama hiçbir
    // mesaj gönderilmez.
    console.error("[WA webhook] META_APP_SECRET tanımlı değil — istek doğrulanamadığı için yok sayıldı.");
    return NextResponse.json({ ok: true });
  }

  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
    console.warn("[WA webhook] geçersiz imza — istek reddedildi.");
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
      entry?: { changes?: { value?: Record<string, unknown> }[] }[];
    };
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value as {
      messages?: { from?: string; text?: { body?: string }; interactive?: { button_reply?: { title?: string } } }[];
      metadata?: { phone_number_id?: string };
    } | undefined;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const msg = messages[0];
    const senderPhone = msg.from; // e.g. "905xxxxxxxxx"
    const messageText = msg.text?.body || msg.interactive?.button_reply?.title || "";
    const phoneNumberId = value?.metadata?.phone_number_id;

    if (!messageText || !phoneNumberId || !senderPhone) {
      return NextResponse.json({ ok: true });
    }

    // Gönderen başına tavan: imza doğrulaması sahte istekleri keser ama GERÇEK
    // bir kullanıcı da salona saniyede onlarca mesaj atarak her mesaj için bir
    // Gemini çağrısı + bir WhatsApp yanıtı tetikleyebilir. Sessizce yok sayılır
    // (kullanıcıya "yavaşla" mesajı göndermek de ayrıca maliyet olurdu).
    if (!hit(`wa-in:${phoneNumberId}:${senderPhone}`, 10, 5 * 60 * 1000).ok) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createAdminClient();

    // Find which org this phone number belongs to
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, type, locale, wa_token, wa_phone_number_id, feature_ai")
      .eq("wa_phone_number_id", phoneNumberId)
      .single();

    if (!org || !org.wa_token) {
      return NextResponse.json({ ok: true });
    }

    if (!org.feature_ai) {
      // Basic auto-reply
      await sendWAMessage(
        senderPhone,
        `Merhaba! Mesajınız için teşekkürler. Ekibimiz size en kısa sürede geri dönecek. 😊`,
        org.wa_token,
        org.wa_phone_number_id!
      );
      return NextResponse.json({ ok: true });
    }

    // Get customer history
    const normalizedPhone = senderPhone.replace(/^90/, "0");
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name, visit_count, last_visit_at")
      .eq("org_id", org.id)
      .eq("phone", normalizedPhone)
      .single();

    const customerHistory = customer
      ? `Müşteri: ${customer.full_name}, ${customer.visit_count} ziyaret, son: ${customer.last_visit_at || "bilinmiyor"}`
      : "Yeni müşteri";

    // Generate AI reply — fallback to static message if AI fails
    let aiReply: string;
    try {
      aiReply = await generateAIReply(
        org.name,
        org.type,
        // Uzunluk sınırı: hem token maliyetini sabitler hem de uzun "talimat
        // enjeksiyonu" metinlerinin sistem yönergesini bastırmasını zorlaştırır.
        messageText.slice(0, 800),
        customerHistory,
        org.locale || "tr"
      );
    } catch {
      aiReply = `Merhaba! Mesajınız için teşekkürler. Ekibimiz en kısa sürede size geri dönecek. 😊`;
    }

    await sendWAMessage(senderPhone, aiReply, org.wa_token, org.wa_phone_number_id!);

  } catch (err) {
    console.error("WA webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
