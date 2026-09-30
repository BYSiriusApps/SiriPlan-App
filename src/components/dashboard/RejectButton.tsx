"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface RejectButtonProps {
  appointmentId: string;
  label: string;
}

/**
 * "talep" durumundaki bir randevuyu reddeder (status: "iptal") — aynı API
 * çağrısı bekleyen-istekler sayfasındaki handleTalepReject ile birebir aynı,
 * sadece ayrı bir yerde (ana sayfa) tek başına kullanılabilsin diye
 * ApproveButton'ın eşleniği olarak çıkarıldı.
 */
export function RejectButton({ appointmentId, label }: RejectButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard.apptActions");

  async function handleReject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "iptal" }),
      });
      if (res.ok) {
        toast.success(t("toastRejected"));
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || t("rejectFailed"));
      }
    } catch {
      toast.error(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleReject();
      }}
      disabled={loading}
      className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 disabled:opacity-50 flex items-center gap-1 transition-colors cursor-pointer"
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}
