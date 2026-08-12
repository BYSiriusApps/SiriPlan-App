"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Props {
  customerId: string;
  birthDate: string | null;
}

export default function CustomerBirthDateEdit({ customerId, birthDate }: Props) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [saving, setSaving] = useState(false);

  async function handleChange(value: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth_date: value || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="flex items-center gap-1 cursor-pointer" title={t("changeBirthDateTitle")}>
      <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
      <input
        type="date"
        value={birthDate ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        title={t("changeBirthDateTitle")}
        className="h-6 text-[11px] rounded-md border border-input bg-background px-1.5 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
    </label>
  );
}
