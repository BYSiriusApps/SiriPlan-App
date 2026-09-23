"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Zaten ödeyen (aktif Stripe aboneliği olan) bir Starter kullanıcısının
 * Pro'ya geçişi. /auth/plan-sec'in aksine yeni bir Checkout Session açmaz —
 * /api/stripe/change-plan mevcut aboneliğin fiyat kalemini günceller,
 * kullanıcı iki kez ücretlendirilmez (bkz. o endpoint'in yorumu).
 */
export function UpgradeToProButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Yükseltme başarısız oldu.");
        return;
      }
      toast.success("Pro plana yükseltildiniz.");
      router.refresh();
    } catch {
      toast.error("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {label}
    </button>
  );
}
