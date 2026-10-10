"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { disablePush, enablePush, getCurrentSubscription, isPushSupported } from "@/lib/push-client";

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
        if (!isPushSupported()) {
          if (!cancelled) setState("unsupported");
          return;
        }
        if (Notification.permission === "denied") {
          if (!cancelled) setState("denied");
          return;
        }
        const sub = await getCurrentSubscription();
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

  async function onToggle(checked: boolean) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      if (checked) {
        setState(await enablePush());
      } else {
        await disablePush();
        setState("off");
      }
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
