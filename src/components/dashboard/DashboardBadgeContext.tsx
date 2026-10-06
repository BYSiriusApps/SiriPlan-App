"use client";

/**
 * Panel rozet sayıları (Bekleyen İşler, kritik stok, onay bekleyen randevu).
 *
 * NEDEN: Bu sayılar önceden `dashboard/layout.tsx`'te HER sayfa geçişinde 5
 * ayrı sorguyla senkron hesaplanıyordu — kullanıcı asıl istediği sayfa
 * içeriğini (takvim, randevu listesi) görmeden önce bu sorguların bitmesini
 * bekliyordu. Artık layout hiç beklemiyor; bu provider mount olur olmaz
 * `/api/dashboard/badge-counts`'a (20 sn önbellekli, bkz. lib/dashboard-
 * badges.ts) istek atar, sayılar gelince rozetler "dolar".
 *
 * Tazeleme üç yoldan tetiklenir:
 *  1. Mount'ta bir kez.
 *  2. Sekme/pencere öne dönünce (Faz 3 ile aynı desen).
 *  3. `refetch()` — LiveNotifications.tsx realtime bir olay (yeni talep,
 *     randevu güncellemesi, stok değişikliği) yakaladığında bunu çağırır;
 *     önceden bu sayılar `router.refresh()` ile anında güncelleniyordu,
 *     davranış burada korunuyor.
 *  4. 20 sn'lik periyodik yenileme — sunucu önbellek penceresiyle eşleşen bir
 *     güvenlik ağı, yukarıdaki üçü bir şekilde kaçırılırsa bile rozet uzun
 *     süre bayatlamasın diye.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export interface DashboardBadgeCounts {
  pendingWorkCount: number;
  pendingApprovalsCount: number;
  lowStockCount: number;
  waQuota: { used: number; limit: number } | null;
}

const DEFAULT_COUNTS: DashboardBadgeCounts = {
  pendingWorkCount: 0,
  pendingApprovalsCount: 0,
  lowStockCount: 0,
  waQuota: null,
};

interface DashboardBadgeState {
  counts: DashboardBadgeCounts;
  refetch: () => void;
}

const DashboardBadgeCtx = createContext<DashboardBadgeState>({
  counts: DEFAULT_COUNTS,
  refetch: () => {},
});

export function DashboardBadgeProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<DashboardBadgeCounts>(DEFAULT_COUNTS);
  const inFlight = useRef(false);

  const fetchCounts = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    fetch("/api/dashboard/badge-counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setCounts({
          pendingWorkCount: Number(data.pendingWorkCount) || 0,
          pendingApprovalsCount: Number(data.pendingApprovalsCount) || 0,
          lowStockCount: Number(data.lowStockCount) || 0,
          waQuota:
            data.waQuota && Number(data.waQuota.limit) > 0
              ? { used: Number(data.waQuota.used) || 0, limit: Number(data.waQuota.limit) }
              : null,
        });
      })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    fetchCounts();

    function handleVisible() {
      if (!document.hidden) fetchCounts();
    }
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    const interval = setInterval(fetchCounts, 20_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
      clearInterval(interval);
    };
  }, [fetchCounts]);

  return (
    <DashboardBadgeCtx.Provider value={{ counts, refetch: fetchCounts }}>
      {children}
    </DashboardBadgeCtx.Provider>
  );
}

export function useDashboardBadges(): DashboardBadgeCounts {
  return useContext(DashboardBadgeCtx).counts;
}

export function useDashboardBadgeRefetch(): () => void {
  return useContext(DashboardBadgeCtx).refetch;
}
