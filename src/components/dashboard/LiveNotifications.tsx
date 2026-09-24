"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { playNotificationChime } from "@/lib/notification-sound";

/**
 * Panel açıkken (sekme arka planda olsa bile) yeni randevu/talep geldiğinde
 * sesli+görsel uyarı verir. Telegram/WhatsApp bildirimi dışında panel içi
 * tek uyarı yöntemi üstteki statik şeritti (yalnızca sayfa yenilenince
 * görünüyordu, sesi yoktu) — bu yüzden personel/sahip Telegram'a bakmazsa
 * yeni randevuyu fark etmiyordu. Bu bileşen Supabase realtime ile dinler,
 * router.refresh() ile üstteki şeritleri/sayaçları canlı günceller.
 */
export function LiveNotifications({ orgId }: { orgId: string }) {
  const router = useRouter();
  const t = useTranslations("dashboard.liveNotify");
  const askedPermission = useRef(false);

  useEffect(() => {
    if (
      !askedPermission.current &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      askedPermission.current = true;
      // Sayfa yüklenince sessizce sorulur; kullanıcı reddederse tarayıcı
      // zaten hatırlar, bir daha sormaz.
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();

    function fireAlert(title: string, body: string) {
      playNotificationChime();
      toast.info(title, { description: body });
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(title, { body, icon: "/icons/icon-192x192.png", tag: "sp-live-notify" });
        } catch {
          // Bildirim API'si her tarayıcıda/ortamda garanti değil — sessizce yut
        }
      }
      router.refresh();
    }

    const channel = supabase
      .channel(`live-notify-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments", filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as { status?: string; customer_name?: string };
          if (row.status !== "talep") return;
          fireAlert(
            t("newRequestTitle"),
            row.customer_name ? t("newPendingBodyNamed", { name: row.customer_name }) : t("newPendingBodyGeneric")
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointment_requests", filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as { customer_name?: string };
          fireAlert(
            t("newRequestTitle"),
            row.customer_name ? t("newRequestBodyNamed", { name: row.customer_name }) : t("newRequestBodyGeneric")
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, router, t]);

  return null;
}
