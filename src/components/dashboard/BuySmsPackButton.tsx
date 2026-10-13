"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PurchaseConsent, EMPTY_CONSENT, isConsentComplete, type PurchaseConsentValue } from "@/components/legal/PurchaseConsent";

/**
 * Tek seferlik kontör paketleri (1.000 / 5.000 / 10.000 SMS) için Stripe Checkout'u açar.
 * Dönüşte (?sms_pack=success|canceled) kullanıcıya bilgi verir; kontör
 * webhook ile yüklenir, bu bileşen bakiyeye dokunmaz.
 */
export function BuySmsPackButton({
  packs,
  errorText,
  successText,
  canceledText,
  returnStatus,
}: {
  /** Satın alınabilir paketler; label sunucuda çevrilmiş/biçimlendirilmiş gelir. */
  packs: { id: string; label: string; priceLabel?: string }[];
  errorText: string;
  successText: string;
  canceledText: string;
  returnStatus?: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
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

  async function handleClick(packId: string) {
    // Mesafeli satış: ödeme öncesi iki açık onay zorunlu.
    if (!isConsentComplete(consent)) {
      setConsentWarn(true);
      toast.error(tConsent("missing"));
      return;
    }
    setLoading(packId);
    try {
      const res = await fetch("/api/stripe/sms-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error ?? errorText);
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(errorText);
      setLoading(null);
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
      {packs.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleClick(p.id)}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {loading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          {p.label}
          {p.priceLabel ? <span className="opacity-80 font-normal">· {p.priceLabel}</span> : null}
        </button>
      ))}
    </div>
  );
}
