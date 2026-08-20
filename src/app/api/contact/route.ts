import { NextRequest, NextResponse } from "next/server";
import { limitByIp, clientIp, hit, tooManyRequests } from "@/lib/rate-limit";
import { detectBot, isDisposableEmail, looksLikeGibberish, BOT_REJECTION_MESSAGE } from "@/lib/bot-guard";
import { isTorExitNode } from "@/lib/tor-guard";
import { verifyTurnstile } from "@/lib/turnstile";
import { notifyAdminContactMessage } from "@/lib/notify-admin";
import { sendContactMessageEmail } from "@/lib/email/send";

/**
 * İLETİŞİM FORMU UCU — genele açık, kimlik doğrulamasız.
 *
 * ÖNCEKİ DURUM: form `action="mailto:info@bysirius.com"` idi. Yani hiçbir
 * sunucu tarafı yoktu; ziyaretçinin makinesinde bir posta istemcisi kurulu
 * değilse (mobilde çoğunlukla değil) mesaj HİÇBİR YERE gitmiyordu. Sessizce
 * kaybolan destek talebi, spam'den daha pahalıya mal olur.
 *
 * ALTI SAVUNMA KATMANI — sırası bilerek "ucuzdan pahalıya":
 *
 *   1. IP hız sınırı        — bellekte, sıfır maliyet
 *   2. Alan doğrulama       — uzunluk/biçim, sıfır maliyet
 *   3. Honeypot + zamanlama — bot-guard, sıfır maliyet
 *   4. Turnstile            — ağ çağrısı (yapılandırılmışsa)
 *   5. Tor çıkış düğümü     — ağ çağrısı (liste önbellekli)
 *   6. E-posta hız sınırı   — IP değiştirerek atlatmayı kapatır
 *
 * Bir bot 1. katmanda eleniyorsa 4. ve 5. katmanın ağ maliyetine hiç girilmez.
 * 6. katman bilerek en sonda — gerekçesi kendi bloğunda.
 *
 * REDDETME vs İŞARETLEME: Kesin sinyaller (honeypot, milisaniyelik gönderim,
 * hız aşımı, Turnstile) reddeder. Olasılıksal sinyaller (tek kullanımlık
 * e-posta, klavye gürültüsü gibi isim, Tor) yalnızca bildirime ⚠️ etiketi
 * ekler — gerçek bir müşterinin destek talebini bir tahmine dayanarak çöpe
 * atmak, birkaç spam mesajını elle silmekten çok daha pahalıdır.
 */

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const LIMITS = {
  name: 80,
  email: 160,
  phone: 30,
  subject: 140,
  message: 4000,
} as const;

/**
 * Hız sınırı anahtarı için e-posta normalleştirme. `ali+1@gmail.com`,
 * `ali+2@gmail.com` ve `a.l.i@gmail.com` aynı kutuya düşer; normalleştirmeden
 * e-posta bazlı sınır tek karakterle atlatılırdı.
 */
