"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ApproveButtonProps {
  appointmentId: string;
  label: string;
}

export function ApproveButton({ appointmentId, label }: ApproveButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard.apptActions");

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "onaylandi" }),
      });
      if (res.ok) {
        toast.success(t("toastApproved"));
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || t("approveFailed"));
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
        handleApprove();
      }}
      disabled={loading}
      className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1 transition-colors cursor-pointer"
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}
