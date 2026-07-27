import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { Appointment } from "@/types/database";
import { RandevularHeader } from "@/components/dashboard/RandevularHeader";
import { RandevuCard } from "@/components/dashboard/RandevuCard";
import { STATUS_LABELS } from "@/lib/appointment-status";

export default async function RandevularPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const [{ data: staff }, { data: services }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, avatar_url, role")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("org_id", member.org_id)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  let query = supabase
    .from("appointments")
    .select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name, duration_minutes)")
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
      <RandevularHeader
        orgId={member.org_id}
        staff={(staff ?? []).map((s) => ({
          id: s.id,
          full_name: s.full_name,
          avatar_url: (s as { avatar_url?: string | null }).avatar_url ?? null,
          role: (s as { role?: string }).role,
        }))}
        services={(services ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
        }))}
      />

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
            {STATUS_LABELS[s]}
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
            <RandevuCard
              key={appt.id}
              appt={appt}
              canQuickAct={member.role !== "staff" || appt.staff_id === member.staff_id}
            />
          ))
        )}
      </div>
    </div>
  );
}
