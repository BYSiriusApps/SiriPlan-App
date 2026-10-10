"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredNativeToken, isNativeIOSPush, isValidFcmToken, registerNativeToken } from "@/lib/native-push";

/** Yalnızca aynı-origin göreli yol (açık yönlendirme önlemi) — sunucudaki safeUrl ile aynı kural. */
function safePath(v: unknown): string | null {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

/**
 * iOS uygulamasında (WKWebView kabuğu) iki iş yapar; diğer ortamlarda hiçbir şey yapmaz:
 *  1) Bildirime dokunulunca kabuğun gönderdiği "push-notification-click" olayında
 *     ilgili panel sayfasına gider.
 *  2) FCM token'ı yenilenirse ("push-token" olayı) ve kullanıcı bu cihazda bildirimi
 *     daha önce açmışsa (yerelde kayıtlı token var) yeni token'ı sunucuya yazar.
 */
export function NativePushBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeIOSPush()) return;

    const onClick = (e: Event) => {
      const detail = (e as CustomEvent).detail as { url?: unknown } | null;
      const path = safePath(detail?.url);
      if (path) router.push(path);
    };
    const onToken = (e: Event) => {
      const t = (e as CustomEvent).detail;
      if (isValidFcmToken(t) && getStoredNativeToken() && t !== getStoredNativeToken()) {
        void registerNativeToken(t);
      }
    };

    window.addEventListener("push-notification-click", onClick);
    window.addEventListener("push-token", onToken);
    return () => {
      window.removeEventListener("push-notification-click", onClick);
      window.removeEventListener("push-token", onToken);
    };
  }, [router]);

  return null;
}
