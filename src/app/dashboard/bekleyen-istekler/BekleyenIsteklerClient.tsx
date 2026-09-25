"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { DateTimeSlotPicker } from "@/components/dashboard/DateTimeSlotPicker";
import { formatServicePrice } from "@/lib/currency";
import { maskPhone } from "@/lib/phone";
import { waMessageLink } from "@/lib/wa-template";
import Link from "next/link";
import { MessageCircle, Instagram, Calendar, Clock, Loader2, Check, X, Inbox, Package, AlertTriangle, CheckCircle2, AlertCircle, ListChecks, Pencil, Phone, CalendarClock, Globe } from "lucide-react";
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
  staff_id: string | null;
  staff: { full_name: string } | null;
  service: { name: string } | null;
  proposed_status?: "none" | "pending" | "accepted" | "rejected";
  proposed_appointment_at?: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface TalepAppointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_at: string;
  duration_minutes: number | null;
  price: number | null;
  note: string | null;
  staff_id: string | null;
  staff: { full_name: string } | null;
  service: { name: string } | null;
  proposed_status?: "none" | "pending" | "accepted" | "rejected";
  proposed_appointment_at?: string | null;
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

interface MissingPhoneAppointment {
  id: string;
  customer_name: string;
  appointment_at: string;
  staff_name: string | null;
  service_name: string | null;
}

