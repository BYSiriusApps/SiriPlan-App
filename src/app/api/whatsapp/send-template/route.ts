import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Supabase pg_cron + pg_net tarafından her 5 dakikada bir tetiklenir
 * (bkz. migration 016). Tek bir platform WhatsApp Business numarası
 * (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID) üzerinden, Meta'da onaylı bir
 * şablon mesajı gönderir — Meta kuralları gereği işletme başlatımlı
 * mesajlar serbest metin değil onaylı şablon olmak zorunda:
 *
 *   "Sayın {{1}}, {{2}} salonundaki {{3}} tarihli randevunuz {{4}}. Detay: {{5}}"
 *   {{1}} customer_name  {{2}} salon_name  {{3}} appointment_date
 *   {{4}} status_type    {{5}} custom_note
 *
 * WHATSAPP_TEMPLATE_NAME env'i henüz ayarlanmadıysa veya Meta
 * kimlik bilgileri eksikse, hata fırlatmak yerine {skipped:true}
 * döner — WhatsApp numarası bağlanana kadar cron sessizce boşa
 * dönmüş olur, hatalar birikip alarm oluşturmaz.
 */

interface SendTemplateBody {
  to_phone: string;
  customer_name: string;
  salon_name: string;
  appointment_date: string;
  status_type: string;
  custom_note?: string;
}

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return "90" + digits.slice(1);
  if (digits.length === 10) return "90" + digits;
  return digits;
}

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<SendTemplateBody>;
  const { to_phone, customer_name, salon_name, appointment_date, status_type, custom_note } = body;

  if (!to_phone || !customer_name || !salon_name || !appointment_date || !status_type) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (!token || !phoneId || !templateName) {
    return NextResponse.json({ skipped: true, reason: "whatsapp_not_configured" });
  }

  const to = normalizePhone(to_phone);

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "tr" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: customer_name },
              { type: "text", text: salon_name },
              { type: "text", text: appointment_date },
              { type: "text", text: status_type },
              { type: "text", text: custom_note || "" },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return NextResponse.json({ error: "Meta API hatası", detail: errText }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
