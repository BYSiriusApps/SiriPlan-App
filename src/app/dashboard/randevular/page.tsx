import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Phone, User } from "lucide-react";
import type { Appointment } from "@/types/database";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  talep:      { label: "Talep",      className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300" },
  onaylandi:  { label: "Onaylandı",  className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" },
  tamamlandi: { label: "Tamamlandı", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300" },
  iptal:      { label: "İptal",      className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300" },
  gelmedi:    { label: "Gelmedi",    className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300" },
};

export default async function RandevularPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  let query = supabase
    .from("appointments")
    .select("*, staff(full_name), service:services(name, duration_minutes)")
    .eq("org_id", member.org_id)
    .order("appointment_at", { ascending: false })
    .limit(100);

  if (params.status) query = query.eq("status", params.status);
  if (params.date) {
    const d = new Date(params.date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    query = query.gte("appointment_at", start.toISOString()).lte("appointment_at", end.toISOString());
  }

  const { data: appointments } = await query;

  const statuses = ["talep", "onaylandi", "tamamlandi", "iptal", "gelmedi"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Randevular</h1>
        <Link
          href="/dashboard/randevular/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Randevu Ekle
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/dashboard/randevular"
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            !params.status ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
          )}
        >
          Tümü
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/dashboard/randevular?status=${s}`}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              params.status === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            )}
          >
            {STATUS_CONFIG[s]?.label}
          </Link>
        ))}
      </div>

      {/* Appointments list */}
      <div className="space-y-2">
        {!appointments || appointments.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Randevu bulunamadı</p>
            </CardContent>
          </Card>
        ) : (
          (appointments as (Appointment & { staff?: { full_name: string }; service?: { name: string; duration_minutes: number } })[]).map((appt) => (
            <Link key={appt.id} href={`/dashboard/randevular/${appt.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-16 shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.appointment_at), "d MMM", { locale: tr })}
                      </p>
                      <p className="text-base font-bold text-primary">
                        {format(new Date(appt.appointment_at), "HH:mm")}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{appt.customer_name}</p>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] shrink-0", STATUS_CONFIG[appt.status]?.className)}
                        >
                          {STATUS_CONFIG[appt.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {appt.staff?.full_name}
                        </span>
                        <span>• {appt.service?.name}</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {appt.customer_phone}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold">₺{Number(appt.price).toLocaleString("tr-TR")}</p>
                      <p className="text-xs text-muted-foreground">{appt.duration_minutes}dk</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
