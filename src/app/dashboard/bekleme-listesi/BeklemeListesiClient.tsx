"use client";

import { useState, useCallback } from "react";
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
import { DateTimeSlotPicker } from "@/components/dashboard/DateTimeSlotPicker";
import { usePlan } from "@/components/dashboard/PlanContext";
import { toast } from "sonner";
import { ListPlus, Plus, Trash2, Loader2, Clock, Bell, CalendarPlus, Users, Check, CalendarClock, Lock, Pencil, X, MessageCircle, Instagram, Globe } from "lucide-react";
import { maskPhone } from "@/lib/phone";

export type PendingAppt = {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_at: string;
  staff: { full_name: string } | null;
  service: { name: string } | null;
  proposed_status?: "none" | "pending" | "accepted" | "rejected";
  proposed_appointment_at?: string | null;
};

/** appointment_requests — randevu linki DIŞINDA (WhatsApp/Instagram/web) kanallardan
 * gelen, manuel onay bekleyen talepler. PendingAppt'ten AYRI bir tablo/akış; bu
 * sayfada eskiden hiç gösterilmiyordu — "Bekleme Listesi / Onay Bekleyenler"
 * başlığına rağmen yalnızca randevu linkinden gelen talepler görünüyordu. */
export type PendingRequest = {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_at: string;
  source: string;
  staff: { full_name: string } | null;
  service: { name: string } | null;
  proposed_status?: "none" | "pending" | "accepted" | "rejected";
  proposed_appointment_at?: string | null;
};

const REQUEST_SOURCE_META: Record<string, { label: string; icon: typeof MessageCircle }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  instagram: { label: "Instagram", icon: Instagram },
};

