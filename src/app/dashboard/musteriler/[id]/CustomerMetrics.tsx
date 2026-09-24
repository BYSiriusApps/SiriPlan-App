"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getFieldCatalog, type CustomFieldDef } from "@/lib/customer-fields/catalog";
import type { CustomerMetric } from "@/types/database";

interface Props {
  customerId: string;
  businessType: string | null | undefined;
}

function MetricBlock({ customerId, def }: { customerId: string; def: CustomFieldDef }) {
  const [entries, setEntries] = useState<CustomerMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/metrics?metric_key=${def.key}&limit=5`);
      const data = await res.json();
      if (res.ok) setEntries(data.metrics ?? []);
    } finally {
      setLoading(false);
    }
  }, [customerId, def.key]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitAdd() {
    const value = Number(draft);
    if (!Number.isFinite(value)) {
      toast.error("Geçerli bir değer girin");
      return;
    }
    try {
      const res = await fetch(`/api/customers/${customerId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric_key: def.key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      setDraft("");
      setAdding(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const latest = entries[0];
  const prev = entries[1];
  const delta = latest && prev ? Number(latest.value) - Number(prev.value) : null;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-muted-foreground text-xs w-32 shrink-0 flex items-center gap-1">
        {def.icon && <span aria-hidden>{def.icon}</span>}
        {def.label}
      </span>

      {loading ? (
        <span className="text-xs text-muted-foreground">Yükleniyor…</span>
      ) : latest ? (
        <>
          <span className="font-bold text-sm tabular-nums">
            {Number(latest.value).toLocaleString("tr-TR")} {def.unit}
          </span>
          {delta !== null && Math.abs(delta) > 0.001 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                delta < 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              )}
            >
              {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {def.unit}
            </span>
          )}
          {delta === null && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Minus className="h-3 w-3" /> tek kayıt
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Henüz kayıt yok</span>
      )}

      <div className="ml-auto">
        {adding ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              placeholder={def.unit}
              className="h-7 w-20 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={submitAdd}
              className="h-7 px-2 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              Kaydet
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="h-7 px-2 text-xs rounded-md border border-input hover:bg-accent inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Değer Ekle
          </button>
        )}
      </div>
    </div>
  );
}

export default function CustomerMetrics({ customerId, businessType }: Props) {
  const trackable = getFieldCatalog(businessType).filter((f) => f.trackHistory);
  if (trackable.length === 0) return null;

  return (
    <Card className="kpi-tile border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ölçüm Takibi</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {trackable.map((def) => (
          <MetricBlock key={def.key} customerId={customerId} def={def} />
        ))}
      </CardContent>
    </Card>
  );
}
