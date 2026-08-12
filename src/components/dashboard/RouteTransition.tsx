"use client";

import { usePathname } from "next/navigation";

/**
 * Dashboard içi sayfa geçişlerine hafif bir fade+kaydırma verir — native
 * uygulama hissi için (bkz. globals.css .animate-route-fade). Kütüphane
 * gerektirmez: pathname'i key olarak kullanmak React'i wrapper div'i her
 * navigasyonda remount etmeye zorlar, bu da CSS animasyonunu yeniden oynatır.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-route-fade">
      {children}
    </div>
  );
}
