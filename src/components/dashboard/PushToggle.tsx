"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Service worker'ı hazır döndürür. Kök layout kaydı yalnızca "load" olayına bağlıyor;
 * script sayfa yüklendikten sonra çalışırsa olay kaçıyor ve kayıt hiç olmuyor —
 * o durumda `ready` sonsuza kadar bekler. register() idempotenttir (zaten kayıtlıysa
 * mevcut kaydı döndürür), bu yüzden burada her zaman çağırmak güvenlidir.
 */
async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

/**
 * Bu cihaz için Web Push (panel kapalıyken bildirim) aç/kapat anahtarı.
 * İzin yalnızca kullanıcı anahtara basınca istenir. Sayfa yüklenince hiçbir
 * ağ isteği atılmaz (sadece yerel abonelik durumu okunur) — panel hızını etkilemez.
 */
export function PushToggle() {
  const t = useTranslations("dashboard.webPush");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (
          !VAPID_PUBLIC_KEY ||
          !("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window)
        ) {
          if (!cancelled) setState("unsupported");
          return;
        }
        if (Notification.permission === "denied") {
          if (!cancelled) setState("denied");
          return;
        }
        const reg = await getReadyRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState(perm === "denied" ? "denied" : "off");
      return;
    }
    const reg = await getReadyRegistration();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) {
      // Sunucuya kaydolmayan abonelik işe yaramaz — tarayıcıda da bırakma.
      await sub.unsubscribe().catch(() => {});
      throw new Error("subscribe failed");
    }
    setState("on");
  }

  async function disable() {
    const reg = await getReadyRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState("off");
  }

  async function onToggle(checked: boolean) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      if (checked) await enable();
      else await disable();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const disabled = state === "loading" || state === "unsupported" || state === "denied" || busy;

  return (
    <div className="space-y-1">
      <label
        className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border text-sm ${
          disabled ? "text-muted-foreground" : "cursor-pointer"
        }`}
      >
        <span>{t("label")}</span>
        <Checkbox checked={state === "on"} disabled={disabled} onCheckedChange={(c) => onToggle(!!c)} />
      </label>
      {state === "unsupported" && <p className="text-[11px] text-muted-foreground">{t("unsupported")}</p>}
      {state === "denied" && <p className="text-[11px] text-muted-foreground">{t("denied")}</p>}
      {state === "on" && <p className="text-[11px] text-muted-foreground">{t("onHint")}</p>}
      {error && <p className="text-[11px] text-destructive">{t("error")}</p>}
    </div>
  );
}
