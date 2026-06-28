import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Phone, User, Scissors, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/database";
import ApptActions from "./appt-actions";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  talep:      { label: "Talep",      className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  onaylandi:  { label: "Onaylandı",  className: "bg-blue-100 text-blue-800 border-blue-200" },
  tamamlandi: { label: "Tamamlandı", className: "bg-green-100 text-green-800 border-green-200" },
  iptal:      { label: "İptal",      className: "bg-red-100 text-red-800 border-red-200" },
  gelmedi:    { label: "Gelmedi",    className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default async function ApptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  const { data: appt, error } = await supabase
    .from("appointments")
    .select("*, staff(*), service:services(*), customer:customers(*)")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (error || !appt) notFound();

  const a = appt as Appointment;
  const statusCfg = STATUS_CONFIG[a.status];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/randevular" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Randevu Detayı</h1>
        <Badge variant="outline" className={cn("ml-auto", statusCfg?.className)}>
          {statusCfg?.label}
        </Badge>
      </div>

      {/* Main info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {format(new Date(a.appointment_at), "d MMMM yyyy, EEEE — HH:mm", { locale: tr })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Müşteri</p>
              <p className="font-medium">{a.customer_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Telefon</p>
              <a href={`tel:${a.customer_phone}`} className="font-medium text-primary hover:underline">
                {a.customer_phone}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Hizmet</p>
              <p className="font-medium">{a.service?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Personel</p>
              <p className="font-medium">{a.staff?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Süre</p>
              <p className="font-medium">{a.duration_minutes} dk</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Ücret</p>
              <p className="font-medium">₺{Number(a.price).toLocaleString("tr-TR")}</p>
            </div>
          </div>
          {a.tip > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Bahşiş</p>
              <p className="font-medium">₺{Number(a.tip).toLocaleString("tr-TR")}</p>
            </div>
          )}
          {a.payment_method && (
            <div>
              <p className="text-muted-foreground text-xs">Ödeme Yöntemi</p>
              <p className="font-medium capitalize">{a.payment_method}</p>
            </div>
          )}
          {a.source && (
            <div>
              <p className="text-muted-foreground text-xs">Kaynak</p>
              <p className="font-medium capitalize">{a.source}</p>
            </div>
          )}
          {a.note && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Müşteri Notu</p>
              <p className="font-medium">{a.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer history link */}
      {a.customer_id && (
        <Link
          href={`/dashboard/musteriler/${a.customer_id}`}
          className="block text-sm text-primary hover:underline"
        >
          Müşteri geçmişini görüntüle →
        </Link>
      )}

      {/* Actions */}
      <ApptActions appt={a} />
    </div>
  );
}
