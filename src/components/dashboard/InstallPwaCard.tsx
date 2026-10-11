"use client";

import { useEffect, useState } from "react";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, PlusSquare, MonitorSmartphone, CheckCircle2 } from "lucide-react";
import { isMobileAppUserAgent, hasMobileAppCookie } from "@/lib/mobile-app-shared";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-links";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Uygulamayı Telefona Ekle" kartı — App Store / Google Play'e kadar
 * PWA kısayolu (widget) ile uygulama gibi kullanım sağlar.
 * Android/Chrome: native kurulum istemi. iOS: adım adım yönerge.
 */
export function InstallPwaCard() {
  const tp = useTranslations("panelPages.pwaKart");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  // Native uygulama (App Store/Play Store) içinde zaten "kurulu" — PWA'ya
  // ana ekrana ekleme yönergesi göstermek kafa karıştırır, kart gizlenir.
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setIsNativeApp(isMobileAppUserAgent(navigator.userAgent) || hasMobileAppCookie(document.cookie));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }

  if (isNativeApp) return null;

  return (
    <GlassCard3D className="glass-card" glow intensity={3}>
      <div className="panel-header">
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-primary">
          <MonitorSmartphone className="h-4 w-4" />
          {tp("uygulamayi_telefona_ekle_wid")}
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-3">
        <p className="text-xs text-muted-foreground -mt-1">
          {tp("siriplan_i_magazadan_indireb")}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold hover:bg-muted/70 transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            {tp("app_store_dan_indir")}
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold hover:bg-muted/70 transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            {tp("google_play_den_indir")}
          </a>
        </div>
        {installed ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {tp("uygulama_ana_ekrana_eklendi")}
          </div>
        ) : deferredPrompt ? (
          <Button className="w-full gap-2" onClick={handleInstall}>
            <Smartphone className="h-4 w-4" />
            {tp("ana_ekrana_ekle")}
          </Button>
        ) : isIos ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{tp("iphone_ipad_safari")}</p>
            <ol className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                {tp.rich("ios_step1", { icon: () => <Share className="h-3.5 w-3.5 inline mx-0.5" />, b: (c) => <strong>{c}</strong> })}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>
                  {tp.rich("ios_step2", { icon: () => <PlusSquare className="h-3.5 w-3.5 inline mx-0.5" />, b: (c) => <strong>{c}</strong> })}
                  <span className="text-xs"> {tp.rich("ios_step2_hint", { b: (c) => <strong>{c}</strong> })}</span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                {tp.rich("ios_step3", { b: (c) => <strong>{c}</strong> })}
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{tp("android_chrome")}</p>
            <p className="text-muted-foreground">
              {tp.rich("android_steps", { b: (c) => <strong>{c}</strong> })}
            </p>
            <p className="text-xs text-muted-foreground">
              {tp("not_bu_sayfayi_telefonunuzun")}
            </p>
          </div>
        )}
      </div>
    </GlassCard3D>
  );
}
