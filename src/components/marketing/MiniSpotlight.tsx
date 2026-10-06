import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, type PricingCurrency, type PlanPricing } from "@/lib/pricing";

/**
 * Mini planı ana sayfada öne çıkaran bant. Fiyat ve özellik listesi mevcut
 * kaynaklardan (lib/pricing + pricing.mini.features) gelir; plan davranışı
 * değişmez, sadece mevcut kayıt akışına (?plan=mini) bağlanır.
 */
export async function MiniSpotlight({
  currency,
  mini,
}: {
  currency: PricingCurrency;
  mini: PlanPricing;
}) {
  const t = await getTranslations();
  const features = t.raw("pricing.mini.features") as string[];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-amber-400/10 p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_1.1fr]">
            <div>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t("homeVisual.mini.badge")}
              </span>
              <h2 className="mb-3 text-3xl font-bold md:text-4xl">{t("homeVisual.mini.title")}</h2>
              <p className="mb-6 text-muted-foreground">{t("pricing.mini.desc")}</p>
              <div className="mb-6 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight text-primary">
                  {formatPrice(mini.monthly, currency)}
                </span>
                <span className="pb-1.5 text-muted-foreground">{t("pricing.perMonth")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/auth/kayit">
                  <Button size="lg" className="h-12 gap-2 px-8 text-base shadow-lg shadow-primary/20">
                    {t("homeVisual.mini.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth/kayit?plan=mini&billing=monthly">
                  <Button size="lg" variant="ghost" className="h-12 px-4 text-sm text-muted-foreground hover:text-foreground">
                    {t("pricing.buyNowWithPrice", { price: `${formatPrice(mini.monthly, currency)}${t("pricing.perMonth")}` })}
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t("pricing.bottomNote")}</p>
            </div>

            <ul className="grid gap-2.5 sm:grid-cols-1">
              {features.slice(0, 8).map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
