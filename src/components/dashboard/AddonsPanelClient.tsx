"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { PurchaseConsent, EMPTY_CONSENT, isConsentComplete, type PurchaseConsentValue } from "@/components/legal/PurchaseConsent";

/**
 * Ek paket satın alma (Stripe Checkout). Yalnızca WEB'de render edilir
 * (sunucu bileşeni native uygulamada bu bileşeni hiç üretmez; uç nokta da
 * ayrıca mobil uygulamayı reddeder). Dönüşte (?addon=success|canceled) bilgi verir.
 */
export function BuyAddonButtons({
  addon,
  monthlyLabel,
  annualLabel,
  quantityLabel,
  errorText,
  successText,
  canceledText,
  returnStatus,
  withQuantity,
}: {
  addon: "ai_assistant" | "extra_branch";
  monthlyLabel: string;
  annualLabel?: string;
  quantityLabel?: string;
  errorText: string;
  successText: string;
  canceledText: string;
  returnStatus?: string;
  withQuantity?: boolean;
}) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const tConsent = useTranslations("purchaseConsent");
  const [consent, setConsent] = useState<PurchaseConsentValue>(EMPTY_CONSENT);
  const [consentWarn, setConsentWarn] = useState(false);

  useEffect(() => {
    // returnStatus yalnızca sayfadaki İLK satın alma bileşenine geçirilir (çift toast olmasın).
    if (returnStatus === "success") toast.success(successText);
    else if (returnStatus === "canceled") toast.info(canceledText);
    if (returnStatus) router.replace("/dashboard/abonelik");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy(annual: boolean) {
    // Mesafeli satış: iki açık onay işaretlenmeden ödeme sayfası açılmaz.
    if (!isConsentComplete(consent)) {
      setConsentWarn(true);
      toast.error(tConsent("missing"));
      return;
    }
    setLoading(annual ? "annual" : "monthly");
    try {
      const res = await fetch("/api/stripe/addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addon, annual, quantity: withQuantity ? quantity : 1, consent }),
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
    <div className="space-y-2">
      {withQuantity && (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{quantityLabel}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(20, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
            className="w-20 text-center"
          />
        </label>
      )}
      <PurchaseConsent
        idPrefix={`pc-addon-${addon}`}
        value={consent}
        highlight={consentWarn && !isConsentComplete(consent)}
        onChange={(v) => { setConsent(v); if (isConsentComplete(v)) setConsentWarn(false); }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => buy(false)}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {loading === "monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
          {monthlyLabel}
        </button>
        {annualLabel && (
          <button
            type="button"
            onClick={() => buy(true)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-60"
          >
            {loading === "annual" && <Loader2 className="h-4 w-4 animate-spin" />}
            {annualLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Mevcut ek şube hakkıyla yeni şube (ayrı organizasyon) açar, sonra o şubeye geçer. */
export function AddBranchForm({
  label,
  placeholder,
  submitLabel,
  errorText,
  successText,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  errorText: string;
  successText: string;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.org_id) {
        toast.error(data.error ?? errorText);
        setLoading(false);
        return;
      }
      // Yeni şubeye geç (mevcut işletme değiştirici ucu; üyelik orada doğrulanır).
      await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: data.org_id }),
      });
      toast.success(successText);
      // Tam yenileme: aktif işletme çerezi değişti, sunucu verisi baştan okunmalı.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard";
    } catch {
      toast.error(errorText);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="text-sm text-muted-foreground" htmlFor="branch-name">{label}</label>
      <div className="flex gap-2">
        <Input
          id="branch-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          maxLength={60}
          required
        />
        <button
          type="submit"
          disabled={loading || name.trim().length < 2}
          className="flex items-center justify-center gap-2 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Şube hesabından ana işletmeye geçer (üyelik /api/org/switch'te doğrulanır); plan işlemleri orada yapılır. */
export function SwitchToParentButton({ parentId, label, errorText }: { parentId: string; label: string; errorText: string }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: parentId }),
      });
      if (!res.ok) {
        toast.error(errorText);
        setLoading(false);
        return;
      }
      // Tam yenileme: aktif işletme çerezi değişti, sunucu verisi baştan okunmalı.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard/abonelik";
    } catch {
      toast.error(errorText);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}
