"use client";

/**
 * "Onay bekliyor" (kırmızı) + "Kritik stok" (amber) şeritleri.
 * Önceden dashboard/layout.tsx'te sunucu tarafında pendingApptCount/
 * lowStockCount hazır olana kadar TÜM sayfa render'ını bekleten inline JSX'ti
 * — davranış (metin, buton, hangi rol görür) birebir korunarak buraya
 * taşındı; artık DashboardBadgeContext'ten (bkz. o dosya) geldiği için sayfa
 * içeriğini bloklamıyor, sayılar gelince bir an sonra beliriyor.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarClock, MessageCircle } from "lucide-react";
import { useDashboardBadges } from "@/components/dashboard/DashboardBadgeContext";
import { useIsMobileApp } from "@/lib/use-mobile-app";

export function DashboardBanners({ role }: { role: string }) {
  const t = useTranslations("dashboardBanners");
  const { pendingApprovalsCount, lowStockCount, waQuota } = useDashboardBadges();
  const isNativeApp = useIsMobileApp();
  // Mini plan: aylık müşteri WhatsApp mesajı hakkının %80'i dolunca uyar (yalnızca sahip/yönetici).
  const showWaQuota = !!waQuota && waQuota.used >= Math.ceil(waQuota.limit * 0.8) && (role === "owner" || role === "manager");
  const waQuotaFull = !!waQuota && waQuota.used >= waQuota.limit;
  // Onay bekliyor şeridi yalnızca owner/manager'a — sayaçtaki (Sidebar/
  // MobileNav) tam sayı tüm rollere görünür kalmaya devam ediyor, burada
  // değişen bir şey yok.
  const pendingApptCount = role === "owner" || role === "manager" ? pendingApprovalsCount : 0;

  return (
    <>
      {showWaQuota && waQuota && (
        <div className={`${waQuotaFull ? "bg-rose-600 border-rose-700" : "bg-amber-500 border-amber-600"} text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b`}>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4 shrink-0" />
            {waQuotaFull
              ? t("waFull", { used: waQuota.used, limit: waQuota.limit })
              : t("waWarn", { used: waQuota.used, limit: waQuota.limit })}
          </span>
          {!isNativeApp && (
            <Link href="/dashboard/abonelik" className="underline hover:opacity-80 transition-opacity shrink-0 font-bold">
              {t("upgrade")}
            </Link>
          )}
        </div>
      )}
      {pendingApptCount > 0 && (
        <div className="bg-rose-600 hover:bg-rose-700 transition-colors text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b border-rose-700">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {t("pending", { count: pendingApptCount })}
          </span>
          <Link
            href="/dashboard/bekleyen-istekler"
            className="underline hover:text-rose-100 transition-colors shrink-0 font-bold"
          >
            {t("approve")}
          </Link>
        </div>
      )}
      {lowStockCount > 0 && (
        <div className="bg-amber-500 hover:bg-amber-600 transition-colors text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b border-amber-600">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("lowStock", { count: lowStockCount })}
          </span>
          <Link
            href="/dashboard/stok"
            className="underline hover:text-amber-100 transition-colors shrink-0 font-bold"
          >
            {t("goStock")}
          </Link>
        </div>
      )}
    </>
  );
}
