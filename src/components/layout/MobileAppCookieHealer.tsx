"use client";

import { useEffect } from "react";
import {
  MOBILE_APP_COOKIE,
  hasMobileAppCookie,
  isMobileAppUserAgent,
} from "@/lib/mobile-app-shared";

/**
 * Normal mobil Chrome'a bulaşmış `sp_app` çerezini temizler.
 *
 * SORUN: Android paketi bir Trusted Web Activity — yani gerçek Chrome'u
 * başlatıyor ve Chrome'un çerez kavanozunu onunla PAYLAŞIYOR. Uygulama bir kez
 * açıldığında proxy.ts kalıcı (1 yıl) `sp_app=1` çerezini yazıyor ve o çerez
 * kullanıcının normal Chrome sekmesine de geçiyor. Bundan sonra telefondan
 * siriplan.com yazan kullanıcı, mağaza kilidi yüzünden HER pazarlama
 * sayfasında /dashboard'a atılıyor: site "mobilde hiç açılmıyor" görünüyor.
 *
 * ÇÖZÜM: Uygulamanın kendisi manifest'te `display: standalone` ile çalışır
 * (bkz. public/manifest.json), normal sekme ise `display-mode: browser`
 * bildirir. Yani "browser modunda ama sp_app çerezi var" durumu, tanımı gereği
 * sızıntıdır — çerezi orada sessizce siliyoruz.
 *
 * MAĞAZA UYUMU BOZULMUYOR:
 *  - iOS sarmalayıcısı hiç dokunulmuyor; koşul Android+Chrome ile sınırlı.
 *    iOS'ta sinyal zaten User-Agent işaretçisidir (çerez değil), onu bu kod
 *    silemez.
 *  - Android WebView (`; wv`) hariç tutuldu; TWA WebView değildir ama başka
 *    bir sarmalayıcı ihtimaline karşı dışarıda bırakıldı.
 *  - UA işaretçisi taşıyan istek hiç ele alınmıyor.
 * Kısacası: gerçek uygulamanın içinde bu kod hiçbir zaman çalışmaz.
 */
export function MobileAppCookieHealer() {
  useEffect(() => {
    const ua = navigator.userAgent;

    // Gerçek native sarmalayıcı: dokunma.
    if (isMobileAppUserAgent(ua)) return;
    if (!hasMobileAppCookie(document.cookie)) return;

    const isAndroid = /Android/.test(ua);
    const isChrome = /Chrome\//.test(ua);
    const isWebView = /;\s*wv\)/.test(ua);
    if (!isAndroid || !isChrome || isWebView) return;

    // TWA/PWA "standalone" açılır; yalnızca gerçek sekmede temizle.
    if (!window.matchMedia("(display-mode: browser)").matches) return;

    document.cookie = `${MOBILE_APP_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, []);

  return null;
}
