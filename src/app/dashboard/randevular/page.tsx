import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cn, sanitizeFilterValue } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { Appointment } from "@/types/database";
import { RandevularHeader } from "@/components/dashboard/RandevularHeader";
import { RandevuCard } from "@/components/dashboard/RandevuCard";
import { RandevularFilters } from "@/components/dashboard/RandevularFilters";
import { STATUS_LABEL_KEYS } from "@/lib/appointment-status";

const DEFAULT_LIMIT = 100;
const SEARCH_LIMIT = 300;

export default async function RandevularPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("dashboard");
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

  const searchTerm = params.q?.trim();
  const hasDateRange = !!(params.from || params.to);
  // Aramada veya tarih aralığında son 100 kaydın dışına çıkmak gerekir —
  // geçmiş randevular sistemde saklı kalır, sadece varsayılan listede görünmez.
  const isFiltered = !!searchTerm || hasDateRange;

  const baseSelect = "*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name, duration_minutes)";

  let appointments: Appointment[] | null;

  if (isFiltered) {
    let query = supabase
      .from("appointments")
      .select(baseSelect)
      .eq("org_id", member.org_id)
      .order("appointment_at", { ascending: true })
      .limit(SEARCH_LIMIT);

    if (params.status) query = query.eq("status", params.status);
    if (searchTerm) {
      // PostgREST filtre dilinde anlamı olan karakterler temizlenir
      // (bkz. lib/utils.ts → sanitizeFilterValue).
      const safeTerm = sanitizeFilterValue(searchTerm);
      if (safeTerm) {
        query = query.or(`customer_name.ilike.%${safeTerm}%,customer_phone.ilike.%${safeTerm}%`);
      }
    }
    if (params.from) {
      query = query.gte("appointment_at", new Date(params.from + "T00:00:00").toISOString());
    }
    if (params.to) {
      query = query.lte("appointment_at", new Date(params.to + "T23:59:59").toISOString());
    }

    const { data } = await query;
    appointments = data as unknown as Appointment[] | null;
  } else {
    // Varsayılan görünüm: "en yakın saatten en eskiye" — önce şu andan itibaren
    // yaklaşan randevular (en yakın en üstte), 100'e tamamlanana kadar kalan
    // yeri en yakın zamanda geçmiş randevular doldurur. Düz "appointment_at
    // ascending" kullanılsaydı geçmişi yoğun organizasyonlarda liste en eski
    // (aylar önceki) randevudan başlardı.
    const nowIso = new Date().toISOString();

    let upcomingQuery = supabase
      .from("appointments")
      .select(baseSelect)
      .eq("org_id", member.org_id)
      .gte("appointment_at", nowIso)
      .order("appointment_at", { ascending: true })
      .limit(DEFAULT_LIMIT);
    if (params.status) upcomingQuery = upcomingQuery.eq("status", params.status);
    const { data: upcoming } = await upcomingQuery;

    const remaining = DEFAULT_LIMIT - (upcoming?.length ?? 0);
    let past: typeof upcoming = [];
    if (remaining > 0) {
      let pastQuery = supabase
        .from("appointments")
        .select(baseSelect)
        .eq("org_id", member.org_id)
        .lt("appointment_at", nowIso)
        .order("appointment_at", { ascending: false })
        .limit(remaining);
      if (params.status) pastQuery = pastQuery.eq("status", params.status);
      const { data } = await pastQuery;
      past = data;
    }

    appointments = [...(upcoming ?? []), ...(past ?? [])] as unknown as Appointment[];
  }

  const statuses = ["talep", "onaylandi", "tamamlandi", "iptal", "gelmedi"];

  function statusHref(status?: string) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (params.q) sp.set("q", params.q);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    const qs = sp.toString();
    return qs ? `/dashboard/randevular?${qs}` : "/dashboard/randevular";
  }

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

      <RandevularFilters q={params.q} from={params.from} to={params.to} />

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={statusHref()}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            !params.status ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border hover:bg-accent"
          )}
        >
          {t("all")}
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={statusHref(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              params.status === s
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border hover:bg-accent"
            )}
          >
            {t(STATUS_LABEL_KEYS[s])}
          </Link>
        ))}
      </div>

      {isFiltered && (
        <p className="text-xs text-muted-foreground">
          {t("randevularPage.resultCount", { count: appointments?.length ?? 0 })}
        </p>
      )}

      {/* Appointments list */}
      <div className="space-y-2">
        {!appointments || appointments.length === 0 ? (
          <Card className="kpi-tile border-0 shadow-none">
            <CardContent className="py-14 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{t("randevularPage.empty")}</p>
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
