"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { PlanKey } from "@/lib/stripe/config";
import { tm } from "@/lib/toast-i18n";
import { useTranslations } from "next-intl";

type Preview = {
  isUpgrade: boolean;
  interval: string;
  currency: string;
  amountDue: number;
};

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * Zaten ödeyen (aktif Stripe aboneliği olan) bir Starter/Pro/Business
 * kullanıcısının başka bir ücretli plana geçişi — yön fark etmez (yükselt/
 * düşür). /auth/plan-sec'in aksine yeni bir Checkout Session açmaz —
 * /api/stripe/change-plan mevcut aboneliğin fiyat kalemini günceller,
 * kullanıcı iki kez ücretlendirilmez (bkz. o endpoint'in yorumu).
 *
 * Tıklayınca önce /api/stripe/change-plan/preview ile tahsil edilecek tutar
 * gösterilir; kullanıcı onaylayınca gerçek değişiklik yapılır.
 */
export function ChangePlanButton({
  targetPlan,
  planName,
  label,
  variant = "primary",
}: {
  targetPlan: PlanKey;
  planName: string;
  label: string;
  variant?: "primary" | "outline";
}) {
  const tp = useTranslations("panelPages.planDegistir");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const router = useRouter();

  async function handlePreview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/change-plan/preview?plan=${targetPlan}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || tp("tutar_hesaplanamadi"));
        return;
      }
      setPreview(data as Preview);
    } catch {
      toast.error(tm("conn"));
    } finally {
      setLoading(false);
    }
  }

  async function handleChange() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || tp("plan_degisikligi_basarisiz_o"));
        return;
      }
      toast.success(tm("planSwitched", { plan: planName }));
      setPreview(null);
      router.refresh();
    } catch {
      toast.error(tm("conn"));
    } finally {
      setLoading(false);
    }
  }

  const Icon = variant === "primary" ? Sparkles : ArrowRightLeft;
  const className =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-border hover:bg-accent";

  if (preview) {
    const isYear = preview.interval === "year";
    const period = isYear ? tp("period_year") : tp("period_month");
    const periodAdj = isYear ? tp("period_year_adj") : tp("period_month_adj");
    const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
    const pays = preview.amountDue > 0;
    return (
      <div className="rounded-xl border border-border p-4 space-y-3 text-sm">
        <p className="font-semibold">{tp("switch_title", { planName })}</p>
        {pays ? (
          <p>
            {preview.isUpgrade
              ? tp.rich("pay_now_upgrade", { amount: money(preview.amountDue, preview.currency), planName, period, periodAdj, b: bold })
              : tp.rich("pay_now_same_cycle", { amount: money(preview.amountDue, preview.currency), b: bold })}
          </p>
        ) : (
          <p>
            {tp("no_charge_credit", { amount: money(Math.abs(preview.amountDue), preview.currency) })}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleChange}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {pays ? tp("confirm_and_pay", { amount: money(preview.amountDue, preview.currency) }) : tp("onayla")}
          </button>
          <button
            type="button"
            onClick={() => setPreview(null)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-border hover:bg-accent disabled:opacity-50"
          >
            {tp("vazgec")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePreview}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}
