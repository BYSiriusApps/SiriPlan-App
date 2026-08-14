"use client";

import { useEffect, useState } from "react";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, PlusSquare, MonitorSmartphone, CheckCircle2 } from "lucide-react";
import { isMobileAppUserAgent, hasMobileAppCookie } from "@/lib/mobile-app-shared";

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
          Uygulamayı Telefona Ekle (Widget)
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-3">
        <p className="text-xs text-muted-foreground -mt-1">
          App Store / Google Play&apos;e kadar Siriplan&apos;ı ana ekranınıza ekleyip
          uygulama gibi tam ekran kullanabilirsiniz. Personelinize de önerin.
        </p>
        {installed ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Uygulama ana ekrana eklendi — telefonunuzdaki Siriplan simgesinden açabilirsiniz.
          </div>
        ) : deferredPrompt ? (
          <Button className="w-full gap-2" onClick={handleInstall}>
            <Smartphone className="h-4 w-4" />
            Ana Ekrana Ekle
          </Button>
        ) : isIos ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">iPhone / iPad (Safari):</p>
            <ol className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                Alttaki <Share className="h-3.5 w-3.5 inline mx-0.5" /> <strong>Paylaş</strong> düğmesine dokunun
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <PlusSquare className="h-3.5 w-3.5 inline mx-0.5" /> <strong>Ana Ekrana Ekle</strong>&apos;yi seçin
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                Sağ üstten <strong>Ekle</strong>&apos;ye dokunun — bitti!
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Android (Chrome):</p>
            <p className="text-muted-foreground">
              Tarayıcı menüsünden (⋮) <strong>Uygulamayı yükle</strong> veya{" "}
              <strong>Ana ekrana ekle</strong> seçeneğine dokunun.
            </p>
            <p className="text-xs text-muted-foreground">
              Not: Bu sayfayı telefonunuzun tarayıcısında açtığınızda kurulum düğmesi
              otomatik görünür.
            </p>
          </div>
        )}
      </div>
    </GlassCard3D>
  );
}
