"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { formatServicePrice } from "@/lib/currency";
import { maskPhone } from "@/lib/phone";
import Link from "next/link";
import { MessageCircle, Instagram, Calendar, Clock, Loader2, Check, X, Inbox, Package, AlertTriangle, CheckCircle2, AlertCircle, ListChecks, Pencil } from "lucide-react";
import { toast } from "sonner";

interface AppointmentRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_at: string;
  duration_minutes: number | null;
  price: number | null;
  note: string | null;
  source: string;
  staff: { full_name: string } | null;
  service: { name: string } | null;
}

const SOURCE_META: Record<string, { label: string; icon: typeof MessageCircle; className: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  instagram: { label: "Instagram", icon: Instagram, className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
};

interface CriticalStockItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock_alert: number;
  unit: string;
}

interface OverdueAppointment {
  id: string;
  customer_name: string;
  appointment_at: string;
  duration_minutes: number;
  price: number;
  staff_name: string | null;
  service_name: string | null;
  canAct: boolean;
}

export function BekleyenIsteklerClient({
  initialRequests,
  showPhone = true,
  criticalStock = [],
  overdueAppointments = [],
}: {
  initialRequests: AppointmentRequest[];
  showPhone?: boolean;
  criticalStock?: CriticalStockItem[];
  overdueAppointments?: OverdueAppointment[];
}) {
  const t = useTranslations("dashboard");
  const to = useTranslations("dashboard.overdueAppointments");
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [overdue, setOverdue] = useState(overdueAppointments);
  const [overdueBusyId, setOverdueBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function handleAction(id: string, action: "approve" | "reject") {
    setBusyId(id);
    const res = await fetch(`/api/appointment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(action === "approve" ? "Randevu onaylandı" : "Talep reddedildi");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "İşlem gerçekleştirilemedi");
    }
  }

  function toLocalInputValue(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEditing(r: AppointmentRequest) {
    setEditingId(r.id);
    setEditValue(toLocalInputValue(r.appointment_at));
  }

  async function handleReschedule(id: string) {
    if (!editValue) return;
    const iso = new Date(editValue).toISOString();
    setBusyId(id);
    const res = await fetch(`/api/appointment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", appointment_at: iso }),
    });
    setBusyId(null);
    if (res.ok) {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, appointment_at: iso } : r)));
      setEditingId(null);
      toast.success("Randevu talebi yeni saate taşındı");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Saat değiştirilemedi");
    }
  }

  async function handleOverdueAction(id: string, status: "tamamlandi" | "gelmedi" | "iptal") {
    setOverdueBusyId(id);
    const res =
      status === "tamamlandi"
        ? await fetch(`/api/appointments/${id}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
        : await fetch(`/api/appointments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
    setOverdueBusyId(null);
    if (res.ok) {
      setOverdue((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("statusUpdatedToast", { status: t(status === "tamamlandi" ? "markCompleted" : status === "gelmedi" ? "statusGelmedi" : "statusIptal") }));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || t("updateFailed"));
    }
  }

  async function handleMarkAllCompleted() {
    const actionable = overdue.filter((a) => a.canAct);
    if (actionable.length === 0) return;
    if (!window.confirm(to("markAllConfirm", { count: actionable.length }))) return;

    setMarkingAll(true);
    let done = 0;
    const failedIds: string[] = [];
    for (const a of actionable) {
      const res = await fetch(`/api/appointments/${a.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => null);
      if (res?.ok) {
        done++;
      } else {
        failedIds.push(a.id);
      }
    }
    setMarkingAll(false);
    setOverdue((prev) => prev.filter((a) => failedIds.includes(a.id) || !a.canAct));
    if (failedIds.length === 0) {
      toast.success(to("markAllDone", { done, total: actionable.length }));
    } else {
      toast.error(to("markAllFailed"));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("pendingRequestsPage.sourceLabel")}</span>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("pendingRequests")}</h1>
        </div>
        <HomeButton />
      </div>
      <p className="text-muted-foreground text-sm -mt-3">
        {t("pendingRequestsPage.subtitle")}
      </p>

      {criticalStock.length > 0 && (
        <Card className="border-0 shadow-none bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("homePage.criticalStockCount", { count: criticalStock.length })}
            </p>
            <div className="space-y-1.5">
              {criticalStock.map((i) => (
                <Link
                  key={i.id}
                  href="/dashboard/stok"
                  className="flex items-center justify-between gap-2 text-[13px] hover:opacity-80 transition-opacity"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Package className="h-3.5 w-3.5 text-amber-500 shrink-0" /> {i.name}
                  </span>
                  <span className="tabular-nums shrink-0 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                    {i.current_stock} {i.unit} / {i.min_stock_alert}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {overdue.length > 0 && (
        <Card className="border-0 shadow-none bg-orange-50/60 dark:bg-orange-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {to("title")} ({overdue.length})
                </p>
                <p className="text-xs text-muted-foreground mt-1">{to("subtitle")}</p>
              </div>
              {overdue.some((a) => a.canAct) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0 bg-background"
                  disabled={markingAll}
                  onClick={handleMarkAllCompleted}
                >
                  {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
                  {to("markAllBtn")}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {overdue.map((a) => {
                const busy = overdueBusyId === a.id;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 flex-wrap bg-background rounded-xl p-3 border border-orange-200/60 dark:border-orange-900/40"
                  >
                    <Link href={`/dashboard/randevular/${a.id}`} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
                      <p className="font-semibold text-sm truncate">{a.customer_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.appointment_at), "d MMMM yyyy, HH:mm", { locale: tr })}
                        </span>
                        {a.service_name && <span>{a.service_name}</span>}
                        {a.staff_name && <span>· {a.staff_name}</span>}
                        {a.price !== null && <span>· {formatServicePrice(a.price, undefined)}</span>}
                      </div>
                    </Link>
                    {a.canAct ? (
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={busy || markingAll}
                          onClick={() => handleOverdueAction(a.id, "tamamlandi")}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t("markCompleted")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                          disabled={busy || markingAll}
                          onClick={() => handleOverdueAction(a.id, "gelmedi")}
                        >
                          {t("statusGelmedi")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={busy || markingAll}
                          onClick={() => handleOverdueAction(a.id, "iptal")}
                        >
                          {t("cancelAction")}
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] shrink-0">{to("notAssigned")}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Bekleyen istek yok.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requests.map((r) => {
            const source = SOURCE_META[r.source] ?? SOURCE_META.whatsapp;
            const SourceIcon = source.icon;
            const busy = busyId === r.id;
            return (
              <Card key={r.id} className="kpi-tile border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.customer_name}</p>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${source.className}`}>
                          <SourceIcon className="h-3 w-3" /> {source.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{showPhone ? r.customer_phone : maskPhone(r.customer_phone)}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(r.appointment_at), "d MMMM yyyy, EEEE", { locale: tr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(r.appointment_at), "HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm mt-1.5">
                        <span className="font-medium">{r.service?.name ?? "—"}</span>
                        {r.staff?.full_name && <span className="text-muted-foreground"> · {r.staff.full_name}</span>}
                        {r.price !== null && <span className="text-muted-foreground"> · {formatServicePrice(r.price, undefined)}</span>}
                      </p>
                      {r.note && <p className="text-xs text-muted-foreground mt-1.5 italic">&quot;{r.note}&quot;</p>}
                    </div>
                    {editingId === r.id ? (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <input
                          type="datetime-local"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-xs border rounded-lg px-2 py-1.5 bg-background"
                        />
                        <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => handleReschedule(r.id)}>
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Kaydet
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditingId(null)}>
                          Vazgeç
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline" size="sm" className="gap-1.5"
                          disabled={busy} onClick={() => startEditing(r)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Düzenle
                        </Button>
                        <Button
                          variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          disabled={busy} onClick={() => handleAction(r.id, "reject")}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          Reddet
                        </Button>
                        <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => handleAction(r.id, "approve")}>
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Onayla
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
