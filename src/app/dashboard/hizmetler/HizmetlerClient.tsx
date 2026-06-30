"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Scissors, Clock, Star, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Service } from "@/types/database";

const CATEGORY_COLORS: Record<string, string> = {
  sac: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  cilt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  tirnak: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  kas: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  spa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  lazer: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  genel: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

interface Props {
  initialServices: Service[];
  canEdit: boolean;
}

export function HizmetlerClient({ initialServices, canEdit }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", price: "", duration_minutes: "" });

  function openEdit(svc: Service, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditTarget(svc);
    setEditForm({
      name: svc.name,
      price: String(svc.price),
      duration_minutes: String(svc.duration_minutes),
    });
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    const res = await fetch(`/api/services/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        price: parseFloat(editForm.price) || 0,
        duration_minutes: parseInt(editForm.duration_minutes) || editTarget.duration_minutes,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
      setEditTarget(null);
      toast.success("Hizmet güncellendi");
    } else {
      const d = await res.json();
      toast.error(d.error || "Güncellenemedi");
    }
  }

  const categories = [...new Set(services.map((s) => s.category_tag))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hizmetler</h1>
          <p className="text-muted-foreground text-sm">{services.length} hizmet</p>
        </div>
        <Link
          href="/dashboard/hizmetler/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Hizmet Ekle
        </Link>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 capitalize">
            {cat}
          </h2>
          <div className="space-y-2">
            {services
              .filter((s) => s.category_tag === cat)
              .map((service) => (
                <Card key={service.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{service.name}</p>
                          <Badge variant="outline" className={cn("text-[10px]", CATEGORY_COLORS[service.category_tag] || CATEGORY_COLORS.genel)}>
                            {service.category_tag}
                          </Badge>
                          {!service.is_active && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Pasif</Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm">₺{Number(service.price).toLocaleString("tr-TR")}</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes}dk
                          </p>
                          {service.contributes_loyalty && (
                            <p className="text-[10px] text-amber-600 flex items-center justify-end gap-0.5">
                              <Star className="h-3 w-3 fill-amber-500" />puan kazandırır
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            onClick={(e) => openEdit(service, e)}
                            title="Hızlı düzenle"
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Henüz hizmet eklenmemiş</p>
        </div>
      )}

      {/* Quick Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hızlı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Hizmet Adı</Label>
              <Input
                className="mt-1"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fiyat (₺)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <Label>Süre (dk)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="5"
                  step="5"
                  value={editForm.duration_minutes}
                  onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>
                İptal
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
