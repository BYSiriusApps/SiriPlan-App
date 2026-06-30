import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Incoming messages (POST)
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const msg = messages[0];
    const senderPhone = msg.from; // e.g. "905xxxxxxxxx"
    const messageText = msg.text?.body || msg.interactive?.button_reply?.title || "";
    const phoneNumberId = value?.metadata?.phone_number_id;

    if (!messageText || !phoneNumberId) {
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
        messageText,
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
