"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";
import { isNativeIOSPush, nativePushState } from "@/lib/native-push";
import { enablePush, getCurrentSubscription, isPushSupported } from "@/lib/push-client";

const DISMISS_KEY = "sp_push_prompt_dismissed";

/**
 * Panel ana sayfasında, bildirimi henüz açmamış kullanıcıya tek dokunuşluk
 * "Bildirimleri aç" kartı. Tarayıcılar izni kullanıcı dokunuşu olmadan
 * vermeyi/istemeyi kabul etmediği için otomatik açılamaz; bu kart en kısa yoldur.
 * Sunucuya istek atmaz (yalnızca yerel durum okunur); kapatılırsa bir daha çıkmaz,
 * Hesabım/Ayarlar'dan açılabilir.
 */
export function PushPrompt() {
  const t = useTranslations("dashboard.webPush");
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    let cancelled = false;
    (async () => {
      try {
        if (!isPushSupported()) return;
        const native = isNativeIOSPush();
        // iOS uygulamasında izin/kayıt durumu kabuktan sorulur (Notification API yok).
        if (native ? (await nativePushState()) !== "off" : Notification.permission !== "default") return;
        try {
          if (localStorage.getItem(DISMISS_KEY)) return;
        } catch {
          /* depolama yoksa kart yine de gösterilebilir */
        }
        const sub = native ? null : await getCurrentSubscription();
        if (!cancelled && !sub) setShow(true);
      } catch {
        /* desteklenmiyorsa kart hiç görünmez */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* yoksay */
    }
    setShow(false);
  }

  async function onEnable() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await enablePush();
      if (r !== "off") dismiss();
    } catch {
      /* başarısızsa kart kalır; kullanıcı tekrar deneyebilir */
    } finally {
      setBusy(false);
    }
  }

  if (!show || pathname !== "/dashboard") return null;
  return (
    <div className="fixed z-40 bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[26rem] rounded-xl border border-primary/30 bg-background shadow-lg p-3 flex items-center gap-3 print:hidden">
      <Bell className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t("promptTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("promptBody")}</p>
      </div>
      <button
        type="button"
        onClick={onEnable}
        disabled={busy}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {t("promptEnable")}
      </button>
      <button type="button" onClick={dismiss} aria-label={t("promptDismiss")} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
