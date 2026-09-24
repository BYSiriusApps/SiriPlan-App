import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { HomeButton } from "@/components/dashboard/HomeButton";
import type { CustomerPackage } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PaketlerPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) redirect("/auth/giris");

  const member = await getActiveMember(supabase);
  if (!member) redirect("/auth/kayit");

  const currency =
    ((member.organizations?.settings_json as Record<string, unknown> | null)?.currency as string) || "TRY";

  const { data } = await supabase
    .from("customer_packages")
    .select("*, service:services(id, name), customer:customers(id, full_name, phone)")
    .eq("org_id", member.org_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const packages = ((data ?? []) as CustomerPackage[])
    .map((p) => ({ ...p, remaining: p.total_sessions - p.used_sessions }))
    .sort((a, b) => a.remaining - b.remaining);

  const today = new Date().toISOString().slice(0, 10);
  const lowOrExpiring = packages.filter(
    (p) => p.remaining <= 1 || (p.expires_at && p.expires_at <= today),
  );

  const totalRemaining = packages.reduce((s, p) => s + p.remaining, 0);
  const prepaidValue = packages.reduce((s, p) => {
    if (!p.total_sessions || !Number(p.price_paid)) return s;
    return s + (Number(p.price_paid) / p.total_sessions) * p.remaining;
  }, 0);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">
            Seans Takibi
          </span>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-violet-500" />
            Paketler
          </h1>
          <p className="text-muted-foreground text-sm">
            Aktif peşin seans paketleri. Randevu tamamlandıkça seans otomatik düşer.
          </p>
        </div>
        <HomeButton />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aktif paket", value: String(packages.length) },
          { label: "Kalan seans", value: String(totalRemaining) },
          { label: "Peşin bakiye (yakl.)", value: formatMoney(prepaidValue, currency) },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-tile p-3 text-center">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-lg md:text-xl font-bold mt-0.5 tabular-nums tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      {lowOrExpiring.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-none">
          <CardContent className="p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>{lowOrExpiring.length}</strong> pakette 1 seans kaldı ya da süresi doldu — yenileme
              için müşteriyle iletişime geçin.
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Aktif paket yok. Müşteri sayfasından &ldquo;Paket Sat&rdquo; ile ekleyin.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {packages.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/musteriler/${p.customer_id}`}
                  className="flex items-center gap-3 px-3 py-3 data-row transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.customer?.full_name ?? "Müşteri"} — {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.service?.name ?? "Hizmete bağlı değil"}
                      {p.expires_at ? ` · son ${new Date(p.expires_at).toLocaleDateString("tr-TR")}` : ""}
                    </p>
                  </div>
                  <div className="w-24 hidden sm:flex gap-0.5">
                    {Array.from({ length: Math.min(p.total_sessions, 12) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 h-2 rounded-full",
                          i < p.used_sessions ? "bg-violet-500" : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 tabular-nums",
                      p.remaining <= 1 ? "border-amber-300 text-amber-700 dark:text-amber-400" : "",
                    )}
                  >
                    {p.remaining} / {p.total_sessions}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
