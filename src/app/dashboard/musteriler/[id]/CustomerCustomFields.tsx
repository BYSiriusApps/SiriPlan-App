"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getFieldCatalog,
  BADGE_COLOR_CLASS,
  type CustomFieldDef,
} from "@/lib/customer-fields/catalog";

interface Props {
  customerId: string;
  businessType: string | null | undefined;
  customFields: Record<string, string | number>;
}

async function saveField(customerId: string, key: string, value: string | number | null) {
  const res = await fetch(`/api/customers/${customerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ custom_fields: { [key]: value } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
}

function FieldRow({
  def,
  customerId,
  value,
  onSaved,
}: {
  def: CustomFieldDef;
  customerId: string;
  value: string | number | undefined;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  async function commit(next: string | number | null) {
    setSaving(true);
    try {
      await saveField(customerId, def.key, next);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground text-xs w-32 shrink-0 flex items-center gap-1">
        {def.icon && <span aria-hidden>{def.icon}</span>}
        {def.label}
      </span>

      {def.type === "select" ? (
        <select
          value={value ?? ""}
          disabled={saving}
          onChange={(e) => commit(e.target.value || null)}
          className={cn(
            "h-7 text-xs rounded-full border px-2.5 font-medium focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50",
            value && def.options?.find((o) => o.value === value)?.color
              ? BADGE_COLOR_CLASS[def.options.find((o) => o.value === value)!.color!]
              : "bg-muted text-muted-foreground border-transparent"
          )}
        >
          <option value="">Belirtilmedi</option>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : def.type === "date" ? (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          disabled={saving}
          onChange={(e) => commit(e.target.value || null)}
          className="h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
      ) : (
        <input
          type={def.type === "number" ? "number" : "text"}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (String(value ?? "") === draft) return;
            const next = def.type === "number" ? (draft === "" ? null : Number(draft)) : draft || null;
            commit(next);
          }}
          placeholder="—"
          className="h-7 text-xs rounded-md border border-input bg-background px-2 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
      )}
      {def.unit && <span className="text-xs text-muted-foreground">{def.unit}</span>}
    </div>
  );
}

export default function CustomerCustomFields({ customerId, businessType, customFields }: Props) {
  const router = useRouter();
  const catalog = getFieldCatalog(businessType);
  // trackHistory alanları ayrı CustomerMetrics kartında gösteriliyor.
  const fields = catalog.filter((f) => !f.trackHistory);

  if (fields.length === 0) return null;

  return (
    <Card className="kpi-tile border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Sektöre Özel Bilgiler</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {fields.map((def) => (
          <FieldRow
            key={def.key}
            def={def}
            customerId={customerId}
            value={customFields?.[def.key]}
            onSaved={() => router.refresh()}
          />
        ))}
      </CardContent>
    </Card>
  );
}
