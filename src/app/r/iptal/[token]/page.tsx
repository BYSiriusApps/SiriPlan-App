"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Calendar, Clock, User, Scissors } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PoweredByBadge } from "@/components/public/PoweredByBadge";

type CancelInfo = {
  status: string;
  appointment_at: string;
  customer_name: string;
  org_name: string;
  staff_name: string;
  service_name: string;
  cancellable: boolean;
};

export default function CancelAppointmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CancelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    fetch(`/api/public/cancel?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Randevu bulunamadı.");
        setInfo(d.appointment);
        if (d.appointment.status === "iptal") setCancelled(true);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel() {
    setSubmitting(true);
    try {
      const r = await fetch("/api/public/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "İptal işlemi başarısız oldu.");
      setCancelled(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-3">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="font-semibold text-lg">Bir sorun oluştu</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : cancelled ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-lg">Randevunuz İptal Edildi</p>
              <p className="text-sm text-muted-foreground">
                {info?.org_name} bilgilendirildi. Dilediğiniz zaman yeni randevu alabilirsiniz.
              </p>
            </div>
          ) : info ? (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">Randevu İptali</h1>
                <p className="text-sm text-muted-foreground">
                  Merhaba {info.customer_name}, aşağıdaki randevunuzu iptal etmek üzeresiniz.
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="font-medium">
                    {format(new Date(info.appointment_at), "d MMMM yyyy EEEE", { locale: tr })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="font-medium">{format(new Date(info.appointment_at), "HH:mm")}</span>
                </div>
                {info.service_name && (
                  <div className="flex items-center gap-3">
                    <Scissors className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{info.service_name}</span>
                  </div>
                )}
                {info.staff_name && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{info.staff_name}</span>
                  </div>
                )}
                <div className="pt-1 text-xs text-muted-foreground">{info.org_name}</div>
              </div>

              {info.cancellable ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Randevuyu İptal Et
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Bu randevu artık iptal edilemez. Lütfen {info.org_name} ile iletişime geçin.
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
      <PoweredByBadge />
    </div>
  );
}
