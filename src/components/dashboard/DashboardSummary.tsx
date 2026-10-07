import Link from "next/link";
import {
  TrendingUp, TrendingDown, Wallet, CalendarCheck, Users, UserPlus, Package, Clock,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export type SummaryPeriod = "bugun" | "hafta" | "ay";

export interface SummaryData {
  period: SummaryPeriod;
  /** Finans kutuları (gelir/gider/net) personele gösterilmez. */
  showFinance: boolean;
  income: number;
  revenue: number;
  expense: number;
  net: number;
  apptTotal: number;
  apptDone: number;
  apptCancelled: number;
  newCustomers: number;
  totalCustomers: number;
  criticalStock: number;
  activeItems: number;
  pending: number;
  numLocale: string;
}

const PERIODS: SummaryPeriod[] = ["bugun", "hafta", "ay"];
const PERIOD_KEY: Record<SummaryPeriod, "today" | "week" | "month"> = {
  bugun: "today", hafta: "week", ay: "month",
};

function Tile({
  icon, label, value, hint, tone, href,
}: {
  icon: React.ReactNode; label: string; value: string; hint?: string;
  tone?: "good" | "bad" | "warn"; href?: string;
}) {
  const color =
    tone === "good" ? "var(--chart-2)" : tone === "bad" ? "var(--destructive)" : tone === "warn" ? "var(--chart-4)" : "var(--primary)";
  const inner = (
    <div className="kpi-tile rounded-2xl p-3.5 h-full">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-extrabold tabular-nums text-foreground leading-none truncate">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>
  ) : inner;
}

/** Ana sayfa üst özet şeridi: Bugün / Bu Hafta / Bu Ay seçimiyle ciro, gider, randevu, müşteri ve stok özeti. */
export async function DashboardSummary({ data }: { data: SummaryData }) {
  const t = await getTranslations("dashboard.homePage.summary");
  const money = (n: number) => `₺${n.toLocaleString(data.numLocale)}`;

  return (
    <section className="px-4 pb-3 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h2 className="text-[13px] font-bold tracking-wider uppercase text-primary">{t("title")}</h2>
        <nav className="inline-flex rounded-xl p-1 bg-muted/60 border border-border/60" aria-label={t("title")}>
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={p === "bugun" ? "/dashboard" : `/dashboard?donem=${p}`}
              scroll={false}
              aria-current={data.period === p ? "page" : undefined}
              className={cn(
                "px-3 py-1 rounded-lg text-[12px] font-extrabold transition-colors",
                data.period === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(PERIOD_KEY[p])}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {data.showFinance && (
          <>
            <Tile
              icon={<TrendingUp className="h-4 w-4" />} tone="good"
              label={t("income")} value={money(data.income)}
              hint={t("revenueLine", { amount: money(data.revenue) })}
              href="/dashboard/gelir-gider"
            />
            <Tile
              icon={<TrendingDown className="h-4 w-4" />} tone="bad"
              label={t("expense")} value={money(data.expense)}
              href="/dashboard/gelir-gider"
            />
            <Tile
              icon={<Wallet className="h-4 w-4" />} tone={data.net < 0 ? "bad" : "good"}
              label={t("net")} value={money(data.net)}
              hint={t("extraIncome")}
              href="/dashboard/raporlar"
            />
          </>
        )}
        <Tile
          icon={<CalendarCheck className="h-4 w-4" />}
          label={t("appts")} value={String(data.apptTotal)}
          hint={`${t("completed", { count: data.apptDone })} · ${t("cancelled", { count: data.apptCancelled })}`}
          href="/dashboard/randevular"
        />
        <Tile
          icon={<UserPlus className="h-4 w-4" />}
          label={t("newCustomers")} value={String(data.newCustomers)}
          href="/dashboard/musteriler"
        />
        <Tile
          icon={<Users className="h-4 w-4" />}
          label={t("customers")} value={String(data.totalCustomers)}
          href="/dashboard/musteriler"
        />
        <Tile
          icon={<Package className="h-4 w-4" />} tone={data.criticalStock > 0 ? "warn" : undefined}
          label={t("stock")} value={String(data.activeItems)}
          hint={data.criticalStock > 0 ? t("stockCritical", { count: data.criticalStock }) : t("stockOk")}
          href="/dashboard/stok"
        />
        <Tile
          icon={<Clock className="h-4 w-4" />} tone={data.pending > 0 ? "warn" : undefined}
          label={t("pending")} value={String(data.pending)}
          hint={t("pendingHint")}
          href="/dashboard/bekleyen-istekler"
        />
      </div>
    </section>
  );
}
