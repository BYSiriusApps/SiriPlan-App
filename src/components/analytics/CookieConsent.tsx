"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie_consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

type Consent = "accepted" | "rejected" | null;

function readConsent(): Consent {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

/**
 * KVKK/GDPR: GA4 yalnızca kullanıcı onayından SONRA yüklenir. Onay
 * localStorage'da tutulur (sunucu tarafında okunmaz — GA zaten yalnızca
 * client-side çalışıyor). Reddedilirse hiçbir analytics script'i
 * enjekte edilmez.
 */
export function CookieConsent({ nonce, mobileApp = false }: { nonce?: string; mobileApp?: boolean }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setHydrated(true);
  }, []);

  function choose(value: Exclude<Consent, null>) {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
  }

  return (
    <>
      {GA_ID && !mobileApp && consent === "accepted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
          <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}

      {hydrated && !mobileApp && consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-popover/95 backdrop-blur-sm p-4 shadow-lg ring-1 ring-foreground/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground flex-1">
              Deneyiminizi iyileştirmek için analiz çerezleri kullanıyoruz. Detaylar için{" "}
              <Link href="/gizlilik" className="underline underline-offset-2 hover:text-foreground">
                Gizlilik Politikası
              </Link>
              .
            </p>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none rounded-full"
                onClick={() => choose("rejected")}
              >
                Reddet
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none rounded-full"
                onClick={() => choose("accepted")}
              >
                Kabul Et
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
