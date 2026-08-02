"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Eye, EyeOff, GripVertical, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveDashboardWidgetPrefs, type WidgetPref } from "@/app/actions/dashboard-widgets";

export interface DashboardWidget {
  key: string;
  label: string;
  /** Tailwind grid-span sınıfı, örn. "lg:col-span-4" — grid'in doğrudan çocuğunda kalmalı. */
  colSpanClass: string;
  node: React.ReactNode;
}

interface Props {
  orgId: string;
  widgets: DashboardWidget[];
  initialPrefs: WidgetPref[];
}

/**
 * Ana sayfa özet kutularının kişiselleştirilmesi (göster/gizle + sürükle-bırak sıralama).
 * Sunucu bileşeninden gelen hazır JSX'i (node) sadece düzenler/filtreler — veri çekmez.
 */
export function DashboardWidgetGrid({ orgId, widgets, initialPrefs }: Props) {
  const defaultOrder = widgets.map((w) => w.key);
  const savedOrder = initialPrefs.length
    ? [
        ...initialPrefs.map((p) => p.widget_key).filter((k) => defaultOrder.includes(k)),
        ...defaultOrder.filter((k) => !initialPrefs.some((p) => p.widget_key === k)),
      ]
    : defaultOrder;
  const savedVisible: Record<string, boolean> = Object.fromEntries(
    defaultOrder.map((k) => {
      const p = initialPrefs.find((p) => p.widget_key === k);
      return [k, p ? p.visible : true];
    })
  );

  const [order, setOrder] = useState<string[]>(savedOrder);
  const [visible, setVisible] = useState<Record<string, boolean>>(savedVisible);
  const [editMode, setEditMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dragKeyRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const widgetMap = new Map(widgets.map((w) => [w.key, w]));

  function handleDrop(targetKey: string) {
    const draggedKey = dragKeyRef.current;
    dragKeyRef.current = null;
    setDragOverKey(null);
    if (!draggedKey || draggedKey === targetKey) return;
    setOrder((prev) => {
      const next = prev.filter((k) => k !== draggedKey);
      next.splice(next.indexOf(targetKey), 0, draggedKey);
      return next;
    });
  }

  function toggleVisible(key: string) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    startTransition(async () => {
      const prefs: WidgetPref[] = order.map((key, i) => ({
        widget_key: key,
        visible: visible[key] ?? true,
        order_index: i,
      }));
      const res = await saveDashboardWidgetPrefs(orgId, prefs);
      if (res.error) {
        toast.error("Kaydedilemedi: " + res.error);
      } else {
        toast.success("Görünüm kaydedildi");
        setEditMode(false);
      }
    });
  }

  function handleCancel() {
    setOrder(savedOrder);
    setVisible(savedVisible);
    setEditMode(false);
  }

  const displayOrder = editMode ? order : order.filter((k) => visible[k] ?? true);

  return (
    <div className="space-y-2">
      <div className="flex justify-end px-1">
        {editMode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Vazgeç
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> Kaydet
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Kişiselleştir
          </button>
        )}
      </div>

      {editMode && (
        <p className="text-[11px] text-muted-foreground px-1">
          Kutuları sürükleyerek sırala, göz ikonuyla göster/gizle — bitince Kaydet&apos;e bas.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {displayOrder.map((key) => {
          const w = widgetMap.get(key);
          if (!w) return null;
          const isVisible = visible[key] ?? true;
          return (
            <div
              key={key}
              className={cn(
                "relative transition-opacity",
                w.colSpanClass,
                editMode && !isVisible && "opacity-40"
              )}
              draggable={editMode}
              onDragStart={() => { dragKeyRef.current = key; }}
              onDragOver={(e) => {
                if (!editMode) return;
                e.preventDefault();
                setDragOverKey(key);
              }}
              onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
              onDrop={(e) => {
                if (!editMode) return;
                e.preventDefault();
                handleDrop(key);
              }}
              style={
                editMode && dragOverKey === key
                  ? { outline: "2px dashed var(--primary)", outlineOffset: 2, borderRadius: 16 }
                  : undefined
              }
            >
              {editMode && (
                <div className="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-lg bg-card/95 border shadow-sm px-1.5 py-1 backdrop-blur-sm">
                  <span className="cursor-grab active:cursor-grabbing text-muted-foreground p-0.5" title="Sürükle">
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleVisible(key)}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    title={isVisible ? `${w.label} — gizle` : `${w.label} — göster`}
                  >
                    {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
              {w.node}
            </div>
          );
        })}
      </div>
    </div>
  );
}
