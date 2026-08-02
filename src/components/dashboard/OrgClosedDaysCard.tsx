"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarX, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { StaffTimeOff } from "@/types/database";

/** İşletme geneli kapalı gün yönetimi (resmi tatil vb.) — staff_id NULL kayıtlar. */
export function OrgClosedDaysCard() {
  const [days, setDays] = useState<StaffTimeOff[]>([]);
  const [form, setForm] = useState({ starts_on: "", ends_on: "", reason: "" });
  const [adding, setAdding] = useState(false);

  function load() {
    fetch("/api/staff-time-off")
      .then((r) => r.json())
      .then((d) => setDays((d.time_off ?? []).filter((t: StaffTimeOff) => t.staff_id === null)))
      .catch(() => {});
  }
  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.starts_on || !form.ends_on) return toast.error("Tarih aralığı zorunlu");
    setAdding(true);
    const res = await fetch("/api/staff-time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: null, ...form }),
    });
    setAdding(false);
    if (res.ok) {
      setForm({ starts_on: "", ends_on: "", reason: "" });
      load();
      toast.success("Kapalı gün eklendi");
    } else {
      const err = await res.json();
      toast.error(err.error || "Eklenemedi");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/staff-time-off/${id}`, { method: "DELETE" });
    if (res.ok) setDays((prev) => prev.filter((d) => d.id !== id));
    else toast.error("Silinemedi");
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarX className="h-4 w-4 text-primary" />
          İşletme Geneli Kapalı Günler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground -mt-1">
          Resmi tatil gibi tüm personeli etkileyen kapalı günler. Bu tarihlerde hiçbir personel için online randevu alınamaz.
        </p>

        {days.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <span key={d.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted">
                {format(new Date(d.starts_on + "T12:00:00"), "d MMM", { locale: tr })}
                {d.ends_on !== d.starts_on && ` – ${format(new Date(d.ends_on + "T12:00:00"), "d MMM", { locale: tr })}`}
                {d.reason ? ` · ${d.reason}` : ""}
                <button type="button" onClick={() => handleDelete(d.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Başlangıç</Label>
            <Input type="date" value={form.starts_on} onChange={(e) => setForm((f) => ({ ...f, starts_on: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bitiş</Label>
            <Input type="date" value={form.ends_on} onChange={(e) => setForm((f) => ({ ...f, ends_on: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Not (opsiyonel)</Label>
            <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Resmi tatil..." />
          </div>
          <Button type="submit" size="sm" variant="outline" className="col-span-2" disabled={adding}>
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Kapalı Gün Ekle
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
