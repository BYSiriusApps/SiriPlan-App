import { createClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { UserCog, Phone, Mail } from "lucide-react";
import { ContactLinks } from "@/components/dashboard/ContactLinks";
import { StaffInviteDialog } from "@/components/dashboard/StaffInviteDialog";
import type { Staff } from "@/types/database";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

const LANG_FLAGS: Record<string, { flag: string; name: string }> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, { flag: l.flag, name: l.name }])
);

export default async function PersonelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const orgId = member.org_id;

  const { data: orgData } = await supabase
    .from("organizations")
    .select("max_staff, settings_json")
    .eq("id", orgId)
    .single();

  const m = { org_id: orgId, role: member.role };
  const maxStaff = (orgData as { max_staff?: number } | null)?.max_staff || 3;
  const settings = ((orgData as { settings_json?: Record<string, unknown> | null } | null)?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhoneButtons = m.role !== "staff" || staffPhoneAccess;

  const [{ data: staff }, { data: badges }] = await Promise.all([
    supabase
      .from("staff")
      .select("*, staff_services(service_id, services(name))")
      .eq("org_id", orgId)
      .order("display_order"),

    supabase
      .from("staff_badges")
      .select("*")
      .eq("org_id", orgId)
      .order("awarded_at", { ascending: false })
      .limit(20),
  ]);

  const badgeMap: Record<string, string[]> = {};
  (badges || []).forEach((b) => {
    if (!badgeMap[b.staff_id]) badgeMap[b.staff_id] = [];
    badgeMap[b.staff_id].push(b.badge_type);
  });

  const BADGE_ICONS: Record<string, string> = {
    superstar: "🌟",
    speedmaster: "⚡",
    customer_fav: "💛",
    rising_star: "📈",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personel</h1>
          <p className="text-muted-foreground text-sm">
            {staff?.length || 0}/{maxStaff} personel kullanılıyor
          </p>
        </div>
        {m.role !== "staff" && (
          <div className="flex items-center gap-2">
            <StaffInviteDialog
              staffList={(staff || []).map((s) => ({ id: s.id, full_name: s.full_name }))}
            />
            {m.role === "owner" && (staff?.length || 0) < maxStaff && (
              <Link
                href="/dashboard/personel/yeni"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                + Personel Ekle
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Limit warning */}
      {(staff?.length || 0) >= maxStaff && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-300">
            Personel limitinize ulaştınız. Daha fazla eklemek için{" "}
            <Link href="/dashboard/abonelik" className="underline font-medium">planınızı yükseltin</Link>.
          </CardContent>
        </Card>
      )}

      {/* Staff grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {!staff || staff.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <UserCog className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Henüz personel eklenmemiş</p>
          </div>
        ) : (
          (staff as (Staff & { staff_services?: { services?: { name: string } }[] })[]).map((s) => (
            <Link key={s.id} href={`/dashboard/personel/${s.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={s.full_name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-200 dark:from-primary/30 dark:to-fuchsia-900 flex items-center justify-center text-lg font-bold text-primary">
                          {s.full_name[0]}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${s.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base group-hover:text-primary transition-colors truncate">
                        {s.full_name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{s.role}</p>
                        {(s as unknown as { preferred_language?: string }).preferred_language && (
                          <span
                            className="text-sm leading-none"
                            title={LANG_FLAGS[(s as unknown as { preferred_language?: string }).preferred_language!]?.name}
                          >
                            {LANG_FLAGS[(s as unknown as { preferred_language?: string }).preferred_language!]?.flag}
                          </span>
                        )}
                      </div>
                      {badgeMap[s.id]?.slice(0, 3).map((b) => (
                        <span key={b} className="text-sm" title={b}>{BADGE_ICONS[b]}</span>
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      %{Math.round(s.commission_rate * 100)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex gap-1 flex-wrap">
                    {(s.working_days as number[])?.map((d) => (
                      <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {DAYS[d]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.start_time} – {s.end_time}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.staff_services?.slice(0, 3).map((ss) => (
                      <Badge key={ss.services?.name} variant="secondary" className="text-[10px]">
                        {ss.services?.name}
                      </Badge>
                    ))}
                    {(s.staff_services?.length || 0) > 3 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{(s.staff_services?.length || 0) - 3}
                      </Badge>
                    )}
                  </div>
                  {(s.phone || s.email) && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {s.phone && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 flex-1 min-w-0">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.phone}</span>
                          </span>
                          {showPhoneButtons && <ContactLinks phone={s.phone} />}
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.email}</span>
                          <ContactLinks email={s.email} />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
