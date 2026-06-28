import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Star, Calendar, CreditCard, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, Appointment } from "@/types/database";

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

const STATUS_LABELS: Record<string, string> = {
  talep: "Talep", onaylandi: "Onaylandı", tamamlandi: "Tamamlandı",
  iptal: "İptal", gelmedi: "Gelmedi",
};

export default async function MusteriDetailPage({
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

  const [{ data: customer }, { data: appointments }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("org_id", member.org_id)
      .single(),
    supabase
      .from("appointments")
      .select("*, staff(full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .eq("customer_id", id)
      .order("appointment_at", { ascending: false })
      .limit(30),
  ]);

  if (!customer) notFound();
  const c = customer as Customer;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/musteriler" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{c.full_name}</h1>
        <Badge className={cn("ml-auto text-xs", scoreColor(c.score))}>
          <Star className="h-3 w-3 mr-1 fill-current" />
          {c.score} puan
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">İletişim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
            </div>
            {c.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{c.email}</span>
              </div>
            )}
            {c.birth_date && (
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(c.birth_date), "d MMMM", { locale: tr })} doğumlu</span>
              </div>
            )}
            {c.notes && (
              <p className="text-muted-foreground text-xs pt-1 border-t">{c.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">İstatistikler</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Toplam Ziyaret</p>
              <p className="font-bold text-lg">{c.visit_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Toplam Harcama</p>
              <p className="font-bold text-lg">₺{Number(c.total_spend).toLocaleString("tr-TR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Sadakat Kartı</p>
              <p className="font-bold text-lg">{c.loyalty_punches} / 10</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Son Ziyaret</p>
              <p className="font-medium text-sm">
                {c.last_visit_at
                  ? format(new Date(c.last_visit_at), "d MMM yyyy", { locale: tr })
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {c.tags && c.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {c.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Loyalty bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-primary" /> Sadakat Kartı
            </span>
            <span className="text-xs text-muted-foreground">{c.loyalty_punches}/10 — {c.loyalty_redeems} kullanım</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-3 rounded-full",
                  i < c.loyalty_punches ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appointment history */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Randevu Geçmişi
        </h2>
        <div className="space-y-2">
          {!appointments || appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Randevu bulunamadı</p>
          ) : (
            (appointments as (Appointment & { staff?: { full_name: string }; service?: { name: string } })[]).map((appt) => (
              <Link key={appt.id} href={`/dashboard/randevular/${appt.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="text-center w-14 shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.appointment_at), "d MMM", { locale: tr })}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {format(new Date(appt.appointment_at), "HH:mm")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{appt.service?.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.staff?.full_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₺{Number(appt.price).toLocaleString("tr-TR")}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABELS[appt.status] || appt.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
