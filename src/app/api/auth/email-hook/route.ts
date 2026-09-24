import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { authEmailStrings, type AuthEmailAction } from "@/lib/email/auth-i18n";

// Supabase "Send Email" Auth Hook hedefi — Supabase kendi e-posta gönderimini
// atlayıp bu route'u çağırır; gönderimi biz üstleniriz. Böylece kullanıcının
// user_metadata.locale'ine göre 4 dilde markalı e-posta gidebilir (Supabase'in
// kendi Email Templates'i tek şablon, dil ayrımı yapamaz — bkz.
// docs/supabase-auth-emails.md ve dev-backlog).
//
// AKTİF ETMEK İÇİN (Supabase Dashboard'da, kod deploy olduktan SONRA):
//   Authentication → Hooks → "Send Email" hook → bu route'un tam URL'sini gir
//   (https://siriplan.com/api/auth/email-hook), "Generate secret" ile üretilen
//   `v1,whsec_...` değerini SUPABASE_AUTH_HOOK_SECRET env'ine ekle (Vercel).
// Secret ayarlanmadan bu route her isteği reddeder — kapalı halde risksizdir.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@siriplan.com";
// Şifre sıfırlama şablonunun canlıdaki mevcut markası (docs/supabase-auth-emails.md) —
// lacivert + altın. Diğer uygulama e-postalarındaki (email/send.ts) pembe/mor
// paletten farklı; bu route o markayı 4 dile taşır, değiştirmez.
const NAVY = "#0c2050";
const NAVY_DARK = "#0a1a40";
const NAVY_MID = "#123a86";
const GOLD = "#d4a63c";
const GOLD_LIGHT = "#e7c98a";

function esc(str: string) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Standard Webhooks imza doğrulaması (Supabase Auth Hooks bu şemayı kullanır).
 * signedContent = `${id}.${timestamp}.${rawBody}`; secret `v1,whsec_...`
 * biçiminde — imza anahtarı `whsec_` sonrası base64 gövde.
 */
function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  // Replay koruması — 5 dakikadan eski/gelecekteki damgaları reddet.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const key = secret.startsWith("v1,whsec_")
    ? secret.slice("v1,whsec_".length)
    : secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  const secretBytes = Buffer.from(key, "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return signatureHeader.split(" ").some((candidate) => {
    const sig = candidate.includes(",") ? candidate.split(",")[1] : candidate;
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

interface HookPayload {
  user: { email: string; user_metadata?: { locale?: string | null } };
  email_data: {
    token_hash: string;
    redirect_to?: string;
    site_url: string;
    email_action_type: string;
  };
}

// Supabase'in gönderdiği action tiplerini bizim metin tablomuza eşler;
// tanımadığımız bir tip gelirse (ör. "magiclink" — bu uygulamada kullanılmıyor)
// en yakın karşılığa (signup) düşer, e-posta yine de anlamlı gider.
function mapAction(action: string): AuthEmailAction {
  if (action === "recovery" || action === "signup" || action === "invite" || action === "email_change") return action;
  return "signup";
}

function buildLink(data: HookPayload["email_data"], mappedType: string): string {
  const base = data.redirect_to || data.site_url;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token_hash=${encodeURIComponent(data.token_hash)}&type=${encodeURIComponent(mappedType)}`;
}

function renderEmail(action: AuthEmailAction, locale: string | null | undefined, email: string, link: string) {
  const S = authEmailStrings(locale);
  const A = S.actions[action];
  return `<!DOCTYPE html>
<html lang="${S.htmlLang}"${S.rtl ? ' dir="rtl"' : ""}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(A.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(12,32,80,0.12);">
          <tr>
            <td style="background-color:${NAVY};background:linear-gradient(135deg,${NAVY_MID} 0%,${NAVY_DARK} 100%);padding:28px 32px;text-align:center;border-bottom:4px solid ${GOLD};">
              <img src="https://siriplan.com/icons/icon-mark.png" width="56" height="56" alt="SiriPlan"
                   style="display:inline-block;border-radius:14px;vertical-align:middle;" />
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;vertical-align:middle;margin-left:12px;">SiriPlan</span>
              <p style="margin:10px 0 0;font-size:12px;color:${GOLD_LIGHT};">${S.brandTagline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${NAVY};">${esc(A.heading)}</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                ${A.greeting(esc(email))}
              </p>
              <a href="${link}"
                 style="display:inline-block;padding:13px 30px;background:${GOLD};color:${NAVY};border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
                ${esc(A.button)}
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#4b5563;line-height:1.6;">
                ${esc(A.linkHint)}<br/>
                <span style="color:#1a3a7a;word-break:break-all;">${link}</span>
              </p>
              <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                ${esc(A.expiry)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f6f7fb;padding:20px 32px;text-align:center;border-top:1px solid #e3e7ef;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                ${esc(S.footerSentBy)}<br/>
                <a href="https://siriplan.com" style="color:#b07d1f;text-decoration:none;">siriplan.com</a>
                &nbsp;·&nbsp;
                <a href="https://bysirius.com" style="color:#9ca3af;text-decoration:none;">BY Sirius Group Ai &amp; Technology Co Ltd.</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    // Hook Supabase panelinde kurulmadan bu env boştur — kapalı/pasif durumda
    // güvenli varsayılan: her isteği reddet (açık bir e-posta gönderim ucu
    // bırakmamak için imzasız hiçbir istek işlenmez).
    return NextResponse.json({ error: "Hook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const action = mapAction(payload.email_data.email_action_type);
  const locale = payload.user.user_metadata?.locale ?? null;
  const link = buildLink(payload.email_data, payload.email_data.email_action_type);
  const S = authEmailStrings(locale);
  const html = renderEmail(action, locale, payload.user.email, link);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `SiriPlan <${FROM}>`,
      to: payload.user.email,
      subject: S.actions[action].subject,
      html,
    });
    if (error) {
      console.error("[auth-email-hook] Resend gönderim hatası:", error);
      return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }
  } catch (e) {
    console.error("[auth-email-hook] Gönderim istisnası:", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }

  return NextResponse.json({});
}
