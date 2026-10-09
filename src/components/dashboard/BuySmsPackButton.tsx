"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PurchaseConsent, EMPTY_CONSENT, isConsentComplete, type PurchaseConsentValue } from "@/components/legal/PurchaseConsent";

/**
 * 1.000 SMS'lik tek seferlik kontör paketi için Stripe Checkout'u açar.
 * Dönüşte (?sms_pack=success|canceled) kullanıcıya bilgi verir; kontör
 * webhook ile yüklenir, bu bileşen bakiyeye dokunmaz.
 */
export function BuySmsPackButton({
  label,
  errorText,
  successText,
  canceledText,
  returnStatus,
}: {
  label: string;
  errorText: string;
  successText: string;
  canceledText: string;
  returnStatus?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const tConsent = useTranslations("purchaseConsent");
  const [consent, setConsent] = useState<PurchaseConsentValue>(EMPTY_CONSENT);
  const [consentWarn, setConsentWarn] = useState(false);

  useEffect(() => {
    if (returnStatus === "success") toast.success(successText);
    else if (returnStatus === "canceled") toast.info(canceledText);
    if (returnStatus) router.replace("/dashboard/abonelik");
    // Yalnızca ilk açılışta (dönüş parametresi varken) bir kez çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClick() {
    // Mesafeli satış: ödeme öncesi iki açık onay zorunlu.
    if (!isConsentComplete(consent)) {
      setConsentWarn(true);
      toast.error(tConsent("missing"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/sms-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error ?? errorText);
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(errorText);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <PurchaseConsent
        idPrefix="pc-sms"
        value={consent}
        highlight={consentWarn && !isConsentComplete(consent)}
        onChange={(v) => { setConsent(v); if (isConsentComplete(v)) setConsentWarn(false); }}
      />
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      {label}
    </button>
    </div>
  );
}
