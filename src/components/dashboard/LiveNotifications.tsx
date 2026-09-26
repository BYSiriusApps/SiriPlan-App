"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
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
 *
 * /dashboard/takvim sayfasında UnifiedCalendar.tsx AYRI bir realtime kanalıyla
 * appointments (her olay) + appointment_requests INSERT'ini dinleyip kendi
 * (800ms debounce'lu) router.refresh()'ini zaten çağırıyor — router.refresh()
 * kökten (layout dahil) yeniden render tetiklediği için takvimdeyken bu
 * olaylar için BURADA ikinci bir refresh planlamak fazladan/gereksiz (2 ayrı
 * tam-ağaç sorgulama). Bu yüzden yalnızca UnifiedCalendar'ın zaten kapsadığı
 * olaylar (appointments + appointment_requests INSERT) takvim sayfasındayken
 * atlanıyor; appointment_requests UPDATE/DELETE ve inventory_items (stok)
 * olayları UnifiedCalendar'da HİÇ dinlenmiyor, bu yüzden takvimdeyken de
 * atlanmadan üstteki şeritler/sayaçlar (bkz. dashboard/layout.tsx
 * lowStockCount/pendingApptCount/pendingWorkCount, Sidebar/MobileNav rozeti)
 * güncel kalsın diye koşulsuz tetikleniyor.
 */
export function LiveNotifications({ orgId }: { orgId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // Ref'te tutuluyor ki aşağıdaki realtime effect'i her navigasyonda kanalı
  // yeniden kurmasın (bkz. [orgId, router, t] deps) — yine de scheduleRefresh
  // her zaman güncel pathname'i görür. Ref, render sırasında değil ayrı bir
  // effect'te güncelleniyor (react-hooks/refs kuralı render'da ref mutasyonuna izin vermiyor).
  const pathnameRef = useRef(pathname);
  const t = useTranslations("dashboard.liveNotify");
  const askedPermission = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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

    function scheduleRefresh(skipOnCalendar: boolean) {
      // /dashboard/takvim'de UnifiedCalendar.tsx zaten kendi (800ms debounce'lu)
      // router.refresh()'ini appointments + appointment_requests INSERT için
      // çağırıyor — kökten yeniden render tetiklediği için layout sayaçları da
      // dahil zaten tazeleniyor. Bu olaylarda ikinci bir refresh planlamak
      // sadece fazladan bir tam-ağaç sorgulaması demek, bu yüzden atlanıyor.
      // UnifiedCalendar'ın dinlemediği olaylarda (appointment_requests
      // UPDATE/DELETE, inventory_items) takvimdeyken de atlanmaz.
      if (skipOnCalendar && pathnameRef.current === "/dashboard/takvim") return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 800);
    }

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
      scheduleRefresh(true);
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
      // Üstteki iki kanal yalnızca YENİ talep/istek geldiğinde ses+toast+
      // bildirim veriyor. Ama bir talep/istek onaylanıp/reddedilip/stok
      // güncellendiğinde (bu cihazdan değil, başka bir personel/cihazdan)
      // üstteki şeritler ve Sidebar/MobileNav rozeti (bkz. dashboard/layout.tsx
      // pendingApptCount/lowStockCount/pendingWorkCount) eskiden hiç
      // tazelenmiyordu — yalnızca sayfa elle yenilenince güncelleniyordu. Bu
      // üç dinleyici sessizce (ses/toast yok) sayaçları günceller.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments", filter: `org_id=eq.${orgId}` },
        () => scheduleRefresh(true)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointment_requests", filter: `org_id=eq.${orgId}` },
        () => scheduleRefresh(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `org_id=eq.${orgId}` },
        () => scheduleRefresh(false)
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [orgId, router, t]);

  return null;
}
