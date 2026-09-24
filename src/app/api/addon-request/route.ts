import { NextRequest, NextResponse } from "next/server";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";
import { detectBot, BOT_REJECTION_MESSAGE } from "@/lib/bot-guard";
import { notifyAdminAddonRequest } from "@/lib/notify-admin";

/**
 * Fiyatlar sayfasındaki ek paket kartlarında (AI WhatsApp, SMS, Ek Şube) fiyat
 * yerine gösterilen "Bilgi Al" formunun ucu. Genele açık, kimlik doğrulamasız —
 * iletişim formuyla (bkz. api/contact) aynı ucuz katmanlar (IP hız sınırı +
 * honeypot + zamanlama); Turnstile/Tor kontrolü burada yok çünkü form tek bir
 * admin bildirimi tetikliyor, veri tabanına yazmıyor ve e-posta göndermiyor.
 */

const ADDON_KEYS = ["whatsappAI", "sms", "multiBranch"] as const;
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const LIMITS = { name: 80, email: 160, phone: 30, message: 500 } as const;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  const ipLimit = limitByIp(req, "addon-request", 5, 10 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooManyRequests(
      ipLimit,
      "Bu ağdan kısa sürede çok fazla talep gönderildi. Lütfen biraz bekleyip tekrar deneyin."
    ) as unknown as NextResponse;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const addon = str((body as Record<string, unknown>).addon);
  const name = str((body as Record<string, unknown>).name);
  const email = str((body as Record<string, unknown>).email);
  const phone = str((body as Record<string, unknown>).phone);
  const message = str((body as Record<string, unknown>).message);

  if (!(ADDON_KEYS as readonly string[]).includes(addon)) {
    return NextResponse.json({ error: "Geçersiz paket." }, { status: 400 });
  }
  if (!name || !email) {
    return NextResponse.json({ error: "Lütfen zorunlu alanları doldurun." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }
  if (name.length < 2 || name.length > LIMITS.name) {
    return NextResponse.json({ error: "Ad soyad 2-80 karakter olmalı." }, { status: 400 });
  }
  if (phone.length > LIMITS.phone) {
    return NextResponse.json({ error: "Telefon numarası geçersiz." }, { status: 400 });
  }
  if (message.length > LIMITS.message) {
    return NextResponse.json({ error: "Mesaj çok uzun." }, { status: 400 });
  }

  const botCheck = detectBot({
    honeypot: (body as Record<string, unknown>).website,
    formStartedAt: (body as Record<string, unknown>).form_started_at,
    textFields: [name],
    email,
  });
  if (botCheck.bot) {
    console.warn("[addon-request] bot reddedildi:", botCheck.reason);
    return NextResponse.json({ error: BOT_REJECTION_MESSAGE }, { status: 400 });
  }

  await notifyAdminAddonRequest({
    addon,
    name,
    email,
    phone: phone || null,
    message: message || null,
  });

  return NextResponse.json({ success: true });
}
