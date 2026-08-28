"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mic, MicOff, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasMobileAppCookie } from "@/lib/mobile-app-shared";

/** next-intl yerel kodu → Web Speech API BCP-47 dil etiketi. */
const SPEECH_LANGS: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  ru: "ru-RU",
  ar: "ar-SA",
};

export function speechLangFor(locale: string): string {
  return SPEECH_LANGS[locale] ?? SPEECH_LANGS.tr;
}

type Platform = "nativeApp" | "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // Native sarmalayıcı (iOS WebView / Android TWA) içindeysek mikrofon iznini
  // tarayıcı değil, uygulamanın kendisi kontrol eder — ayrı yönerge gerekir.
  const inNativeApp =
    ua.includes("SiriPlanApp") ||
    (typeof document !== "undefined" && hasMobileAppCookie(document.cookie));
  if (inNativeApp) return "nativeApp";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

async function queryMicPermission(): Promise<PermissionStatus | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
    // "microphone" TS PermissionName birleşiminde yok; Firefox sorguyu reddeder → catch.
    return await navigator.permissions.query({ name: "microphone" as PermissionName });
  } catch {
    return null;
  }
}

async function rawGetUserMedia(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Mikrofon erişimini kullanıcının diline uygun bir açıklama diyaloğuyla ister.
 *
 * `requestMic()` çağrıldığında:
 *  - izin daha önce verilmişse doğrudan `true` döner,
 *  - hiç sorulmamışsa önce "neden mikrofon gerekiyor" açıklaması gösterilir,
 *    kullanıcı Devam derse tarayıcının kendi izin penceresi tetiklenir,
 *  - izin engellenmişse ayarları nasıl açacağını anlatan adımlar + "Tekrar Dene" gösterilir
 *    (kullanıcı ayarı açtığı an diyalog kendini onaylayıp kapanır).
 *
 * Dönen `micDialog` node'unu bileşenin JSX'ine bir kez yerleştirmek yeterli.
 */
export function useMicAccess() {
  const t = useTranslations("dashboard.mic");
  const locale = useLocale();
  const [mode, setMode] = useState<null | "intro" | "blocked">(null);
  const [busy, setBusy] = useState(false);
  const resolverRef = useRef<((granted: boolean) => void) | null>(null);
  const permStatusRef = useRef<PermissionStatus | null>(null);

  const settle = useCallback((granted: boolean) => {
    setMode(null);
    setBusy(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(granted);
  }, []);

  // Kullanıcı sistem/tarayıcı ayarından izni açtığında diyaloğu otomatik ilerlet.
  useEffect(() => {
    const status = permStatusRef.current;
    if (!status || mode !== "blocked") return;
    const onChange = () => {
      if (status.state === "granted") {
        void rawGetUserMedia().then((ok) => settle(ok));
      }
    };
    status.addEventListener("change", onChange);
    return () => status.removeEventListener("change", onChange);
  }, [mode, settle]);

  const requestMic = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    // Önceki bekleyen istek varsa iptal say.
    resolverRef.current?.(false);
    resolverRef.current = null;

    const status = await queryMicPermission();
    permStatusRef.current = status;

    if (status?.state === "granted") {
      return rawGetUserMedia();
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setMode(status?.state === "denied" ? "blocked" : "intro");
    });
  }, []);

  const handleContinue = useCallback(async () => {
    setBusy(true);
    const ok = await rawGetUserMedia();
    if (ok) {
      settle(true);
    } else {
      setBusy(false);
      setMode("blocked");
    }
  }, [settle]);

  const handleRetry = useCallback(async () => {
    setBusy(true);
    const ok = await rawGetUserMedia();
    if (ok) settle(true);
    else setBusy(false);
  }, [settle]);

  const platform = detectPlatform();

  const micDialog = (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {mode === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mic className="h-4 w-4" />
                </span>
                {t("introTitle")}
              </DialogTitle>
              <DialogDescription>{t("introBody")}</DialogDescription>
            </DialogHeader>
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {t("introHint")}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => settle(false)} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleContinue} disabled={busy}>
                <Mic className="mr-1.5 h-3.5 w-3.5" />
                {t("continue")}
              </Button>
            </div>
          </>
        )}

        {mode === "blocked" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                  <MicOff className="h-4 w-4" />
                </span>
                {t("blockedTitle")}
              </DialogTitle>
              <DialogDescription>{t("blockedBody")}</DialogDescription>
            </DialogHeader>

            <ol className="space-y-2 text-sm">
              {(t.raw(`steps.${platform}`) as string[]).map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>

            {platform === "desktop" && (
              <p className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <Settings className="h-3.5 w-3.5 shrink-0" />
                {t("desktopSettingsHint")}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => settle(false)} disabled={busy}>
                {t("close")}
              </Button>
              <Button size="sm" onClick={handleRetry} disabled={busy}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("retry")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  return { requestMic, micDialog, speechLang: speechLangFor(locale) };
}
