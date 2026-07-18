import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AdminOrgTable, type AdminOrgRow } from "./AdminOrgTable";
import { Building2, Users, CalendarCheck, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await createAdminClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: orgs }, { count: totalMembers }, { count: monthAppts }] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "id, slug, name, type, email, phone, city, plan, subscription_status, trial_ends_at, max_staff, max_appointments_monthly, created_at"
      )
      .order("created_at", { ascending: false }),
    admin.from("org_members").select("id", { count: "exact", head: true }),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
  ]);

  const orgIds = (orgs ?? []).map((o) => o.id);

  // Salon başına üye / personel / bu ayki randevu sayıları
  const [memberRows, staffRows, apptRows] = await Promise.all([
    admin.from("org_members").select("org_id").in("org_id", orgIds),
    admin.from("staff").select("org_id").eq("is_active", true).in("org_id", orgIds),
    admin
      .from("appointments")
      .select("org_id")
      .gte("created_at", monthStart.toISOString())
      .in("org_id", orgIds),
  ]);

  const countBy = (rows: { org_id: string }[] | null) => {
    const m: Record<string, number> = {};
    for (const r of rows ?? []) m[r.org_id] = (m[r.org_id] ?? 0) + 1;
    return m;
  };
  const memberCounts = countBy(memberRows.data);
  const staffCounts = countBy(staffRows.data);
  const apptCounts = countBy(apptRows.data);

  const rows: AdminOrgRow[] = (orgs ?? []).map((o) => ({
    ...o,
    member_count: memberCounts[o.id] ?? 0,
    staff_count: staffCounts[o.id] ?? 0,
    month_appointments: apptCounts[o.id] ?? 0,
  }));

  const paidCount = rows.filter((r) => r.plan !== "trial").length;

  const stats = [
    { label: "Toplam Salon", value: rows.length, icon: Building2 },
    { label: "Ücretli Plan", value: paidCount, icon: Crown },
    { label: "Toplam Kullanıcı", value: totalMembers ?? 0, icon: Users },
    { label: "Bu Ay Randevu", value: monthAppts ?? 0, icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AdminOrgTable orgs={rows} />
    </div>
  );
}
