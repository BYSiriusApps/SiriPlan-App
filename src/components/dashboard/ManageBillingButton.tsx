"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Stripe Customer Portal'ı açar — fatura geçmişi, kart güncelleme, iptal oradan yapılır. */
export function ManageBillingButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Fatura yönetimi açılamadı.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Bağlantı hatası — tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border font-medium hover:bg-accent transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {label}
    </button>
  );
}
