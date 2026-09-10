"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Loader2, Minus, RotateCcw, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import type { CustomerPackage } from "@/types/database";

interface ServiceOpt {
  id: string;
  name: string;
}

interface Props {
  customerId: string;
  customerName: string;
  services: ServiceOpt[];
  currency: string;
}

const NO_SERVICE = "__none__";

export default function CustomerPackages({ customerId, customerName, services, currency }: Props) {
  const router = useRouter();
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [selling, setSelling] = useState(false);

  const [form, setForm] = useState({
    service_id: NO_SERVICE,
    name: "",
    total_sessions: "10",
    price_paid: "",
    payment_method: "nakit",
    expires_at: "",
    record_income: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/packages?customer_id=${customerId}&status=all`);
      const json = await res.json();
      setPackages(json.packages ?? []);
    } catch {
      /* sessiz */
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = packages.filter((p) => p.status === "active");
  const past = packages.filter((p) => p.status !== "active");

  async function sell(e: React.FormEvent) {
    e.preventDefault();
    const total = parseInt(form.total_sessions, 10);
    if (!form.name.trim() || !Number.isFinite(total) || total < 1) {
      toast.error("Paket adı ve seans sayısı gerekli");
      return;
    }
    setSelling(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          service_id: form.service_id === NO_SERVICE ? null : form.service_id,
          name: form.name.trim(),
          total_sessions: total,
          price_paid: parseFloat(form.price_paid) || 0,
          payment_method: form.payment_method,
          expires_at: form.expires_at || null,
          record_income: form.record_income,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Paket oluşturulamadı");
        return;
      }
      toast.success("Paket satıldı");
      setSellOpen(false);
      setForm((f) => ({ ...f, name: "", price_paid: "", expires_at: "" }));
      await load();
      router.refresh();
    } finally {
      setSelling(false);
    }
  }

  async function changeSession(pkg: CustomerPackage, revert: boolean) {
    setBusyId(pkg.id);
    try {
      const res = await fetch(`/api/packages/${pkg.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revert }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "İşlem başarısız");
        return;
      }
      toast.success(revert ? "Seans geri alındı" : `Seans düşüldü — kalan ${json.remaining}`);
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function cancelPackage(pkg: CustomerPackage) {
    if (!confirm(`"${pkg.name}" paketi iptal edilsin mi?`)) return;
    setBusyId(pkg.id);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "İptal edilemedi");
        return;
      }
      toast.success("Paket iptal edildi");
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="kpi-tile border-0 shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Package className="h-4 w-4 text-violet-500" />
          Paketler
        </CardTitle>
        <Dialog open={sellOpen} onOpenChange={setSellOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 gap-1 text-xs" />}>
            <Plus className="h-3.5 w-3.5" />
            Paket Sat
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{customerName} — Yeni Paket</DialogTitle>
            </DialogHeader>
            <form onSubmit={sell} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Hizmet (opsiyonel)</Label>
                <Select
                  value={form.service_id}
                  onValueChange={(v) => {
                    const svc = services.find((s) => s.id === v);
                    setForm((f) => ({
                      ...f,
                      service_id: v ?? NO_SERVICE,
                      name: f.name || (svc ? `${f.total_sessions} Seans ${svc.name}` : f.name),
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Hizmete bağlama" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SERVICE}>Hizmete bağlı değil</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Hizmet seçilirse o hizmetin randevusu tamamlanınca seans otomatik düşer.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Paket adı</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="10 Seans Ağda"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Seans</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.total_sessions}
                    onChange={(e) => setForm((f) => ({ ...f, total_sessions: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Ödenen tutar</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.price_paid}
                    onChange={(e) => setForm((f) => ({ ...f, price_paid: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ödeme yöntemi</Label>
                  <Select value={form.payment_method} onValueChange={(v) => v && setForm((f) => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nakit">Nakit</SelectItem>
                      <SelectItem value="kart">Kart</SelectItem>
                      <SelectItem value="havale">Havale</SelectItem>
                      <SelectItem value="diger">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Son kullanma (opsiyonel)</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.record_income}
                  onChange={(e) => setForm((f) => ({ ...f, record_income: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                />
                <span>
                  Gelir-Gider&apos;e &ldquo;Paket / Seans Satışı&rdquo; geliri olarak işle.
                  Paketten düşen randevular ₺0 kapanır, ciro iki kez saymaz.
                </span>
              </label>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1" disabled={selling}>
                  {selling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Paketi Kaydet
                </Button>
                <DialogClose render={<Button type="button" variant="outline" />}>Vazgeç</DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : active.length === 0 && past.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Bu müşteride paket yok. &ldquo;Paket Sat&rdquo; ile peşin seans paketi tanımlayın.
          </p>
        ) : (
          <>
            {active.map((pkg) => {
              const remaining = pkg.total_sessions - pkg.used_sessions;
              return (
                <div key={pkg.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pkg.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {pkg.service?.name ?? "Hizmete bağlı değil"}
                        {pkg.expires_at ? ` · son ${new Date(pkg.expires_at).toLocaleDateString("tr-TR")}` : ""}
                        {Number(pkg.price_paid) > 0 ? ` · ${formatMoney(Number(pkg.price_paid), currency)}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 tabular-nums",
                        remaining <= 1 ? "border-amber-300 text-amber-700 dark:text-amber-400" : "",
                      )}
                    >
                      {remaining} / {pkg.total_sessions} kaldı
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: pkg.total_sessions }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 h-2.5 rounded-full",
                          i < pkg.used_sessions ? "bg-violet-500" : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={busyId === pkg.id || remaining <= 0}
                      onClick={() => changeSession(pkg, false)}
                    >
                      {busyId === pkg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
                      Seans düş
                    </Button>
                    {pkg.used_sessions > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-muted-foreground"
                        disabled={busyId === pkg.id}
                        onClick={() => changeSession(pkg, true)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Geri al
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs text-muted-foreground ml-auto hover:text-red-600"
                      disabled={busyId === pkg.id}
                      onClick={() => cancelPackage(pkg)}
                    >
                      <Ban className="h-3 w-3" />
                      İptal
                    </Button>
                  </div>
                </div>
              );
            })}

            {past.length > 0 && (
              <div className="pt-1 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Geçmiş paketler</p>
                {past.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="truncate">{pkg.name}</span>
                    <span className="shrink-0">
                      {pkg.status === "completed" ? "tamamlandı" : pkg.status === "cancelled" ? "iptal" : "süresi doldu"} ·{" "}
                      {pkg.used_sessions}/{pkg.total_sessions}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
