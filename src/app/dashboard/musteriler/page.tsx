import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Users, Phone, Star, Calendar, Megaphone, MegaphoneOff, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Customer } from "@/types/database";

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function scoreEmoji(score: number) {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; kampanya?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(settings_json)")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/kayit");

  type MemberWithOrg = { org_id: string; role: string; organizations: { settings_json: Record<string, unknown> | null } | null };
  const m = member as unknown as MemberWithOrg;
  const settings = (m.organizations?.settings_json ?? {}) as Record<string, unknown>;
  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhoneButtons = m.role !== "staff" || staffPhoneAccess;

  let query = supabase
    .from("customers")
    .select("*")
    .eq("org_id", member.org_id)
    .limit(200);

  if (params.q) {
    query = query.ilike("full_name", `%${params.q}%`);
  }
  if (params.kampanya === "1") {
    query = query.eq("marketing_consent", true);
  }

  const sortBy = params.sort || "last_visit";
  if (sortBy === "score") query = query.order("score", { ascending: false });
  else if (sortBy === "spend") query = query.order("total_spend", { ascending: false });
  else if (sortBy === "visits") query = query.order("visit_count", { ascending: false });
  else query = query.order("last_visit_at", { ascending: false, nullsFirst: false });

  const { data: customers } = await query;

  const onayliSayisi = customers?.filter((c) => c.marketing_consent).length ?? 0;

  const sorts = [
    { value: "last_visit", label: "Son Ziyaret" },
    { value: "score", label: "Skor" },
    { value: "spend", label: "Harcama" },
    { value: "visits", label: "Ziyaret" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-muted-foreground text-sm">
            {customers?.length || 0} müşteri
            {onayliSayisi > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                · {onayliSayisi} kampanya onaylı
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/musteriler/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Müşteri Ekle
        </Link>
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 flex-wrap">
        <form className="flex-1 min-w-[200px]">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Müşteri ara..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </form>
        <div className="flex gap-1 flex-wrap">
          {sorts.map((s) => (
            <Link
              key={s.value}
              href={`/dashboard/musteriler?sort=${s.value}${params.q ? `&q=${params.q}` : ""}${params.kampanya === "1" ? "&kampanya=1" : ""}`}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                sortBy === s.value && params.kampanya !== "1" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
              )}
            >
              {s.label}
            </Link>
          ))}
          <Link
            href={
              params.kampanya === "1"
                ? `/dashboard/musteriler?sort=${sortBy}${params.q ? `&q=${params.q}` : ""}`
                : `/dashboard/musteriler?sort=${sortBy}&kampanya=1${params.q ? `&q=${params.q}` : ""}`
            }
            title="Kampanya bildirimi onaylı müşterileri göster"
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
              params.kampanya === "1"
                ? "bg-green-600 text-white border-green-600"
                : "border-border hover:bg-accent"
            )}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Kampanya Onaylı
          </Link>
        </div>
      </div>

      {/* Customer grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {!customers || customers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Henüz müşteri yok</p>
          </div>
        ) : (
          (customers as Customer[]).map((cust) => {
            const waPhone = (cust.phone ?? "").replace(/\D/g, "").replace(/^0/, "90");
            return (
            <Card key={cust.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/dashboard/musteriler/${cust.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-200 dark:from-primary/30 dark:to-fuchsia-900 flex items-center justify-center font-semibold text-primary shrink-0">
                      {cust.full_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{cust.full_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{cust.phone}</span>
                      </div>
                    </div>
                  </Link>
                  {/* Tel + WA + badge icons */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    {showPhoneButtons && (
                    <div className="flex items-center gap-1">
                      <a href={`tel:${cust.phone}`} title="Ara"
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                        className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    )}
                    <div className="flex items-center gap-1">
                      {cust.marketing_consent ? (
                        <span title="Kampanya bildirimi onaylı">
                          <Megaphone className="h-3.5 w-3.5 text-green-500" />
                        </span>
                      ) : (
                        <span title="Kampanya bildirimi onayı yok">
                          <MegaphoneOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </span>
                      )}
                      <Badge variant="outline" className={cn("text-xs", scoreColor(cust.score))}>
                        {scoreEmoji(cust.score)} {cust.score}
                      </Badge>
                    </div>
                  </div>
                </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Ziyaret</p>
                      <p className="font-semibold text-sm">{cust.visit_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Harcama</p>
                      <p className="font-semibold text-sm">₺{Number(cust.total_spend).toLocaleString("tr-TR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Puan</p>
                      <p className="font-semibold text-sm flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {cust.loyalty_punches}
                      </p>
                    </div>
                  </div>

                  {cust.last_visit_at && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Son: {format(new Date(cust.last_visit_at), "d MMM yyyy", { locale: tr })}
                    </p>
                  )}
              </CardContent>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
