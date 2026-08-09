import { Phone, Mail, Clock, AlertTriangle } from "lucide-react";
import type { SubscriptionLockReason } from "@/lib/subscription-lock";

const SUPPORT_PHONE = process.env.PLATFORM_SUPPORT_PHONE || "+905355032634";
const SUPPORT_EMAIL = "destek@siriplan.com";

/**
 * Native mobil uygulamada (App Store/Play Store) deneme süresi dolan veya
 * ödemesi başarısız olan işletmelere gösterilen tam ekran bilgilendirme.
 * Kasıtlı olarak fiyat ($/TL) veya ödeme sayfasına link içermez — mağaza
 * kurallarına uymak için kullanıcı yalnızca müşteri desteğine yönlendirilir.
 * Plan yükseltme web'de (siriplan.com) yapılır.
 */
export function MobileTrialEndedScreen({ reason }: { reason: SubscriptionLockReason }) {
  const isPayment = reason === "payment_failed";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          {isPayment ? (
            <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">
            {isPayment ? "Ödemenizde Bir Sorun Var" : "Deneme Süreniz Sona Erdi"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isPayment
              ? "Son ödemeniz alınamadı. Hesabınızı yeniden etkinleştirmek için müşteri destek ekibimizle iletişime geçin."
              : "Ücretsiz deneme süreniz doldu. Hesabınızı etkinleştirmek için müşteri destek ekibimizle iletişime geçin."}
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Bizi Arayın
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border font-medium hover:bg-accent transition-colors"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
