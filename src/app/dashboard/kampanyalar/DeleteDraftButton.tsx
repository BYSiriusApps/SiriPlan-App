"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Kampanya geçmişindeki TASLAK satırlarında görünen silme düğmesi. Satır bir
 * <Link> içinde olduğu için tıklama navigasyonu tetiklemesin diye
 * preventDefault + stopPropagation kullanılır. Sunucu yalnızca taslağı
 * siler (DELETE /api/campaigns/[id]).
 */
export function DeleteDraftButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!window.confirm(t("campaignsPage.deleteDraftConfirm", { name }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert(t("campaignsPage.deleteDraftError"));
        return;
      }
      router.refresh();
    } catch {
      window.alert(t("campaignsPage.deleteDraftError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={t("campaignsPage.deleteDraft")}
      aria-label={t("campaignsPage.deleteDraft")}
      className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