export function BekleyenIsteklerClient({
  initialRequests,
  initialTalepAppointments = [],
  showPhone = true,
  bookingSlotMinutes = 15,
  criticalStock = [],
  overdueAppointments = [],
  missingPhone = [],
  staffOptions = [],
  canReassignStaff = false,
}: {
  initialRequests: AppointmentRequest[];
  initialTalepAppointments?: TalepAppointment[];
  showPhone?: boolean;
  bookingSlotMinutes?: number;
  criticalStock?: CriticalStockItem[];
  overdueAppointments?: OverdueAppointment[];
  missingPhone?: MissingPhoneAppointment[];
  staffOptions?: StaffOption[];
  canReassignStaff?: boolean;
}) {
  const t = useTranslations("dashboard");
  const to = useTranslations("dashboard.overdueAppointments");
  const tp = useTranslations("dashboard.missingPhone");
  const locale = useLocale();
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [overdue, setOverdue] = useState(overdueAppointments);
  const [overdueBusyId, setOverdueBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [phoneMissing, setPhoneMissing] = useState(missingPhone);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [phoneSavingId, setPhoneSavingId] = useState<string | null>(null);
  const [talepAppts, setTalepAppts] = useState(initialTalepAppointments);
  const [talepBusyId, setTalepBusyId] = useState<string | null>(null);
  const [talepEditingId, setTalepEditingId] = useState<string | null>(null);
  const [talepEditValue, setTalepEditValue] = useState("");

  async function handleTalepApprove(id: string) {
    setTalepBusyId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "onaylandi" }),
    });
    setTalepBusyId(null);
    if (res.ok) {
      setTalepAppts((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("apptActions.toastApprovedNotifying"));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || t("apptActions.approveFailed"));
    }
  }

  async function handleTalepReject(id: string) {
    setTalepBusyId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "iptal" }),
    });
    setTalepBusyId(null);
    if (res.ok) {
      setTalepAppts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Randevu talebi iptal edildi");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "İptal edilemedi");
    }
  }

  function startTalepProposing(a: TalepAppointment) {
    setTalepEditingId(a.id);
    setTalepEditValue(toLocalInputValue(a.appointment_at));
  }

  async function handleTalepPropose(id: string) {
    if (!talepEditValue) return;
    const iso = new Date(talepEditValue).toISOString();
    setTalepBusyId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "propose", appointment_at: iso }),
    });
    setTalepBusyId(null);
    if (res.ok) {
      setTalepAppts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, proposed_status: "pending", proposed_appointment_at: iso } : a))
      );
      setTalepEditingId(null);
      toast.success("Yeni saat önerildi, müşteri cevabı bekleniyor");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Öneri gönderilemedi");
    }
  }

  async function handleTalepReassign(id: string, staffId: string) {
    setTalepBusyId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reassign_staff", staff_id: staffId }),
    });
    setTalepBusyId(null);
    if (res.ok) {
      const staffName = staffOptions.find((s) => s.id === staffId)?.full_name ?? "";
      setTalepAppts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, staff_id: staffId, staff: { full_name: staffName } } : a))
      );
      toast.success("Personel değiştirildi");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Personel değiştirilemedi");
    }
  }

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

  async function handleReassign(id: string, staffId: string) {
    setBusyId(id);
    const res = await fetch(`/api/appointment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reassign_staff", staff_id: staffId }),
    });
    setBusyId(null);
    if (res.ok) {
      const staffName = staffOptions.find((s) => s.id === staffId)?.full_name ?? "";
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, staff_id: staffId, staff: { full_name: staffName } } : r))
      );
      toast.success("Personel değiştirildi");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Personel değiştirilemedi");
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

  async function handlePropose(id: string) {
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
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, proposed_status: "pending", proposed_appointment_at: iso } : r))
      );
      setEditingId(null);
      toast.success("Yeni saat önerildi, müşteri cevabı bekleniyor");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Öneri gönderilemedi");
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

  async function handleSavePhone(id: string) {
    const value = (phoneDrafts[id] ?? "").trim();
    if (!value) return;
    setPhoneSavingId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_phone: value }),
    });
    setPhoneSavingId(null);
    if (res.ok) {
      setPhoneMissing((prev) => prev.filter((a) => a.id !== id));
      setPhoneDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(tp("savedToast"));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || tp("saveFailedToast"));
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

      {phoneMissing.length > 0 && (
        <Card className="border-0 shadow-none bg-sky-50/60 dark:bg-sky-950/20">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0" />
                {tp("title")} ({phoneMissing.length})
              </p>
              <p className="text-xs text-muted-foreground mt-1">{tp("subtitle")}</p>
            </div>
            <div className="space-y-2">
              {phoneMissing.map((a) => {
                const saving = phoneSavingId === a.id;
                return (
                  <div
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background rounded-xl p-3 border border-sky-200/60 dark:border-sky-900/40"
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
                      </div>
                    </Link>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0">
                      <Input
                        type="tel"
                        value={phoneDrafts[a.id] ?? ""}
                        onChange={(e) => setPhoneDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        placeholder={tp("placeholder")}
                        className="h-9 text-sm sm:w-40"
                      />
                      <Button
                        size="sm"
                        disabled={saving || !(phoneDrafts[a.id] ?? "").trim()}
                        onClick={() => handleSavePhone(a.id)}
                        className="shrink-0 gap-1"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        {tp("saveButton")}
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background rounded-xl p-3 border border-orange-200/60 dark:border-orange-900/40"
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
                        {a.price !== null && <span>· {formatServicePrice(a.price, undefined, locale)}</span>}
                      </div>
                    </Link>
                    {a.canAct ? (
                      <div className="flex gap-1.5 flex-wrap w-full sm:w-auto shrink-0">
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

      {(requests.length > 0 || talepAppts.length > 0) && (
        <div className="flex items-center gap-2 pt-1">
          <Inbox className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
            {t("pendingRequestsPage.channelRequestsHeading")} ({requests.length + talepAppts.length})
          </h2>
        </div>
      )}

      {talepAppts.length > 0 && (
        <Card className="border-0 shadow-none bg-rose-50/60 dark:bg-rose-950/20">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 shrink-0" />
                Randevu Linkinden Gelen Talepler ({talepAppts.length})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Otomatik onay kapalı olduğu için bu randevular takvimde &quot;bekliyor&quot; görünüyor, onayınızı bekliyor.
              </p>
            </div>
            <div className="space-y-2.5">
              {talepAppts.map((a) => {
                const busy = talepBusyId === a.id;
                return (
                  <Card key={a.id} className="kpi-tile border-0 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/dashboard/musteriler?q=${encodeURIComponent(a.customer_phone || a.customer_name)}`}
                              className="font-semibold text-sm hover:text-primary hover:underline transition-colors"
                            >
                              {a.customer_name}
                            </Link>
                            <Badge variant="outline" className="text-[10px] gap-1 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                              <Globe className="h-3 w-3" /> Randevu Linki
                            </Badge>
                          </div>
                          {showPhone ? (
                            <a
                              href={waMessageLink(a.customer_phone, "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 hover:underline transition-colors mt-1"
                            >
                              <MessageCircle className="h-3 w-3" /> {a.customer_phone}
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">{maskPhone(a.customer_phone)}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(a.appointment_at), "d MMMM yyyy, EEEE", { locale: tr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(a.appointment_at), "HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{a.service?.name ?? "—"}</span>
                            {canReassignStaff && staffOptions.length > 0 ? (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <Select
                                  value={a.staff_id ?? undefined}
                                  onValueChange={(v) => v && v !== a.staff_id && handleTalepReassign(a.id, v)}
                                  disabled={talepBusyId === a.id}
                                >
                                  <SelectTrigger size="sm" className="h-6 text-xs px-2 py-0 w-auto min-w-[7rem] border-none bg-transparent shadow-none hover:bg-muted/60">
                                    <SelectValue placeholder="Personel seç">
                                      {(value: string) => staffOptions.find((s) => s.id === value)?.full_name || "Personel seç"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {staffOptions.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            ) : (
                              a.staff?.full_name && <span className="text-muted-foreground"> · {a.staff.full_name}</span>
                            )}
                            {a.price !== null && <span className="text-muted-foreground"> · {formatServicePrice(a.price, undefined, locale)}</span>}
                          </p>
                          {a.note && <p className="text-xs text-muted-foreground mt-1.5 italic">&quot;{a.note}&quot;</p>}
                          {a.proposed_status === "pending" && a.proposed_appointment_at && (
                            <Badge variant="outline" className="mt-2 text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
                              {t("proposalPendingBadge", { datetime: format(new Date(a.proposed_appointment_at), "d MMM HH:mm", { locale: tr }) })}
                            </Badge>
                          )}
                          {a.proposed_status === "rejected" && (
                            <Badge variant="outline" className="mt-2 text-[10px] gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                              {t("proposalRejectedBadge")}
                            </Badge>
                          )}
                        </div>
                        {talepEditingId === a.id ? (
                          <div className="flex flex-col gap-2.5 w-full sm:w-80 sm:shrink-0 rounded-xl border bg-muted/30 p-3">
                            <DateTimeSlotPicker
                              value={talepEditValue}
                              onChange={setTalepEditValue}
                              minDate={new Date().toISOString().slice(0, 10)}
                              slotMinutes={bookingSlotMinutes}
                            />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Button size="lg" className="gap-1.5 w-full h-12 text-base justify-center sm:h-9 sm:text-xs sm:flex-1" disabled={busy} onClick={() => handleTalepPropose(a.id)}>
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {t("proposeSubmit")}
                              </Button>
                              <Button size="lg" variant="outline" className="w-full h-12 text-base justify-center sm:w-auto sm:h-9 sm:text-xs" disabled={busy} onClick={() => setTalepEditingId(null)}>
                                {t("rescheduleCancelButton")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full sm:w-auto sm:shrink-0">
                            {canReassignStaff && !a.staff_id && staffOptions.length > 0 && (
                              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                                <span className="text-xs text-amber-800 dark:text-amber-400 shrink-0">Personel farketmez —</span>
                                <Select
                                  onValueChange={(v: string | null) => v && handleTalepReassign(a.id, v)}
                                  disabled={busy}
                                >
                                  <SelectTrigger size="sm" className="h-8 text-xs flex-1 min-w-0 bg-background">
                                    <SelectValue placeholder="Personel ata">
                                      {(value: string) => staffOptions.find((s) => s.id === value)?.full_name || "Personel ata"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {staffOptions.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap">
                              <Button
                                size="lg" className="gap-1.5 w-full h-12 text-base justify-center bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto sm:h-9 sm:text-xs"
                                disabled={busy} onClick={() => handleTalepApprove(a.id)}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {t("approve")}
                              </Button>
                              <Button
                                variant="outline" size="lg"
                                className="gap-1.5 w-full h-12 text-base justify-center border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 sm:w-auto sm:h-9 sm:text-xs"
                                disabled={busy || a.proposed_status === "pending"} onClick={() => startTalepProposing(a)}
                              >
                                <Pencil className="h-4 w-4" />
                                {t("proposeNewTime")}
                              </Button>
                              <Button
                                variant="outline" size="lg" className="gap-1.5 w-full h-12 text-base justify-center text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 sm:w-auto sm:h-9 sm:text-xs"
                                disabled={busy} onClick={() => handleTalepReject(a.id)}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                {t("cancelAction")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && talepAppts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Bekleyen istek yok.</p>
        </div>
      ) : requests.length === 0 ? null : (
        <div className="space-y-2.5">
          {requests.map((r) => {
            const source = SOURCE_META[r.source] ?? SOURCE_META.whatsapp;
            const SourceIcon = source.icon;
            const busy = busyId === r.id;
            return (
              <Card key={r.id} className="kpi-tile border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/musteriler?q=${encodeURIComponent(r.customer_phone || r.customer_name)}`}
                          className="font-semibold text-sm hover:text-primary hover:underline transition-colors"
                        >
                          {r.customer_name}
                        </Link>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${source.className}`}>
                          <SourceIcon className="h-3 w-3" /> {source.label}
                        </Badge>
                      </div>
                      {showPhone ? (
                        <a
                          href={waMessageLink(r.customer_phone, "")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 hover:underline transition-colors mt-1"
                        >
                          <MessageCircle className="h-3 w-3" /> {r.customer_phone}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">{maskPhone(r.customer_phone)}</p>
                      )}
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
                      <p className="text-sm mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{r.service?.name ?? "—"}</span>
                        {canReassignStaff && staffOptions.length > 0 ? (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <Select
                              value={r.staff_id ?? undefined}
                              onValueChange={(v) => v && v !== r.staff_id && handleReassign(r.id, v)}
                              disabled={busyId === r.id}
                            >
                              <SelectTrigger size="sm" className="h-6 text-xs px-2 py-0 w-auto min-w-[7rem] border-none bg-transparent shadow-none hover:bg-muted/60">
                                <SelectValue placeholder="Personel seç">
                                  {(value: string) => staffOptions.find((s) => s.id === value)?.full_name || "Personel seç"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {staffOptions.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          r.staff?.full_name && <span className="text-muted-foreground"> · {r.staff.full_name}</span>
                        )}
                        {r.price !== null && <span className="text-muted-foreground"> · {formatServicePrice(r.price, undefined, locale)}</span>}
                      </p>
                      {r.note && <p className="text-xs text-muted-foreground mt-1.5 italic">&quot;{r.note}&quot;</p>}
                      {r.proposed_status === "pending" && r.proposed_appointment_at && (
                        <Badge variant="outline" className="mt-2 text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
                          {t("proposalPendingBadge", { datetime: format(new Date(r.proposed_appointment_at), "d MMM HH:mm", { locale: tr }) })}
                        </Badge>
                      )}
                      {r.proposed_status === "rejected" && (
                        <Badge variant="outline" className="mt-2 text-[10px] gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                          {t("proposalRejectedBadge")}
                        </Badge>
                      )}
                    </div>
                    {editingId === r.id ? (
                      <div className="flex flex-col gap-2.5 w-full sm:w-80 sm:shrink-0 rounded-xl border bg-muted/30 p-3">
                        <DateTimeSlotPicker
                          value={editValue}
                          onChange={setEditValue}
                          minDate={new Date().toISOString().slice(0, 10)}
                          slotMinutes={bookingSlotMinutes}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button size="lg" className="gap-1.5 w-full h-12 text-base justify-center sm:h-9 sm:text-xs sm:flex-1" disabled={busy} onClick={() => handlePropose(r.id)}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t("proposeSubmit")}
                          </Button>
                          <Button size="lg" variant="outline" className="w-full h-12 text-base justify-center sm:w-auto sm:h-9 sm:text-xs" disabled={busy} onClick={() => setEditingId(null)}>
                            {t("rescheduleCancelButton")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full sm:w-auto sm:shrink-0">
                        {canReassignStaff && !r.staff_id && staffOptions.length > 0 && (
                          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <span className="text-xs text-amber-800 dark:text-amber-400 shrink-0">Personel farketmez —</span>
                            <Select
                              onValueChange={(v: string | null) => v && handleReassign(r.id, v)}
                              disabled={busy}
                            >
                              <SelectTrigger size="sm" className="h-8 text-xs flex-1 min-w-0 bg-background">
                                <SelectValue placeholder="Personel ata">
                                  {(value: string) => staffOptions.find((s) => s.id === value)?.full_name || "Personel ata"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {staffOptions.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap">
                          <Button
                            size="lg" className="gap-1.5 w-full h-12 text-base justify-center bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto sm:h-9 sm:text-xs"
                            disabled={busy} onClick={() => handleAction(r.id, "approve")}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t("approve")}
                          </Button>
                          <Button
                            variant="outline" size="lg"
                            className="gap-1.5 w-full h-12 text-base justify-center border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 sm:w-auto sm:h-9 sm:text-xs"
                            disabled={busy || r.proposed_status === "pending"} onClick={() => startEditing(r)}
                          >
                            <Pencil className="h-4 w-4" />
                            {t("proposeNewTime")}
                          </Button>
                          <Button
                            variant="outline" size="lg" className="gap-1.5 w-full h-12 text-base justify-center text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 sm:w-auto sm:h-9 sm:text-xs"
                            disabled={busy} onClick={() => handleAction(r.id, "reject")}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            {t("cancelAction")}
                          </Button>
                        </div>
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
