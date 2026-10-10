// Tarayıcı tarafı Web Push yardımcıları — PushToggle (Ayarlar/Hesabım) ve
// PushPrompt (ilk giriş kartı) ortak kullanır. Yalnızca istemcide çağrılır.

import { disableNativePush, enableNativePush, isNativeIOSPush } from "./native-push";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  // iOS uygulaması (WKWebView) Web Push yerine kabuk köprüsü + FCM kullanır.
  if (isNativeIOSPush()) return true;
  return (
    !!VAPID_PUBLIC_KEY &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Service worker'ı hazır döndürür. Kök layout kaydı yalnızca "load" olayına bağlıyor;
 * script sayfa yüklendikten sonra çalışırsa olay kaçıyor ve kayıt hiç olmuyor —
 * o durumda `ready` sonsuza kadar bekler. register() idempotenttir (zaten kayıtlıysa
 * mevcut kaydı döndürür), bu yüzden burada her zaman çağırmak güvenlidir.
 */
export async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

/** Bu cihazın mevcut aboneliği (yoksa null). Sunucuya istek atmaz. */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const reg = await getReadyRegistration();
  return reg.pushManager.getSubscription();
}

/**
 * İzin ister, tarayıcıya abone olur ve sunucuya kaydeder.
 * Dönüş: "on" | "denied" | "off" (izin penceresi kapatıldı). Hata fırlatabilir.
 */
export async function enablePush(): Promise<"on" | "denied" | "off"> {
  if (isNativeIOSPush()) return enableNativePush();
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await getReadyRegistration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) {
    // Sunucuya kaydolmayan abonelik işe yaramaz — tarayıcıda da bırakma.
    await sub.unsubscribe().catch(() => {});
    throw new Error("subscribe failed");
  }
  return "on";
}

export async function disablePush(): Promise<void> {
  if (isNativeIOSPush()) return disableNativePush();
  const sub = await getCurrentSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
