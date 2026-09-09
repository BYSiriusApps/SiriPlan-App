import Link from "next/link";
import { AlertTriangle, CreditCard, Sparkles, Phone, Mail } from "lucide-react";
import type { SubscriptionLockReason } from "@/lib/subscription-lock";

const SUPPORT_PHONE = process.env.PLATFORM_SUPPORT_PHONE || "+905355032634";
const SUPPORT_EMAIL = "info@bysirius.com";

export function SubscriptionLockBanner({
  reason,
  mobileApp = false,
}: {
  reason: SubscriptionLockReason;
  mobileApp?: boolean;
}) {
  const isPayment = reason === "payment_failed";

  const message = isPayment
    ? "Son ödemeniz alınamadı. Panele erişebilirsiniz ama yeni kayıt/güncelleme yapamazsınız."
    : "Ücretsiz deneme süreniz doldu. Panele erişebilirsiniz ama yeni kayıt/güncelleme yapamazsınız.";

  return (
    <div className="print:hidden sticky top-0 z-30 flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 border-b border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {mobileApp
            ? `${message} Hesabınızı etkinleştirmek için müşteri destek ekibimizle iletişime geçin.`
            : message}
        </span>
      </div>

      {mobileApp ? (
        // Native mobil uygulamada (App Store/Play Store) fiyat veya web ödeme
        // sayfasına link gösterilemez — kullanıcı yalnızca müşteri desteğine
        // yönlendirilir. Plan yükseltme web'de (siriplan.com) yapılır.
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            Bizi Arayın
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-400 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            E-posta
          </a>
        </div>
      ) : isPayment ? (
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
