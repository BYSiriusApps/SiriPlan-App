"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, CameraOff, Keyboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeScanned } from "@/lib/barcode";

/**
 * Kamerayla barkod tarayıcı — stokta barkodla perakende satış.
 *
 * Öncelik sırası:
 *  1. Tarayıcının yerel `BarcodeDetector` API'si (Android Chrome / TWA WebView,
 *     masaüstü Chrome/Edge) — kütüphane yok, WASM yok, CSP sorunu yok.
 *  2. `@zxing/browser` (saf JS, WASM yok → nonce'lu panel CSP'siyle uyumlu).
 *     Sadece BarcodeDetector yoksa ve tembel `import()` ile yüklenir.
 *  3. Kamera erişilemiyorsa (izin reddi / kamera yok / native uygulamada CAMERA
 *     izni verilmemiş) → ELLE GİRİŞ moduna düşer. Her durumda "elle gir"
 *     seçeneği görünür kalır, yani özellik kamerasız da tam çalışır.
 *
 * Not: Kurulu Android uygulaması (TWA) `android.permission.CAMERA` bildirmiyorsa
 * (2) çalışsa bile WebView getUserMedia'yı reddeder → (3) devreye girer.
 */

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "codabar",
  "itf",
  "qr_code",
];

type Mode = "starting" | "scanning" | "manual";

interface Props {
  onDetect: (code: string) => void;
  /** Tarama başarılı olunca bileşen açık kalır (arka arkaya satış); sadece bilgi amaçlı. */
  busy?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function BarcodeScanner({ onDetect, busy }: Props) {
  const t = useTranslations("dashboard.stockPage.barcode");
  const [mode, setMode] = useState<Mode>("starting");
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const lastHitRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const emit = useCallback(
    (raw: string) => {
      const code = normalizeScanned(raw);
      if (!code) return;
      const now = Date.now();
      // Aynı kodu 1.5 sn içinde iki kez yollama (kamera sürekli okuyor).
      if (lastHitRef.current.code === code && now - lastHitRef.current.at < 1500) return;
      lastHitRef.current = { code, at: now };
      onDetect(code);
    },
    [onDetect],
  );

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      zxingControlsRef.current?.stop();
    } catch {
      /* noop */
    }
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const startNativeDetector = useCallback(
    async (Detector: any) => {
      const detector = new Detector({ formats: BARCODE_FORMATS });
      const tick = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const hits = await detector.detect(video);
          if (hits && hits.length) emit(hits[0].rawValue);
        } catch {
          /* geçici okuma hatası — devam */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [emit],
  );

  const startZxing = useCallback(async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromVideoElement(
      videoRef.current as HTMLVideoElement,
      (result: any) => {
        if (result) emit(result.getText());
      },
    );
    zxingControlsRef.current = controls;
  }, [emit]);

  const start = useCallback(async () => {
    setError(null);
    setMode("starting");
    stopCamera();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMode("manual");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        setMode("manual");
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      setMode("scanning");

      const NativeDetector = (window as any).BarcodeDetector;
      if (NativeDetector) {
        // Bazı tarayıcılarda getSupportedFormats var; hata verirse yine deneriz.
        await startNativeDetector(NativeDetector);
      } else {
        await startZxing();
      }
    } catch {
      stopCamera();
      setError(t("cameraFallback"));
      setMode("manual");
    }
  }, [stopCamera, startNativeDetector, startZxing, t]);

  useEffect(() => {
    void start();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManual = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = normalizeScanned(manualValue);
      if (!code) {
        setError(t("manualInvalid"));
        return;
      }
      setError(null);
      setManualValue("");
      onDetect(code);
    },
    [manualValue, onDetect, t],
  );

  return (
    <div className="space-y-3">
      {mode !== "manual" && (
        <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {/* Nişangâh */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/3 w-2/3 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {mode === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white">
            {t("scanHint")}
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <CameraOff className="h-4 w-4 shrink-0" />
          <span>{error || t("cameraFallback")}</span>
        </div>
      )}

      <form onSubmit={submitManual} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            inputMode="text"
            autoComplete="off"
            placeholder={t("manualPlaceholder")}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={busy}>
          {t("manualSubmit")}
        </Button>
      </form>

      {mode !== "manual" ? (
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setMode("manual");
          }}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t("enterManually")}
        </button>
      ) : (
        navigator?.mediaDevices?.getUserMedia && (
          <button
            type="button"
            onClick={() => void start()}
            className="flex items-center gap-1 text-xs text-primary underline underline-offset-2"
          >
            <Camera className="h-3.5 w-3.5" />
            {t("retryCamera")}
          </button>
        )
      )}
    </div>
  );
}
