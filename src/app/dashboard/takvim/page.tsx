import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfWeek, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { TakvimHeader } from "@/components/dashboard/TakvimHeader";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
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

  const baseDate = params.date ? new Date(params.date) : new Date();
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd")
  );

  const [{ data: appointments }, { data: staff }, { data: services }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, staff(id, full_name), service:services(name)")
      .eq("org_id", member.org_id)
      .gte("appointment_at", weekStart.toISOString())
      .lte("appointment_at", addDays(weekStart, 7).toISOString())
      .neq("status", "iptal"),

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

  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "d MMM", { locale: tr })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: tr })}`;

  return (
    <div className="p-6 space-y-4">
      <TakvimHeader
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
        weekLabel={weekLabel}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        today={today}
      />

      {!staff || staff.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Personel eklenmemiş.{" "}
            <Link href="/dashboard/personel/yeni" className="text-primary underline">Personel ekle</Link>
          </CardContent>
        </Card>
      ) : (
        <CalendarGrid
          staff={staff}
          appointments={(appointments || []).map((a) => ({
            id: a.id,
            status: a.status,
            customer_name: a.customer_name,
            appointment_at: a.appointment_at,
            duration_minutes: a.duration_minutes,
            staff_id: a.staff_id,
            service: (a as { service?: { name: string } | null }).service ?? null,
          }))}
          weekDays={weekDays}
          today={today}
          hours={HOURS}
          orgId={member.org_id}
        />
      )}
    </div>
  );
}
