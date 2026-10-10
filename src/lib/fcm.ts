// Firebase Cloud Messaging (HTTP v1) gönderimi — iOS uygulaması için. Yalnızca sunucuda.
//
// Kimlik doğrulama (öncelik sırası):
//  1) Anahtarsız (önerilen): Vercel OIDC → GCP Workload Identity Federation → servis
//     hesabı taklidi. Kalıcı anahtar yok; kuruluş politikası SA anahtarı üretmeyi
//     engellediği için bu yol kullanılır. Gerekli env: GCP_PROJECT_NUMBER,
//     GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
//     GCP_SERVICE_ACCOUNT_EMAIL, FCM_PROJECT_ID (Firebase proje kimliği).
//  2) Eski yol: FIREBASE_SERVICE_ACCOUNT_JSON (JSON'un kendisi ya da base64'ü).
// Hiçbiri yoksa hiçbir şey yapılmaz. Erişim jetonu bellekte önbelleğe alınır.
import { createSign } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";

interface WifConfig {
  projectId: string;
  audience: string;
  serviceAccountEmail: string;
}

function loadWif(): WifConfig | null {
  const e = process.env;
  const projectId = (e.FCM_PROJECT_ID || e.GCP_PROJECT_ID || "").trim();
  const num = e.GCP_PROJECT_NUMBER?.trim();
  const pool = e.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const provider = e.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();
  const sa = e.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!projectId || !num || !pool || !provider || !sa) return null;
  return {
    projectId,
    serviceAccountEmail: sa,
    audience: `//iam.googleapis.com/projects/${num}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
  };
}

async function getWifAccessToken(cfg: WifConfig): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const oidc = await getVercelOidcToken();
  const sts = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: cfg.audience,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken: oidc,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!sts.ok) return null;
  const federated = ((await sts.json()) as { access_token?: string }).access_token;
  if (!federated) return null;

  const imp = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(cfg.serviceAccountEmail)}:generateAccessToken`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${federated}`, "Content-Type": "application/json" },
      body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/firebase.messaging"], lifetime: "3600s" }),
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!imp.ok) return null;
  const j = (await imp.json()) as { accessToken?: string };
  if (!j.accessToken) return null;
  cachedToken = { value: j.accessToken, exp: now + 3500 };
  return cachedToken.value;
}

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
  return loadWif() !== null || loadAccount() !== null;
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
    if (tokens.length === 0) return dead;
    const wif = loadWif();
    const acc = wif ? null : loadAccount();
    const projectId = wif ? wif.projectId : acc?.project_id;
    if (!projectId) {
      console.warn("[fcm] proje kimliği yok");
      return dead;
    }
    const accessToken = wif ? await getWifAccessToken(wif) : await getAccessToken(acc!);
    if (!accessToken) {
      console.error("[fcm] erişim jetonu alınamadı (WIF/servis hesabı)");
      return dead;
    }

    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
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
          if (res.ok) console.log("[fcm] gönderildi");
          else console.error("[fcm] gönderim reddedildi", res.status, (await res.clone().text().catch(() => "")).slice(0, 300));
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
