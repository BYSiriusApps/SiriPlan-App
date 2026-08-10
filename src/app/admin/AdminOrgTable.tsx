"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export interface AdminOrgRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  max_staff: number | null;
  max_appointments_monthly: number | null;
  created_at: string;
  member_count: number;
  staff_count: number;
  month_appointments: number;
}

const PLAN_BADGES: Record<string, string> = {
  trial: "bg-gray-500/15 text-gray-600 dark:text-gray-300",
  starter: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  pro: "bg-pink-500/15 text-pink-600 dark:text-pink-300",
  business: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  past_due: "Ödeme Gecikti",
  canceled: "İptal",
  paused: "Duraklatıldı",
};

export function AdminOrgTable({ orgs }: { orgs: AdminOrgRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminOrgRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plan: "trial",
    subscription_status: "active",
    max_staff: 3,
    max_appointments_monthly: 500,
    trial_ends_at: "",
  });

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      o.slug.toLowerCase().includes(query.toLowerCase()) ||
      (o.email ?? "").toLowerCase().includes(query.toLowerCase())
  );

  function openEdit(org: AdminOrgRow) {
    setForm({
      plan: org.plan,
      subscription_status: org.subscription_status,
      max_staff: org.max_staff ?? 3,
      max_appointments_monthly: org.max_appointments_monthly ?? 500,
      trial_ends_at: org.trial_ends_at ? org.trial_ends_at.slice(0, 10) : "",
    });
    setEditing(org);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orgs/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: form.plan,
          subscription_status: form.subscription_status,
          max_staff: Number(form.max_staff),
          max_appointments_monthly: Number(form.max_appointments_monthly),
          trial_ends_at: form.trial_ends_at ? new Date(form.trial_ends_at + "T23:59:59").toISOString() : null,
        }),
      });
      if (res.ok) {
        toast.success(`${editing.name} güncellendi`);
        setEditing(null);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Güncellenemedi");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Salonlar ({filtered.length})</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Salon, slug veya e-posta ara…"
            className="pl-9 h-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salon</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Kullanıcı</TableHead>
              <TableHead className="text-right">Personel (kota)</TableHead>
              <TableHead className="text-right">Bu Ay Randevu (kota)</TableHead>
              <TableHead>Kayıt</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">/{o.slug}{o.city ? ` · ${o.city}` : ""}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={PLAN_BADGES[o.plan] ?? ""}>{o.plan}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {STATUS_LABELS[o.subscription_status] ?? o.subscription_status}
                  {o.plan === "trial" && o.trial_ends_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Deneme bitişi: {format(new Date(o.trial_ends_at), "d MMM yyyy", { locale: tr })}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">{o.member_count}</TableCell>
                <TableCell className="text-right">
                  {o.staff_count} <span className="text-muted-foreground">/ {o.max_staff ?? "∞"}</span>
                </TableCell>
                <TableCell className="text-right">
                  {o.month_appointments}{" "}
                  <span className="text-muted-foreground">/ {o.max_appointments_monthly ?? "∞"}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(o.created_at), "d MMM yyyy", { locale: tr })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Salon bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.name} — Üyelik &amp; Kota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => v && setForm((f) => ({ ...f, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Abonelik Durumu</Label>
                <Select
                  value={form.subscription_status}
                  onValueChange={(v) => v && setForm((f) => ({ ...f, subscription_status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="past_due">Ödeme Gecikti</SelectItem>
                    <SelectItem value="canceled">İptal</SelectItem>
                    <SelectItem value="paused">Duraklatıldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Maks. Personel</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_staff}
                  onChange={(e) => setForm((f) => ({ ...f, max_staff: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Aylık Randevu Kotası</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_appointments_monthly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_appointments_monthly: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            {form.plan === "trial" && (
              <div className="space-y-1.5">
                <Label>Deneme Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={form.trial_ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, trial_ends_at: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Vazgeç
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
