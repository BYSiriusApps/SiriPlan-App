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
import { AlertTriangle, CalendarClock } from "lucide-react";
import { useDashboardBadges } from "@/components/dashboard/DashboardBadgeContext";

export function DashboardBanners({ role }: { role: string }) {
  const { pendingApprovalsCount, lowStockCount } = useDashboardBadges();
  // Onay bekliyor şeridi yalnızca owner/manager'a — sayaçtaki (Sidebar/
  // MobileNav) tam sayı tüm rollere görünür kalmaya devam ediyor, burada
  // değişen bir şey yok.
  const pendingApptCount = role === "owner" || role === "manager" ? pendingApprovalsCount : 0;

  return (
    <>
      {pendingApptCount > 0 && (
        <div className="bg-rose-600 hover:bg-rose-700 transition-colors text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b border-rose-700">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {pendingApptCount} randevu onayınızı bekliyor — dış kaynaktan gelen talepler.
          </span>
          <Link
            href="/dashboard/bekleyen-istekler"
            className="underline hover:text-rose-100 transition-colors shrink-0 font-bold"
          >
            Onayla →
          </Link>
        </div>
      )}
      {lowStockCount > 0 && (
        <div className="bg-amber-500 hover:bg-amber-600 transition-colors text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 border-b border-amber-600">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Kritik Stok Uyarısı: {lowStockCount} adet ürünün stoku belirlenen kritik seviyenin altına düşmüştür!
          </span>
          <Link
            href="/dashboard/stok"
            className="underline hover:text-amber-100 transition-colors shrink-0 font-bold"
          >
            Stok Yönetimine Git →
          </Link>
        </div>
      )}
    </>
  );
}
