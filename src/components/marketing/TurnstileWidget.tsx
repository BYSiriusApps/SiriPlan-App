"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile — çerezsiz, kişisel veri toplamayan CAPTCHA.
 *
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY tanımlı değilse bileşen HİÇBİR ŞEY render
 * etmez ve script'i indirmez. Böylece anahtar üretilene kadar sayfa bugünkü
 * gibi çalışmaya devam eder; sunucu tarafı da (lib/turnstile.ts) aynı koşulda
 * katmanı atlar. Anahtar eklendiği an ikisi birlikte devreye girer.
 *
 * CSP NOTU: challenges.cloudflare.com hem script-src hem frame-src'de olmalı
 * (widget bir iframe açar) — bkz. lib/csp.ts.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
    onTurnstileReady?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string | null) => void;
  /**
   * Her artışında widget sıfırlanıp YENİ bir token üretilir.
   *
   * NEDEN GEREKLİ: Turnstile token'ı TEK KULLANIMLIK. Gönderim sunucuda başka
   * bir sebeple reddedilirse (mesaj çok kısa, hız sınırı…) kullanıcı düzeltip
   * tekrar gönderdiğinde aynı token gider ve Cloudflare bu kez
   * "timeout-or-duplicate" der. Kullanıcı, formu doğru doldurmuş olmasına
   * rağmen bir daha asla gönderemez. Hata sonrası sıfırlama bunu keser.
   */
  resetKey?: number;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // Script'i tek sefer yükle. Sayfada birden fazla form olsa bile aynı etiket
  // paylaşılır — ikinci bir <script> Turnstile'ı yeniden başlatır ve mevcut
  // widget'ları bozar.
  useEffect(() => {
    if (!siteKey) return;

    if (window.turnstile) {
      setReady(true);
      return;
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const onLoad = () => setReady(true);
    script.addEventListener("load", onLoad);
    return () => script?.removeEventListener("load", onLoad);
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !ready || !containerRef.current || widgetIdRef.current) return;

    const id = window.turnstile?.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token: string) => onToken(token),
      // Token 300 sn sonra düşer; kullanıcı formu yavaş doldurduysa sunucu
      // "timeout-or-duplicate" ile reddederdi. Token'ı düşürüp yeniden almak
      // sessizce doğru davranış.
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });

    widgetIdRef.current = id ?? null;

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // onToken kasıtlı olarak bağımlılık dışı: her render'da yeni bir referans
    // gelirse widget sürekli yok edilip yeniden kurulurdu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, ready]);

  useEffect(() => {
    // İlk render'da (resetKey === 0) sıfırlamaya gerek yok — widget zaten yeni.
    if (!resetKey || !widgetIdRef.current) return;
    window.turnstile?.reset(widgetIdRef.current);
    onToken(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
