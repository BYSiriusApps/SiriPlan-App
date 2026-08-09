import Link from "next/link";
import { AlertTriangle, CreditCard, Sparkles } from "lucide-react";
import type { SubscriptionLockReason } from "@/lib/subscription-lock";

export function SubscriptionLockBanner({ reason }: { reason: SubscriptionLockReason }) {
  const isPayment = reason === "payment_failed";

  return (
    <div className="print:hidden sticky top-0 z-30 flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 border-b border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {isPayment
            ? "Son ödemeniz alınamadı. Panele erişebilirsiniz ama yeni kayıt/güncelleme yapamazsınız."
            : "Ücretsiz deneme süreniz doldu. Panele erişebilirsiniz ama yeni kayıt/güncelleme yapamazsınız."}
        </span>
      </div>
      {isPayment ? (
        <Link
          href="/dashboard/abonelik"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Ödemeyi Düzelt
        </Link>
      ) : (
        <Link
          href="/auth/plan-sec?expired=1"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Aboneliği Yükselt
        </Link>
      )}
    </div>
  );
}
