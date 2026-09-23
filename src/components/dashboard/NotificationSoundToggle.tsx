"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import {
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  onNotificationSoundMuteChange,
} from "@/lib/notification-sound";

/** Sidebar/mobil menüde "yeni randevu geldiğinde ses çal" aç/kapat düğmesi. */
export function NotificationSoundToggle() {
  const t = useTranslations("dashboard.notifSound");
  const [muted, setMuted] = useState(() => (typeof window !== "undefined" ? isNotificationSoundMuted() : false));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return onNotificationSoundMuteChange(setMuted);
  }, []);

  return (
    <button
      type="button"
      aria-label={t("toggleAria")}
      title={mounted ? (muted ? t("off") : t("on")) : undefined}
      onClick={() => setNotificationSoundMuted(!muted)}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {mounted && muted ? (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </button>
  );
}
