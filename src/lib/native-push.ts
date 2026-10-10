// iOS uygulaması (WKWebView kabuğu) için push köprüsü — FCM + APNs.
//
// WKWebView Web Push desteklemez; bu yüzden kabuk (siriplan-ios, PushNotifications.swift)
// şu mesaj işleyicilerini sunar ve sonuçları window olaylarıyla geri yollar:
//   postMessage → "push-permission-state"   → olay "push-permission-state"  (detail: durum metni)
//   postMessage → "push-permission-request" → olay "push-permission-request" (detail: granted|denied)
//   postMessage → "push-token"              → olay "push-token"              (detail: FCM token)
// Yalnızca istemcide çağrılır. Android/masaüstü tarayıcılarda köprü yoktur → hepsi no-op.

import { isMobileAppUserAgent } from "./mobile-app-shared";

const TOKEN_KEY = "sp_native_push_token";
const TOKEN_RE = /^[A-Za-z0-9_-]{10,200}:[A-Za-z0-9_-]{20,}$/;

type Bridge = { postMessage: (m: string) => void };
type WebKitWindow = { webkit?: { messageHandlers?: Record<string, Bridge | undefined> } };

function bridge(name: string): Bridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as WebKitWindow).webkit?.messageHandlers?.[name];
}

/** iOS kabuğunun push köprüsü mevcut mu? (UA işaretçisi + mesaj işleyicisi) */
export function isNativeIOSPush(): boolean {
  if (typeof navigator === "undefined") return false;
  return isMobileAppUserAgent(navigator.userAgent) && !!bridge("push-token");
}

export function isValidFcmToken(v: unknown): v is string {
  return typeof v === "string" && TOKEN_RE.test(v);
}

function ask(name: string, event: string, timeoutMs: number, accept?: (d: string) => boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const h = bridge(name);
    if (!h) return resolve(null);
    const done = (v: string | null) => {
      window.removeEventListener(event, onEvt);
      clearTimeout(timer);
      resolve(v);
    };
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (typeof d === "string" && (!accept || accept(d))) done(d);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    window.addEventListener(event, onEvt);
    try {
      h.postMessage("");
    } catch {
      done(null);
    }
  });
}

/** notDetermined | denied | authorized | provisional | ephemeral | unknown (yanıt gelmezse null) */
export function nativePermissionState(): Promise<string | null> {
  return ask("push-permission-state", "push-permission-state", 3000);
}

/** İzin penceresini gösterir (ilk seferde); "granted" | "denied" | null. */
export function nativeRequestPermission(): Promise<string | null> {
  // Kullanıcı pencereyi yanıtlayana kadar bekleyebilir — uzun zaman aşımı.
  return ask("push-permission-request", "push-permission-request", 120000);
}

/**
 * FCM token'ını ister. Kabuk APNs kaydı tamamlanmadan token veremeyebilir
 * ("ERROR GET TOKEN"); kayıt bitince token olayı kendiliğinden gelir, bu yüzden
 * geçersiz yanıtlar yok sayılır ve birkaç kez yeniden istenir.
 */
export async function nativeGetToken(): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const t = await ask("push-token", "push-token", 4000, isValidFcmToken);
    if (t) return t;
  }
  return null;
}

export function getStoredNativeToken(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return isValidFcmToken(t) ? t : null;
  } catch {
    return null;
  }
}

function storeNativeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* depolama yoksa yoksay */
  }
}

/** Token'ı sunucuya kaydeder (oturum açık kullanıcıya); başarıda yerelde de saklar. */
export async function registerNativeToken(token: string): Promise<boolean> {
  const res = await fetch("/api/push/device", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => null);
  if (!res?.ok) return false;
  storeNativeToken(token);
  return true;
}

/** Bu cihaz için bildirim açık mı? (izin verilmiş + token kaydedilmiş) */
export async function nativePushState(): Promise<"unsupported" | "denied" | "on" | "off"> {
  const s = await nativePermissionState();
  // Kabuk Firebase'siz derlenmişse ("unavailable") ya da yanıt yoksa push sunulmaz.
  if (s === null || s === "unavailable") return "unsupported";
  if (s === "denied") return "denied";
  const granted = s === "authorized" || s === "provisional" || s === "ephemeral";
  return granted && getStoredNativeToken() ? "on" : "off";
}

/** İzin ister, token alır, sunucuya kaydeder. Hata fırlatabilir. */
export async function enableNativePush(): Promise<"on" | "denied" | "off"> {
  const r = await nativeRequestPermission();
  if (r === "denied") return "denied";
  if (r !== "granted") return "off";
  const token = await nativeGetToken();
  if (!token || !(await registerNativeToken(token))) throw new Error("native subscribe failed");
  return "on";
}

export async function disableNativePush(): Promise<void> {
  const token = getStoredNativeToken();
  if (token) {
    await fetch("/api/push/device", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }
  storeNativeToken(null);
}
