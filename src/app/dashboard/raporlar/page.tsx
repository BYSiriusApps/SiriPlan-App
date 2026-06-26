import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { TrendingUp, Users, Star, Download } from "lucide-react";

export default async function RaporlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  const orgId = member.org_id;
  const now = new Date();

  // Last 6 months stats
  const monthlyStats = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, i);
      const start = startOfMonth(d).toISOString();
      const end = endOfMonth(d).toISOString();
      return supabase
        .from("appointments")
        .select("price, tip, status")
        .eq("org_id", orgId)
        .gte("appointment_at", start)
        .lte("appointment_at", end)
        .neq("status", "iptal")
        .then(({ data }) => ({
          month: format(d, "MMM yyyy", { locale: tr }),
          revenue: (data || []).filter((a) => a.status === "tamamlandi").reduce((s, a) => s + Number(a.price) + Number(a.tip || 0), 0),
          total: (data || []).length,
          completed: (data || []).filter((a) => a.status === "tamamlandi").length,
        }));
    })
  );

  const [{ data: topServices }, { data: topStaff }, { data: noShowData }] = await Promise.all([
    supabase
      .from("appointments")
      .select("service_id, services(name), price, status")
      .eq("org_id", orgId)
      .eq("status", "tamamlandi")
      .gte("appointment_at", startOfMonth(now).toISOString()),

    supabase
      .from("appointments")
      .select("staff_id, staff(full_name), price, status")
      .eq("org_id", orgId)
      .eq("status", "tamamlandi")
      .gte("appointment_at", startOfMonth(now).toISOString()),

    supabase
      .from("appointments")
      .select("status")
      .eq("org_id", orgId)
      .gte("appointment_at", startOfMonth(now).toISOString()),
  ]);

  // Aggregate top services
  const serviceMap: Record<string, { name: string; revenue: number; count: number }> = {};
  (topServices || []).forEach((a) => {
    const name = (a as unknown as { services?: { name: string } }).services?.name || "Bilinmiyor";
    const sid = a.service_id;
    if (!serviceMap[sid]) serviceMap[sid] = { name, revenue: 0, count: 0 };
    serviceMap[sid].revenue += Number(a.price);
    serviceMap[sid].count++;
  });
  const topServicesArr = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Aggregate top staff
  const staffMap: Record<string, { name: string; revenue: number; count: number }> = {};
  (topStaff || []).forEach((a) => {
    const name = (a as unknown as { staff?: { full_name: string } }).staff?.full_name || "Bilinmiyor";
    const sid = a.staff_id;
    if (!staffMap[sid]) staffMap[sid] = { name, revenue: 0, count: 0 };
    staffMap[sid].revenue += Number(a.price);
    staffMap[sid].count++;
  });
  const topStaffArr = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // No-show rate
  const total = (noShowData || []).length;
  const noshows = (noShowData || []).filter((a) => a.status === "gelmedi").length;
  const noShowRate = total > 0 ? ((noshows / total) * 100).toFixed(1) : "0";

  const currentMonthRevenue = monthlyStats[0].revenue;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground text-sm">Son 6 aylık performans analizi</p>
        </div>
        <a
          href="/api/export?format=json"
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Veri İndir
        </a>
      </div>

      {/* Monthly revenue bars */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Aylık Ciro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...monthlyStats].reverse().map((m) => {
              const maxRevenue = Math.max(...monthlyStats.map((s) => s.revenue));
              const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground capitalize">{m.month}</span>
                  <div className="flex-1 h-6 rounded-lg bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-fuchsia-500 rounded-lg transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-28 text-xs font-semibold text-right">₺{m.revenue.toLocaleString("tr-TR")}</span>
                  <span className="w-16 text-xs text-muted-foreground text-right">{m.completed}/{m.total}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top services */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Bu Ay En Çok Satılan Hizmetler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServicesArr.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Veri yok</p>
            ) : (
              <div className="space-y-3">
                {topServicesArr.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} randevu</p>
                    </div>
                    <p className="text-sm font-semibold">₺{s.revenue.toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top staff */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Bu Ay En Yüksek Ciro (Personel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStaffArr.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Veri yok</p>
            ) : (
              <div className="space-y-3">
                {topStaffArr.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-200 flex items-center justify-center font-bold text-primary text-sm">
                      {s.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} tamamlanan randevu</p>
                    </div>
                    <p className="text-sm font-semibold">₺{s.revenue.toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Bu Ay Ciro", value: `₺${currentMonthRevenue.toLocaleString("tr-TR")}` },
          { label: "No-Show Oranı", value: `%${noShowRate}` },
          { label: "Tamamlanma Oranı", value: total > 0 ? `%${((monthlyStats[0].completed / total) * 100).toFixed(0)}` : "-" },
          { label: "Toplam İşlem", value: String(total) },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
