"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

interface Props {
  customerId: string;
  preferredLanguage: string | null;
}

export default function CustomerLanguageSelect({ customerId, preferredLanguage }: Props) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [saving, setSaving] = useState(false);

  async function handleChange(value: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_language: value || null }),
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
    <select
      value={preferredLanguage ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="h-6 text-[11px] rounded-md border border-input bg-background px-1.5 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      <option value="">{t("noLanguage")}</option>
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.name}
        </option>
      ))}
    </select>
  );
}
