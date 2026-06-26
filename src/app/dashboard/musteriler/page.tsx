import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Users, Phone, Star, Calendar } from "lucide-react";
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
  searchParams: Promise<{ q?: string; sort?: string }>;
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
    .from("customers")
    .select("*")
    .eq("org_id", member.org_id)
    .limit(200);

  if (params.q) {
    query = query.ilike("full_name", `%${params.q}%`);
  }

  const sortBy = params.sort || "last_visit";
  if (sortBy === "score") query = query.order("score", { ascending: false });
  else if (sortBy === "spend") query = query.order("total_spend", { ascending: false });
  else if (sortBy === "visits") query = query.order("visit_count", { ascending: false });
  else query = query.order("last_visit_at", { ascending: false, nullsFirst: false });

  const { data: customers } = await query;

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
          <p className="text-muted-foreground text-sm">{customers?.length || 0} müşteri</p>
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
        <div className="flex gap-1">
          {sorts.map((s) => (
            <Link
              key={s.value}
              href={`/dashboard/musteriler?sort=${s.value}${params.q ? `&q=${params.q}` : ""}`}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                sortBy === s.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
              )}
            >
              {s.label}
            </Link>
          ))}
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
          (customers as Customer[]).map((cust) => (
            <Link key={cust.id} href={`/dashboard/musteriler/${cust.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-200 dark:from-primary/30 dark:to-fuchsia-900 flex items-center justify-center font-semibold text-primary">
                        {cust.full_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{cust.full_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {cust.phone}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", scoreColor(cust.score))}>
                      {scoreEmoji(cust.score)} {cust.score}
                    </Badge>
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
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
