"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";

/**
 * Dashboard hata sınırı — herhangi bir sayfada beklenmeyen bir istemci/sunucu
 * hatası olursa "sayfa yüklenemedi" yerine kurtarma seçenekleri sunar.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard hata sınırı:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">😵‍💫</p>
      <div>
        <h2 className="text-lg font-bold">Sayfa yüklenirken bir sorun oluştu</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Geçici bir hata olabilir — yenilemeyi deneyin.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Yeniden Dene
        </Button>
        <Button variant="outline" className="gap-2" render={<Link href="/dashboard" />}>
          <Home className="h-4 w-4" /> Ana Sayfa
        </Button>
      </div>
    </div>
  );
}
