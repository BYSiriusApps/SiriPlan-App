// Firebase Cloud Messaging (HTTP v1) gönderimi — iOS uygulaması için. Yalnızca sunucuda.
//
// Ek bağımlılık yok: servis hesabı JWT'si node:crypto ile imzalanır, OAuth erişim
// jetonu bellekte önbelleğe alınır. Anahtar yalnızca ortam değişkeninden okunur
// (FIREBASE_SERVICE_ACCOUNT_JSON: servis hesabı JSON'unun kendisi ya da base64'ü);
// repoya asla yazılmaz. Anahtar yoksa hiçbir şey yapılmaz.
import { createSign } from "node:crypto";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { value: string; exp: number } | null = null;

function loadAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  cachedAccount = null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const j = JSON.parse(text);
    if (j.project_id && j.client_email && j.private_key) {
      cachedAccount = {
        project_id: String(j.project_id),
        client_email: String(j.client_email),
        // Vercel env'de satır sonları "\n" metni olarak gelebilir.
        private_key: String(j.private_key).replace(/\\n/g, "\n"),
      };
    }
  } catch {
    /* geçersiz JSON → FCM kapalı */
  }
  return cachedAccount;
}

export function isFcmConfigured(): boolean {
  return loadAccount() !== null;
}

const b64url = (v: Buffer | string) => Buffer.from(v).toString("base64url");

async function getAccessToken(acc: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: acc.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const sig = createSign("RSA-SHA256").update(`${header}.${claim}`).sign(acc.private_key);
  const assertion = `${header}.${claim}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  cachedToken = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return cachedToken.value;
}

export interface FcmMessage {
  title: string;
  body: string;
  /** Tıklanınca açılacak panel yolu (çağıran doğrulamış olmalı). */
  url: string;
  tag?: string;
}

/**
 * Verilen iOS token'larına gönderir. Geçersiz/silinmiş token'ları döndürür
 * (çağıran tablodan siler). Hiçbir zaman fırlatmaz.
 */
export async function sendFcm(tokens: string[], msg: FcmMessage): Promise<string[]> {
  const dead: string[] = [];
  try {
    const acc = loadAccount();
    if (!acc || tokens.length === 0) return dead;
    const accessToken = await getAccessToken(acc);
    if (!accessToken) return dead;

    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          const res = await fetch(`https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: msg.title, body: msg.body },
                data: { url: msg.url, ...(msg.tag ? { tag: msg.tag } : {}) },
                apns: {
                  headers: { "apns-priority": "10", ...(msg.tag ? { "apns-collapse-id": msg.tag.slice(0, 64) } : {}) },
                  payload: { aps: { sound: "default" } },
                },
              },
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (res.status === 404) {
            dead.push(token); // UNREGISTERED
          } else if (res.status === 400) {
            const j = (await res.json().catch(() => null)) as { error?: { details?: { errorCode?: string }[] } } | null;
            // Yalnızca açıkça UNREGISTERED ise sil; INVALID_ARGUMENT mesaj hatası da olabilir.
            if (j?.error?.details?.some((d) => d.errorCode === "UNREGISTERED")) {
              dead.push(token);
            }
          }
        } catch {
          /* tek cihaz hatası diğerlerini etkilemez */
        }
      })
    );
  } catch {
    /* FCM hatası ana akışı engellememeli */
  }
  return dead;
}
