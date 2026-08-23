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
import { MessageCircle, Instagram, Calendar, Clock, Loader2, Check, X, Inbox } from "lucide-react";
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

export function BekleyenIsteklerClient({ initialRequests, showPhone = true }: { initialRequests: AppointmentRequest[]; showPhone?: boolean }) {
  const t = useTranslations("dashboard");
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

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
                    <div className="flex gap-2 shrink-0">
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
