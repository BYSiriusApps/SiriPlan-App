"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, XCircle, Calendar, Clock, User, Scissors, MapPin } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type ApptInfo = {
  status: string;
  appointment_at: string;
  customer_name: string;
  org_name: string;
  org_address: string;
  location_url: string;
  staff_name: string;
  service_name: string;
  cancellable: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  talep: "Onay Bekliyor", onaylandi: "Onaylandı", tamamlandi: "Tamamlandı",
  iptal: "İptal Edildi", gelmedi: "Gelinmedi",
};

/** WhatsApp dinamik buton hedefi — Meta onaylı şablonlardaki {{randevu detayı}} linki. */
export default function AppointmentDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ApptInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/appointment?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Randevu bulunamadı.");
        setInfo(d.appointment);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4">
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
          ) : info ? (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">Randevu Detayı</h1>
                <p className="text-sm text-muted-foreground">Merhaba {info.customer_name}</p>
                <Badge variant="secondary">{STATUS_LABELS[info.status] ?? info.status}</Badge>
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
                {(info.location_url || info.org_address) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                    {info.location_url ? (
                      <a
                        href={info.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-600 hover:underline"
                      >
                        {info.org_address || "Konumu Görüntüle"}
                      </a>
                    ) : (
                      <span>{info.org_address}</span>
                    )}
                  </div>
                )}
                <div className="pt-1 text-xs text-muted-foreground">{info.org_name}</div>
              </div>

              {info.cancellable && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/r/iptal/${token}`)}
                >
                  Randevuyu İptal Et
                </Button>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
