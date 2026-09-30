"use client";

import { useEffect, useState } from "react";
import { isMobileAppUserAgent, hasMobileAppCookie } from "./mobile-app-shared";

/**
 * Client component'lerde "native uygulama (App Store/Play Store) içindeyiz"
 * kontrolü. Sunucu tarafındaki karşılığı lib/mobile-app.ts'teki isMobileApp().
 *
 * Hydration uyuşmazlığı olmaması için ilk render'da her zaman false döner ve
 * değer effect içinde set edilir; bu yüzden bu hook'la GİZLENEN öğeler (plan
 * yükseltme çağrıları gibi) native tarafta bir kare boyunca görünüp kaybolur.
 * Mağaza kuralları açısından yeterli değildir — asıl kapı proxy.ts'teki route
 * kilidi ve api/stripe/checkout'taki sunucu kontrolüdür; bu hook yalnızca
 * arayüzü temizler.
 */
export function useIsMobileApp(): boolean {
  const [isMobileApp, setIsMobileApp] = useState(false);
  useEffect(() => {
    setIsMobileApp(isMobileAppUserAgent(navigator.userAgent) || hasMobileAppCookie(document.cookie));
  }, []);
  return isMobileApp;
}

/**
 * Yalnızca iOS native sarmalayıcı (WKWebView, UA işaretçisi) — Android TWA'yı
 * (çerez sinyali) KAPSAMAZ. App Store'daki görünen ad "Siri" trademark
 * itirazı yüzünden "SiriusPlan"a çevrildi (bkz. docs/app-store-basvuru.md);
 * Play Store/web hâlâ "SiriPlan" — bu yüzden marka metni gösteren birkaç
 * bileşen (ColdStartSplash, AuthLogoLink, Sidebar) yalnızca iOS'ta farklı
 * metin gösterebilsin diye Android'den ayrı bir sinyal gerekti.
 */
export function useIsIOSNativeApp(): boolean {
  const [isIOSApp, setIsIOSApp] = useState(false);
  useEffect(() => {
    setIsIOSApp(isMobileAppUserAgent(navigator.userAgent));
  }, []);
  return isIOSApp;
}
