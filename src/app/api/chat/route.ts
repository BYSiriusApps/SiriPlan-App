import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM_PROMPT = `Sen Siriplan'ın AI destek asistanısın. Siriplan, BY Sirius Group tarafından geliştirilen, kuaför, berber, güzellik salonu, SPA, klinik ve diğer sektörler için yapay zeka destekli randevu ve işletme yönetim platformudur.

Temel bilgiler:
- Platform: siriplan.com
- Destek: destek@siriplan.com | WhatsApp: +90 535 503 26 34
- Fiyatlar: Starter $39/ay, Pro $69/ay, Business $119/ay
- 14 gün ücretsiz deneme, kredi kartı gerekmez
- Desteklenen sektörler: Kuaför, Berber, Güzellik Salonu, SPA & Masaj, Nail Salon, Estetik Klinik, Makyaj Stüdyosu, Tattoo Studio, Diyetisyen, Kaş & Kirpik

Ana özellikler:
- Çok kanallı randevu (Web, WhatsApp, Instagram, QR kod)
- AI WhatsApp/Instagram asistanı (7/24 otomatik yanıt)
- Müşteri skoru sistemi (0-100 sadakat puanı)
- Haftanın Elemanı gamification sistemi
- Kampanya modülü (toplu WhatsApp/SMS gönderimi)
- Gerçek zamanlı ciro dashboard
- PDF/Excel rapor export
- KVKK uyumlu veri saklama
- Çok dil desteği: TR, EN, RU, AR
- Mevcut randevu yazılımından ve Excel'den kolay veri aktarımı

Kayıt sayfası: siriplan.com/auth/kayit
Demo: siriplan.com/demo
İletişim: siriplan.com/iletisim
SSS: siriplan.com/sss

Kurallar:
- Sadece Siriplan ve salon/randevu yönetimi hakkında konuş
- Kısa ve net cevaplar ver (2-4 cümle)
- Randevu almak veya kayıt olmak isteyenleri /auth/kayit sayfasına yönlendir
- Teknik destek için destek@siriplan.com veya WhatsApp'ı öner
- Bilmediğin konularda ekibimizle iletişime geçmelerini öner
- Türkçe veya İngilizce konuşabilirsin`;

function getStaticResponse(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("fiyat") || msg.includes("ücret") || msg.includes("price") || msg.includes("cost")) {
    return "Siriplan 3 plan sunuyor: Starter $39/ay, Pro $69/ay, Business $119/ay. Hepsi 14 gün ücretsiz deneme ile geliyor, kredi kartı gerekmez. Detaylar için siriplan.com/fiyatlar";
  }
  if (msg.includes("deneme") || msg.includes("ücretsiz") || msg.includes("free") || msg.includes("trial")) {
    return "Evet! 14 gün boyunca tüm Pro özelliklerini ücretsiz deneyebilirsiniz. Kredi kartı gerekmez, istediğiniz zaman iptal edilebilir. Başlamak için: siriplan.com/auth/kayit";
  }
  if (msg.includes("whatsapp") || msg.includes("ai") || msg.includes("asistan")) {
    return "Siriplan'ın AI asistanı WhatsApp ve Instagram DM'lerinizi 7/24 yanıtlar — randevu alır, fiyat sorusu yanıtlar, ön ödeme toplar. Pro planla aktif olur.";
  }
  if (msg.includes("sektör") || msg.includes("sector") || msg.includes("kuaför") || msg.includes("berber") || msg.includes("spa")) {
    return "Siriplan şu sektörlere özel çözüm sunuyor: Kuaför, Berber, Güzellik Salonu, SPA & Masaj, Nail Salon, Estetik Klinik, Makyaj Stüdyosu, Tattoo Studio, Diyetisyen, Kaş & Kirpik.";
  }
  if (msg.includes("iletisim") || msg.includes("contact") || msg.includes("destek") || msg.includes("support")) {
    return "Bize ulaşmak için: 📧 destek@siriplan.com | 💬 WhatsApp: wa.me/905355032634 | 🌐 siriplan.com/iletisim — Ortalama yanıt süremiz 2 saattir.";
  }
  if (msg.includes("kayıt") || msg.includes("başla") || msg.includes("sign up") || msg.includes("register")) {
    return "Ücretsiz hesap oluşturmak çok kolay! siriplan.com/auth/kayit adresine gidin, 2 dakikada hesabınız hazır. Kredi kartı gerekmez.";
  }
  if (msg.includes("randevu") || msg.includes("appointment") || msg.includes("booking")) {
    return "Siriplan ile müşterileriniz web, WhatsApp, Instagram ve QR kod üzerinden 7/24 randevu alabilir. Çakışma kontrolü otomatik, double booking imkânsız.";
  }

  return "Merhaba! Siriplan AI asistanıyım. Fiyatlar, özellikler, kayıt veya destek hakkında sorularınızı yanıtlayabilirim. Ne öğrenmek istersiniz?";
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholder = !apiKey || apiKey.includes("placeholder") || apiKey === "your-gemini-api-key-here";

    if (isPlaceholder) {
      // Use static keyword-based fallback
      const response = getStaticResponse(message);
      return NextResponse.json({ response });
    }

    // Gemini API call
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const fallback = getStaticResponse(message);
      return NextResponse.json({ response: fallback });
    }

    const data = await geminiResponse.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? getStaticResponse(message);

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({
      response: "Şu an yanıt veremiyorum. Lütfen destek@siriplan.com veya WhatsApp üzerinden ulaşın.",
    });
  }
}
