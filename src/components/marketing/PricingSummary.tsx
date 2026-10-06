import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  PRICING_BY_CURRENCY,
  PRICING_CURRENCIES,
  formatPrice,
  getAnnualMonthlyEquivalent,
} from "@/lib/pricing";

const PLAN_KEYS = ["mini", "starter", "pro", "business"] as const;

/**
 * Tüm planların GÜNCEL fiyatları — aylık + yıllık, TL / USD / EUR yan yana.
 *
 * Ziyaretçinin ülkesine bakmaz (başlık/çerez okumaz): üç para birimini de
 * her zaman gösterir, bu yüzden blog yazıları ve SSS gibi statik üretilen
 * sayfalarda da güvenle kullanılır. Rakamlar yalnızca lib/pricing.ts'ten
 * gelir — fiyat değişince tüm sayfalar birlikte güncellenir.
 */
export async function PricingSummary({ id = "guncel-fiyatlar", compact = false }: { id?: string; compact?: boolean }) {
  const t = await getTranslations();

  return (
    <section id={id} className={compact ? "py-2" : "py-10"}>
      <div className={compact ? "" : "container mx-auto px-4 max-w-5xl"}>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t("pricing.summary.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("pricing.summary.subtitle")}</p>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${compact ? "" : "lg:grid-cols-4"}`}>
          {PLAN_KEYS.map((plan) => (
            <div key={plan} className="rounded-xl border border-border bg-card p-5 flex flex-col min-w-0">
              <h3 className="font-bold text-lg">{t(`pricing.${plan}.name`)}</h3>
              <p className="text-xs text-muted-foreground mb-4">{t(`pricing.${plan}.desc`)}</p>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1.5">
                {t("pricing.summary.monthly")}
              </p>
              <ul className="space-y-0.5 mb-4">
                {PRICING_CURRENCIES.map((cur) => (
                  <li key={cur} className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
                    <span className="text-xs text-muted-foreground">{cur}</span>
                    <span className="font-semibold">
                      {formatPrice(PRICING_BY_CURRENCY[cur][plan].monthly, cur)}
                      <span className="text-xs font-normal text-muted-foreground">{t("pricing.perMonth")}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1.5">
                {t("pricing.summary.annual")}
              </p>
              <ul className="space-y-0.5">
                {PRICING_CURRENCIES.map((cur) => {
                  const p = PRICING_BY_CURRENCY[cur][plan];
                  return (
                    <li key={cur} className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
                      <span className="text-xs text-muted-foreground">{cur}</span>
                      <span className="font-semibold text-right">
                        {formatPrice(p.annual, cur)}
                        <span className="text-xs font-normal text-muted-foreground">{t("pricing.perYear")}</span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {t("pricing.summary.perMonthEquivalent", {
                            amount: formatPrice(getAnnualMonthlyEquivalent(p.monthly, p.annual), cur),
                          })}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">{t("pricing.summary.note")}</p>
        <div className="text-center mt-3">
          <Link href="/fiyatlar" className="text-sm font-medium text-primary hover:underline underline-offset-4">
            {t("pricing.summary.seeAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
