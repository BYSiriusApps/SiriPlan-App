"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { markWarmStart } from "./ColdStartSplash";

/**
 * Dashboard içi sayfa geçişlerine hafif bir fade+kaydırma verir — native
 * uygulama hissi için (bkz. globals.css .animate-route-fade). Kütüphane
 * gerektirmez: pathname'i key olarak kullanmak React'i wrapper div'i her
 * navigasyonda remount etmeye zorlar, bu da CSS animasyonunu yeniden oynatır.
 *
 * Ayrıca panel kabuğu hidrate olur olmaz "soğuk başlangıç bitti" işaretini
 * koyar; böylece loading.tsx bundan sonraki geçişlerde tam ekran açılış
 * görselini değil ince ilerleme çizgisini gösterir (bkz. ColdStartSplash).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    markWarmStart();
  }, []);

  return (
    <div key={pathname} className="animate-route-fade">
      {children}
    </div>
  );
}
