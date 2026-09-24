"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { PlanKey } from "@/lib/stripe/config";

/**
 * Zaten ödeyen (aktif Stripe aboneliği olan) bir Starter/Pro/Business
 * kullanıcısının başka bir ücretli plana geçişi — yön fark etmez (yükselt/
 * düşür). /auth/plan-sec'in aksine yeni bir Checkout Session açmaz —
 * /api/stripe/change-plan mevcut aboneliğin fiyat kalemini günceller,
 * kullanıcı iki kez ücretlendirilmez (bkz. o endpoint'in yorumu).
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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        toast.error(data.error || "Plan değişikliği başarısız oldu.");
        return;
      }
      toast.success(`${planName} plana geçtiniz.`);
      router.refresh();
    } catch {
      toast.error("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  const Icon = variant === "primary" ? Sparkles : ArrowRightLeft;
  const className =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-border hover:bg-accent";

  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}