function normalizeEmailKey(email: string): string {
  const [rawLocal = "", domain = ""] = email.trim().toLowerCase().split("@");
  const local = rawLocal.split("+")[0]!;
  const isGmail = domain === "gmail.com" || domain === "googlemail.com";
  return `${isGmail ? local.replace(/\./g, "") : local}@${isGmail ? "gmail.com" : domain}`;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // ── Katman 1: IP hız sınırı ────────────────────────────────────────────
  const ipLimit = limitByIp(req, "contact", 3, 10 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooManyRequests(
      ipLimit,
      "Bu ağdan kısa sürede çok fazla mesaj gönderildi. Lütfen biraz bekleyip tekrar deneyin."
    ) as unknown as NextResponse;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const name = str((body as Record<string, unknown>).name);
  const email = str((body as Record<string, unknown>).email);
  const phone = str((body as Record<string, unknown>).phone);
  const subject = str((body as Record<string, unknown>).subject);
  const message = str((body as Record<string, unknown>).message);
  const kvkkConsent = (body as Record<string, unknown>).kvkkConsent === true;

  // ── Katman 2: alan doğrulama ───────────────────────────────────────────
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Lütfen zorunlu alanları doldurun." }, { status: 400 });
  }
  if (!kvkkConsent) {
    return NextResponse.json(
      { error: "KVKK Aydınlatma Metni'ni kabul etmeniz zorunludur." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }
  if (name.length < 2 || name.length > LIMITS.name) {
    return NextResponse.json({ error: "Ad soyad 2-80 karakter olmalı." }, { status: 400 });
  }
  if (subject.length < 3 || subject.length > LIMITS.subject) {
    return NextResponse.json({ error: "Konu 3-140 karakter olmalı." }, { status: 400 });
  }
  if (message.length < 10 || message.length > LIMITS.message) {
    return NextResponse.json({ error: "Mesaj 10-4000 karakter olmalı." }, { status: 400 });
  }
  if (phone.length > LIMITS.phone) {
    return NextResponse.json({ error: "Telefon numarası geçersiz." }, { status: 400 });
  }

  // ── Katman 3: honeypot + zamanlama + link spam'i ───────────────────────
  // `message` bilerek taranmıyor: gerçek bir kullanıcı sorusunda kendi web
  // sitesinin bağlantısını paylaşması tamamen normaldir. İsim ve konu
  // alanlarında ise bağlantı SEO spam botlarının klasik imzasıdır.
  const botCheck = detectBot({
    honeypot: (body as Record<string, unknown>).website,
    formStartedAt: (body as Record<string, unknown>).form_started_at,
    textFields: [name, subject],
  });
  if (botCheck.bot) {
    console.warn("[contact] bot reddedildi:", botCheck.reason, ip);
    return NextResponse.json({ error: BOT_REJECTION_MESSAGE }, { status: 400 });
  }

  // ── Katman 4: Turnstile ────────────────────────────────────────────────
  const flags: string[] = [];
  const turnstile = await verifyTurnstile(
    (body as Record<string, unknown>).turnstileToken,
    ip
  );
  if (turnstile.status === "failed") {
    console.warn("[contact] turnstile reddedildi:", turnstile.reason, ip);
    return NextResponse.json({ error: BOT_REJECTION_MESSAGE }, { status: 400 });
  }
  if (turnstile.status === "unavailable") flags.push("turnstile doğrulanamadı");

  // ── Katman 5: Tor çıkış düğümü ─────────────────────────────────────────
  // Tor, IP bazlı her sınırı bedava sıfırlar. Turnstile'ı geçmiş bir ziyaretçi
  // "ekstra doğrulamayı" zaten yapmış sayılır ve engellenmez, sadece işaretlenir;
  // Turnstile kurulu değilse Tor üzerinden gelen gönderim reddedilir.
  if (await isTorExitNode(ip)) {
    if (turnstile.status === "passed") {
      flags.push("Tor çıkış düğümü");
    } else {
      console.warn("[contact] Tor çıkış düğümü reddedildi:", ip);
      return NextResponse.json(
        {
          error:
            "İsteğiniz doğrulanamadı. Lütfen anonim ağ/proxy kullanmadan tekrar deneyin veya info@bysirius.com adresine yazın.",
        },
        { status: 403 }
      );
    }
  }

  // ── Olasılıksal sinyaller: reddetme yok, sadece etiket ─────────────────
  if (isDisposableEmail(email)) flags.push("tek kullanımlık e-posta");
  if (looksLikeGibberish(name)) flags.push("isim klavye gürültüsüne benziyor");

  // ── Katman 6: e-posta bazlı hız sınırı ─────────────────────────────────
  // IP bazlı sınırın kör noktası: saldırgan IP değiştirir. Aynı adresten 10
  // dakikada ikinci gönderim reddedilir.
  //
  // NEDEN EN SONDA: `hit()` çağrıldığı anda sayacı harcar. Bu kontrol Turnstile
  // ve Tor'dan ÖNCE olsaydı, süresi dolmuş bir CAPTCHA yüzünden reddedilen
  // kullanıcının sayacı yanmış olurdu; düzeltip tekrar denediğinde bu kez
  // "az önce mesaj aldık" duvarına çarpar ve 10 dakika kilitlenirdi. Sayaç
  // yalnızca GERÇEKTEN kabul edilen bir mesaj için harcanmalı. Hacim savunması
  // bu sırada zaten 1. katmandaki IP sınırında yapılıyor.
  const emailLimit = hit(`contact:email:${normalizeEmailKey(email)}`, 1, 10 * 60 * 1000);
  if (!emailLimit.ok) {
    return tooManyRequests(
      emailLimit,
      "Bu e-posta adresinden az önce bir mesaj aldık. Yanıtımızı bekleyin veya birkaç dakika sonra tekrar deneyin."
    ) as unknown as NextResponse;
  }

  // Bildirimler paralel; biri düşerse diğeri yine gitsin diye allSettled.
  // Mesaj artık en az iki kanaldan iletiliyor (Telegram + e-posta) — eski
  // mailto: formunda tek bir kanal bile garanti değildi.
  const payload = { name, email, phone: phone || null, subject, message, ip, flags };
  const results = await Promise.allSettled([
    notifyAdminContactMessage(payload),
    sendContactMessageEmail(payload),
  ]);

  for (const result of results) {
    if (result.status === "rejected") console.error("[contact] bildirim gönderilemedi:", result.reason);
  }

  return NextResponse.json({ success: true });
}