export type WaitlistEntry = {
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

export type StaffOption = { id: string; full_name: string };
export type ServiceOption = { id: string; name: string };

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

type Props = {
  initialEntries: WaitlistEntry[];
  initialPendingAppts: PendingAppt[];
  initialPendingRequests: PendingRequest[];
  staffOptions: StaffOption[];
  serviceOptions: ServiceOption[];
  showPhone: boolean;
  bookingSlotMinutes: number;
};

export function BeklemeListesiClient({
  initialEntries,
  initialPendingAppts,
  initialPendingRequests,
  staffOptions,
  serviceOptions,
  showPhone,
  bookingSlotMinutes,
}: Props) {
  const t = useTranslations("dashboard");
  const [entries, setEntries] = useState<WaitlistEntry[]>(initialEntries);
  const [pendingAppts, setPendingAppts] = useState<PendingAppt[]>(initialPendingAppts);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [requestEditingId, setRequestEditingId] = useState<string | null>(null);
  const [requestEditValue, setRequestEditValue] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editApptValue, setEditApptValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<"active" | "all">("active");
  // Bekleme listesi Pro+ özelliği. "Onay bekleyen randevular" bölümü bundan
  // bağımsız — her planda çalışır (talep randevuları burada da onaylanabilsin).
  const { proTools } = usePlan();

  // Yalnızca aksiyon sonrası (ekleme/durum güncelleme/silme) tazeleme için
  // kullanılır — ilk yükleme artık page.tsx'te sunucuda yapılıyor, burada
  // tekrar çağrılmıyor (bkz. dosya başındaki not).
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [res, apptRes, reqRes] = await Promise.all([
      proTools ? fetch("/api/waitlist").catch(() => null) : Promise.resolve(null),
      fetch("/api/appointments?status=talep").catch(() => null),
      fetch("/api/appointment-requests?status=pending").catch(() => null),
    ]);
    if (res && res.ok) {
      const d = await res.json();
      setEntries(d.waitlist || []);
    }
    if (apptRes && apptRes.ok) {
      const d = await apptRes.json();
      const list = ((d.appointments || []) as PendingAppt[]).sort(
        (a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime()
      );
      setPendingAppts(list);
    }
    if (reqRes && reqRes.ok) {
      const d = await reqRes.json();
      const list = ((d.requests || []) as PendingRequest[]).sort(
        (a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime()
      );
      setPendingRequests(list);
    }
    setLoading(false);
  }, [proTools]);

  async function approveRequest(id: string) {
    setRequestBusyId(id);
    const res = await fetch(`/api/appointment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setRequestBusyId(null);
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success("Randevu onaylandı");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "İşlem gerçekleştirilemedi");
    }
  }

  async function rejectRequest(id: string) {
    setRequestBusyId(id);
    const res = await fetch(`/api/appointment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    setRequestBusyId(null);
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success("Talep reddedildi");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "İşlem gerçekleştirilemedi");
    }
  }

  function startProposingRequest(r: PendingRequest) {
    setRequestEditingId(r.id);
    setRequestEditValue(toLocalInputValue(r.appointment_at));
  }

  async function proposeRequest(id: string) {
    if (!requestEditValue) return;
    const iso = new Date(requestEditValue).toISOString();
    setRequestBusyId(id);
    const res = await fetch(`/api/appointment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", appointment_at: iso }),
    });
    setRequestBusyId(null);
    if (res.ok) {
      setPendingRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, proposed_status: "pending", proposed_appointment_at: iso } : r))
      );
      setRequestEditingId(null);
      toast.success("Yeni saat önerildi, müşteri cevabı bekleniyor");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "Öneri gönderilemedi");
    }
  }

  async function approveAppt(id: string) {
    setApprovingId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "onaylandi" }),
    });
    setApprovingId(null);
    if (res.ok) {
      setPendingAppts((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("apptActions.toastApprovedNotifying"));
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || t("apptActions.approveFailed"));
    }
  }

  function toLocalInputValue(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startProposing(a: PendingAppt) {
    setEditingApptId(a.id);
    setEditApptValue(toLocalInputValue(a.appointment_at));
  }

  async function proposeAppt(id: string) {
    if (!editApptValue) return;
    const iso = new Date(editApptValue).toISOString();
    setProposingId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "propose", appointment_at: iso }),
    });
    setProposingId(null);
    if (res.ok) {
      setPendingAppts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, proposed_status: "pending", proposed_appointment_at: iso } : a))
      );
      setEditingApptId(null);
      toast.success("Yeni saat önerildi, müşteri cevabı bekleniyor");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "Öneri gönderilemedi");
    }
  }

  async function cancelAppt(id: string) {
    setCancelingId(id);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "iptal" }),
    });
    setCancelingId(null);
    if (res.ok) {
      setPendingAppts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Randevu talebi iptal edildi");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "İptal edilemedi");
    }
  }

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
      customer_phone: showPhone ? e.customer_phone : maskPhone(e.customer_phone),
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
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("waitlistAndApprovals")}</h1>
            <HomeButton />
          </div>
          <p className="text-muted-foreground text-sm">{t("waitlistPage.subtitle")}</p>
        </div>
        {proTools && (
          <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            {t("waitlistPage.addButton")}
          </Button>
        )}
      </div>

      {/* Onay bekleyen randevular — randevu linkinden gelen (talep) randevular
          + WhatsApp/Instagram/web appointment_requests. İkisi de AYRI tablo/akış
          (bkz. PendingRequest tipi yorumu); eskiden yalnızca talep randevuları
          gösteriliyordu, "Onay Bekleyenler" başlığına rağmen kanal talepleri
          burada hiç görünmüyordu. Kayda tıklayınca detay açılır; "Onayla"
          doğrudan onaylar. */}
      {(pendingAppts.length > 0 || pendingRequests.length > 0) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{t("waitlistPage.pendingApprovalsTitle")}</p>
              <Badge variant="outline" className="text-[10px] font-normal">{pendingAppts.length + pendingRequests.length}</Badge>
            </div>
            <div className="space-y-1">
              {pendingRequests.map((r) => {
                const meta = REQUEST_SOURCE_META[r.source] ?? REQUEST_SOURCE_META.whatsapp;
                const SourceIcon = meta.icon;
                const busy = requestBusyId === r.id;
                return (
                  <div
                    key={r.id}
                    className="relative flex flex-col gap-2 px-3 py-3 rounded-lg data-row transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium leading-tight truncate">{r.customer_name}</p>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <SourceIcon className="h-3 w-3" /> {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                          <Clock className="h-3 w-3 shrink-0" />
                          {new Date(r.appointment_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {r.service?.name && ` · ${r.service.name}`}
                          {r.staff?.full_name && ` · ${r.staff.full_name}`}
                        </p>
                      </div>
                      {requestEditingId === r.id ? (
                        <div
                          className="relative z-10 flex flex-col gap-2.5 w-full sm:w-80 shrink-0 rounded-xl border bg-muted/30 p-3"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <DateTimeSlotPicker
                            value={requestEditValue}
                            onChange={setRequestEditValue}
                            minDate={new Date().toISOString().slice(0, 10)}
                            slotMinutes={bookingSlotMinutes}
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button
                              size="lg" className="gap-1.5 w-full h-12 text-base justify-center sm:h-9 sm:text-xs sm:flex-1"
                              disabled={busy}
                              onClick={() => proposeRequest(r.id)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              {t("proposeSubmit")}
                            </Button>
                            <Button
                              size="lg" variant="outline" className="w-full h-12 text-base justify-center sm:w-auto sm:h-9 sm:text-xs"
                              onClick={() => setRequestEditingId(null)}
                            >
                              {t("rescheduleCancelButton")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative z-10 flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:w-auto sm:shrink-0">
                          <Button
                            size="lg"
                            className="gap-1.5 w-full h-12 text-base justify-center bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto sm:h-8 sm:text-xs"
                            disabled={busy}
                            onClick={() => approveRequest(r.id)}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t("approve")}
                          </Button>
                          <Button
                            size="lg" variant="outline"
                            className="gap-1.5 w-full h-12 text-base justify-center border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 sm:w-auto sm:h-8 sm:text-xs"
                            disabled={busy || r.proposed_status === "pending"}
                            onClick={() => startProposingRequest(r)}
                          >
                            <Pencil className="h-4 w-4" />
                            {t("proposeNewTime")}
                          </Button>
                          <Button
                            size="lg" variant="outline"
                            className="gap-1.5 w-full h-12 text-base justify-center text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 sm:w-auto sm:h-8 sm:text-xs"
                            disabled={busy}
                            onClick={() => rejectRequest(r.id)}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            {t("cancelAction")}
                          </Button>
                        </div>
                      )}
                    </div>
                    {r.proposed_status === "pending" && r.proposed_appointment_at && (
                      <Badge variant="outline" className="relative z-10 w-fit text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
                        {t("proposalPendingBadge", { datetime: new Date(r.proposed_appointment_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) })}
                      </Badge>
                    )}
                    {r.proposed_status === "rejected" && (
                      <Badge variant="outline" className="relative z-10 w-fit text-[10px] gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                        {t("proposalRejectedBadge")}
                      </Badge>
                    )}
                  </div>
                );
              })}
              {pendingAppts.map((a) => (
                <div
                  key={a.id}
                  className="relative flex flex-col gap-2 px-3 py-3 rounded-lg data-row transition-colors"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/dashboard/randevular/${a.id}`}
                      className="min-w-0 flex-1 before:absolute before:inset-0 before:content-['']"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium leading-tight truncate">{a.customer_name}</p>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Globe className="h-3 w-3" /> Randevu Linki
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                        <Clock className="h-3 w-3 shrink-0" />
                        {new Date(a.appointment_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {a.service?.name && ` · ${a.service.name}`}
                        {a.staff?.full_name && ` · ${a.staff.full_name}`}
                      </p>
                    </Link>
                    {editingApptId === a.id ? (
                      <div
                        className="relative z-10 flex flex-col gap-2.5 w-full sm:w-80 shrink-0 rounded-xl border bg-muted/30 p-3"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <DateTimeSlotPicker
                          value={editApptValue}
                          onChange={setEditApptValue}
                          minDate={new Date().toISOString().slice(0, 10)}
                          slotMinutes={bookingSlotMinutes}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            size="lg" className="gap-1.5 w-full h-12 text-base justify-center sm:h-9 sm:text-xs sm:flex-1"
                            disabled={proposingId === a.id}
                            onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); proposeAppt(a.id); }}
                          >
                            {proposingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t("proposeSubmit")}
                          </Button>
                          <Button
                            size="lg" variant="outline" className="w-full h-12 text-base justify-center sm:w-auto sm:h-9 sm:text-xs"
                            onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setEditingApptId(null); }}
                          >
                            {t("rescheduleCancelButton")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:w-auto sm:shrink-0">
                        <Button
                          size="lg"
                          className="gap-1.5 w-full h-12 text-base justify-center bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto sm:h-8 sm:text-xs"
                          disabled={approvingId === a.id}
                          onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); approveAppt(a.id); }}
                        >
                          {approvingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          {t("approve")}
                        </Button>
                        <Button
                          size="lg" variant="outline"
                          className="gap-1.5 w-full h-12 text-base justify-center border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 sm:w-auto sm:h-8 sm:text-xs"
                          disabled={a.proposed_status === "pending"}
                          onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); startProposing(a); }}
                        >
                          <Pencil className="h-4 w-4" />
                          {t("proposeNewTime")}
                        </Button>
                        <Button
                          size="lg" variant="outline"
                          className="gap-1.5 w-full h-12 text-base justify-center text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 sm:w-auto sm:h-8 sm:text-xs"
                          disabled={cancelingId === a.id}
                          onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); cancelAppt(a.id); }}
                        >
                          {cancelingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          {t("cancelAction")}
                        </Button>
                      </div>
                    )}
                  </div>
                  {a.proposed_status === "pending" && a.proposed_appointment_at && (
                    <Badge variant="outline" className="relative z-10 w-fit text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
                      {t("proposalPendingBadge", { datetime: new Date(a.proposed_appointment_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) })}
                    </Badge>
                  )}
                  {a.proposed_status === "rejected" && (
                    <Badge variant="outline" className="relative z-10 w-fit text-[10px] gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                      {t("proposalRejectedBadge")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!proTools && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("waitlistPage.proTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("waitlistPage.proDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + liste — bekleme listesi Pro+ */}
      {proTools && (
      <>
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
                      {showPhone ? e.customer_phone : maskPhone(e.customer_phone)}
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
      </>
      )}

      {/* Add dialog */}
      {proTools && (
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
                  {serviceOptions.map((s) => (
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
                  {staffOptions.map((s) => (
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
      )}
    </div>
  );
}
