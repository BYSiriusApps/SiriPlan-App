import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cn, sanitizeFilterValue } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import type { Appointment } from "@/types/database";
import { RandevularHeader } from "@/components/dashboard/RandevularHeader";
import { RandevuCard } from "@/components/dashboard/RandevuCard";
import { RandevularFilters } from "@/components/dashboard/RandevularFilters";
import { STATUS_LABEL_KEYS } from "@/lib/appointment-status";
import { DEFAULT_ORG_TIMEZONE, istanbulDateStr, zonedWallTimeToUtc } from "@/lib/istanbul-time";

const DEFAULT_LIMIT = 100;
const SEARCH_LIMIT = 300;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-08-19" → "2026-08-20". Aralık üst sınırını "ertesi günün 00:00'ı" olarak kurmak için. */
function nextDayStr(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * URL'den gelen tarih parametresi. Biçim tutmuyorsa yok sayılır: bozuk bir
 * değer aşağıdaki dönüşümde Invalid Date üretip toISOString()'de sayfayı
 * komple çökertirdi (randevu listesi asla erişilemez hâle gelmemeli).
 */
function safeDay(value: string | undefined): string | undefined {
  if (!value || !DAY_RE.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
    ? value
    : undefined;
}

export default async function RandevularPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    /** Personel kırılımı — geçerli bir UUID değilse yok sayılır. */
    personel?: string;
    /** "yeni" (yeniden eskiye) | "eski" (eskiden yeniye) */
    sirala?: string;
    /** "1" → yalnızca bugünün randevuları (işletmenin saat dilimine göre) */
    bugun?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const user = await getSessionUser();
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

  // Tarih filtreleri işletmenin saat diliminde yorumlanır. Sunucu UTC'de
  // çalıştığı için `new Date("2026-08-19T00:00:00")` İstanbul'da günün ilk üç
  // saatini (00:00–03:00) aralığın dışında bırakıyordu.
  // Saat dilimi üyelik sorgusundan geliyor (bkz. active-org.ts MEMBER_SELECT).
  const orgTimezone = member.organizations?.timezone || DEFAULT_ORG_TIMEZONE;

  const searchTerm = params.q?.trim();
  const todayOnly = params.bugun === "1";
  // PostgREST'e ham parametre geçmemek için: yalnızca UUID biçimi kabul edilir.
  const staffFilter =
    params.personel && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.personel)
      ? params.personel
      : undefined;
  const sortParam = params.sirala === "yeni" || params.sirala === "eski" ? params.sirala : undefined;

  const todayStr = istanbulDateStr(new Date(), orgTimezone);
  const fromDay = safeDay(params.from);
  const toDay = safeDay(params.to);
  const hasDateRange = !!(fromDay || toDay);
  // Aramada veya tarih aralığında son 100 kaydın dışına çıkmak gerekir —
  // geçmiş randevular sistemde saklı kalır, sadece varsayılan listede görünmez.
  const isFiltered = !!searchTerm || hasDateRange || todayOnly || !!staffFilter || !!sortParam;

  const baseSelect = "*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name, duration_minutes)";

  let appointments: Appointment[] | null;

  if (isFiltered) {
    // Sıralama: kullanıcı bir düğmeye bastıysa o kazanır. Basmadıysa tek bir
    // güne bakılıyorsa (Bugün) sabahtan akşama, aksi halde yeniden eskiye —
    // geçmişe dönük aramada en son randevu en üstte olsun.
    const ascending = sortParam ? sortParam === "eski" : todayOnly;

    let query = supabase
      .from("appointments")
      .select(baseSelect)
      .eq("org_id", member.org_id)
      .order("appointment_at", { ascending })
      .limit(SEARCH_LIMIT);

    if (params.status) query = query.eq("status", params.status);
    if (staffFilter) query = query.eq("staff_id", staffFilter);
    if (todayOnly) {
      query = query
        .gte("appointment_at", zonedWallTimeToUtc(todayStr, "00:00", orgTimezone).toISOString())
        .lt("appointment_at", zonedWallTimeToUtc(nextDayStr(todayStr), "00:00", orgTimezone).toISOString());
    }
    if (searchTerm) {
      // PostgREST filtre dilinde anlamı olan karakterler temizlenir
      // (bkz. lib/utils.ts → sanitizeFilterValue).
      const safeTerm = sanitizeFilterValue(searchTerm);
      if (safeTerm) {
        query = query.or(`customer_name.ilike.%${safeTerm}%,customer_phone.ilike.%${safeTerm}%`);
      }
    }
    if (!todayOnly && fromDay) {
      query = query.gte("appointment_at", zonedWallTimeToUtc(fromDay, "00:00", orgTimezone).toISOString());
    }
    if (!todayOnly && toDay) {
      query = query.lt("appointment_at", zonedWallTimeToUtc(nextDayStr(toDay), "00:00", orgTimezone).toISOString());
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
    if (fromDay) sp.set("from", fromDay);
    if (toDay) sp.set("to", toDay);
    // Durum sekmesi değişince diğer filtreler kaybolmasın.
    if (staffFilter) sp.set("personel", staffFilter);
    if (sortParam) sp.set("sirala", sortParam);
    if (todayOnly) sp.set("bugun", "1");
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
        currentStaffId={member.staff_id}
      />

      <RandevularFilters
        q={params.q}
        from={fromDay}
        to={toDay}
        staff={(staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name }))}
        staffId={staffFilter}
        sort={sortParam}
        bugun={todayOnly}
      />

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
