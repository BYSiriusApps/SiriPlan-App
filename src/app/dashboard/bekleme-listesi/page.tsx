"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { toast } from "sonner";
import { ListPlus, Plus, Trash2, Loader2, Clock, Bell, CalendarPlus, Users } from "lucide-react";
import type { Staff, Service } from "@/types/database";

type WaitlistEntry = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string | null;
  staff_id: string | null;
  preferred_dates: string[];
  status: "waiting" | "notified" | "booked" | "expired";
  requested_at: string;
  service: { name: string } | null;
  staff: { full_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  waiting: "Bekliyor",
  notified: "Bilgilendirildi",
  booked: "Randevu Alındı",
  expired: "Süresi Doldu",
};

const STATUS_COLOR: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
  notified: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
  booked: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
  expired: "bg-muted text-muted-foreground border-border",
};

const EMPTY_FORM = {
  customer_name: "",
  customer_phone: "",
  service_id: "",
  staff_id: "",
  preferred_dates: "",
};

export default function BeklemeListesiPage() {
  const t = useTranslations("dashboard");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<"active" | "all">("active");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/waitlist");
    if (res.ok) {
      const d = await res.json();
      setEntries(d.waitlist || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([staffData, servicesData]) => {
      setStaff(staffData.staff || []);
      setServices(servicesData.services || []);
    });
  }, [fetchData]);

  const visible = entries.filter((e) => filterStatus === "all" || (e.status === "waiting" || e.status === "notified"));

  async function handleSave() {
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Ad ve telefon zorunlu");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        service_id: form.service_id || undefined,
        staff_id: form.staff_id || undefined,
        preferred_dates: form.preferred_dates
          ? form.preferred_dates.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Bekleme listesine eklendi");
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchData();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "Eklenemedi");
    }
  }

  async function updateStatus(id: string, status: WaitlistEntry["status"]) {
    const res = await fetch(`/api/waitlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("Durum güncellendi");
      fetchData();
    } else {
      toast.error("Güncellenemedi");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Kayıt silindi");
      fetchData();
    } else {
      toast.error("Silinemedi");
    }
  }

  function bookingHref(e: WaitlistEntry) {
    const params = new URLSearchParams({
      customer_name: e.customer_name,
      customer_phone: e.customer_phone,
      from_waitlist: e.id,
    });
    if (e.staff_id) params.set("staff_id", e.staff_id);
    if (e.service_id) params.set("service_id", e.service_id);
    return `/dashboard/randevular/yeni?${params.toString()}`;
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("waitlistPage.eyebrow")}</span>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("waitlist")}</h1>
            <HomeButton />
          </div>
          <p className="text-muted-foreground text-sm">{t("waitlistPage.subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          {t("waitlistPage.addButton")}
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-full bg-muted w-fit">
        {(["active", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterStatus(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
            }`}
          >
            {v === "active" ? t("waitlistPage.filterActive") : t("waitlistPage.filterAll")}
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ListPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("waitlistPage.emptyState")}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
                {t("waitlistPage.addFirstEntry")}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {visible.map((e) => (
                <div key={e.id} className="data-row grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-center gap-3 px-3 py-3 rounded-lg transition-colors group">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium leading-tight">{e.customer_name}</p>
                      <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_COLOR[e.status]}`}>
                        {STATUS_LABEL[e.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.customer_phone}
                      {e.service?.name && ` · ${e.service.name}`}
                      {e.staff?.full_name && ` · ${e.staff.full_name}`}
                    </p>
                    {e.preferred_dates?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Tercih: {e.preferred_dates.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {e.status !== "booked" && e.status !== "expired" && (
                      <>
                        {e.status === "waiting" && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => updateStatus(e.id, "notified")}>
                            <Bell className="h-3.5 w-3.5" />
                            Bilgilendirdim
                          </Button>
                        )}
                        <Link href={bookingHref(e)}>
                          <Button size="sm" className="gap-1.5 text-xs h-8">
                            <CalendarPlus className="h-3.5 w-3.5" />
                            Randevu Oluştur
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-muted-foreground" onClick={() => updateStatus(e.id, "expired")}>
                          Vazgeçti
                        </Button>
                      </>
                    )}
                    <button
                      title="Sil"
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Bekleme Listesine Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Ad Soyad *</Label>
              <Input className="mt-1" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} placeholder="Müşteri adı" />
            </div>
            <div>
              <Label>Telefon *</Label>
              <Input className="mt-1" type="tel" value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} placeholder="5xx xxx xx xx" />
            </div>
            <div>
              <Label>Hizmet (opsiyonel)</Label>
              <Select value={form.service_id} onValueChange={(v) => setForm((f) => ({ ...f, service_id: v ?? "" }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Farketmez" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Personel (opsiyonel)</Label>
              <Select value={form.staff_id} onValueChange={(v) => setForm((f) => ({ ...f, staff_id: v ?? "" }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Farketmez" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tercih Edilen Tarih/Saat (opsiyonel)</Label>
              <Input className="mt-1" value={form.preferred_dates} onChange={(e) => setForm((f) => ({ ...f, preferred_dates: e.target.value }))} placeholder="Örn: Cumartesi öğleden sonra, virgülle ayırın" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>İptal</Button>
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
