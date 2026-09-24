"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatPrice,
  getAnnualMonthlyEquivalent,
  getAnnualSavings,
  type PlanKey,
  type PlanPricing,
  type PricingCurrency,
} from "@/lib/pricing";

type BillingCycle = "monthly" | "annual";

const PLAN_ORDER = [
  { key: "starter", highlight: false },
  { key: "pro", highlight: true },
  { key: "business", highlight: false },
] as const;

type PricingCardsProps = {
  currency: PricingCurrency;
  plans: Record<PlanKey, PlanPricing>;
  /** "full" = fiyatlar sayfası (notIncluded listesi + daha büyük kart), "home" = anasayfa özeti */
  variant?: "home" | "full";
};

export function PricingCards({ currency, plans, variant = "home" }: PricingCardsProps) {
  const t = useTranslations();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const isFull = variant === "full";

  const planMeta = PLAN_ORDER.map((plan) => {
    const details = plans[plan.key];
    const annualMonthly = getAnnualMonthlyEquivalent(details.monthly, details.annual);
    const displayAmount = billing === "annual" ? annualMonthly : details.monthly;
    return {
      ...plan,
      display: formatPrice(displayAmount, currency),
      monthly: formatPrice(details.monthly, currency),
      annual: formatPrice(annualMonthly, currency),
      annualTotal: formatPrice(details.annual, currency),
      save: formatPrice(getAnnualSavings(details.monthly, details.annual), currency),
    };
  });

  return (
    <div>
      {/* Aylık / Yıllık geçiş */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border gap-1 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
              billing === "monthly"
                ? "bg-background text-foreground shadow border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("pricing.monthly")}
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
              billing === "annual"
                ? "bg-background text-foreground shadow border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("pricing.annual")}
            <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
              {t("pricing.annualSave")}
            </span>
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isFull ? "" : "max-w-5xl mx-auto"}`}>
        {planMeta.map((plan) => {
          const features = t.raw(`pricing.${plan.key}.features`) as string[];
          const notIncluded = isFull
            ? ((t.raw(`pricing.${plan.key}.notIncluded`) as string[] | undefined) ?? [])
            : [];
          const isBusiness = plan.key === "business";
          const buyHref = `/auth/kayit?plan=${plan.key}&billing=${billing}`;
          const buyPriceLabel = billing === "annual"
            ? `${plan.annualTotal}${t("pricing.perYear")}`
            : `${plan.monthly}${t("pricing.perMonth")}`;
          const href = isBusiness ? buyHref : "/auth/kayit";
          const ctaLabel = isBusiness
            ? t("pricing.buyNowWithPrice", { price: buyPriceLabel })
            : t("pricing.startTrial");

          return (
            <Card
              key={plan.key}
              className={`relative overflow-visible ${isFull ? "flex flex-col" : ""} ${
                plan.highlight
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02] z-10"
                  : "border-border"
              }`}
            >
              {plan.highlight && (
                <div className={`absolute ${isFull ? "-top-3.5" : "-top-3"} left-1/2 -translate-x-1/2`}>
                  <Badge className={`bg-primary text-primary-foreground text-xs px-3 ${isFull ? "shadow-md" : ""}`}>
                    {t("pricing.mostPopular")}
                  </Badge>
                </div>
              )}
              <CardContent className={`p-6 ${isFull ? "flex flex-col flex-1" : ""}`}>
                <div className={isFull ? "mb-6" : undefined}>
                  <h3 className={`font-bold ${isFull ? "text-xl" : "text-lg"} mb-1`}>{t(`pricing.${plan.key}.name`)}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{t(`pricing.${plan.key}.desc`)}</p>
                  <div className="mb-1">
                    <span className={`${isFull ? "text-4xl" : "text-3xl"} font-bold`}>{plan.display}</span>
                    <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
                  </div>
                  <p className={`text-xs text-muted-foreground ${isFull ? "" : "mb-6"}`}>
                    {billing === "annual"
                      ? t("pricing.annualBilledNote", { total: plan.annualTotal, monthly: plan.monthly })
                      : t("pricing.annualLabel", { annual: plan.annual, total: plan.annualTotal, save: plan.save })}
                  </p>
                </div>

                <div className="space-y-1.5 mb-6">
                  <Link href={href} className="block">
                    <Button
                      className={`w-full ${
                        plan.highlight || isBusiness ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""
                      }`}
                      variant={plan.highlight || isBusiness ? "default" : "outline"}
                    >
                      {ctaLabel}
                      {isFull && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                    </Button>
                  </Link>
                  {!isBusiness && (
                    <Link href={buyHref} className="block">
                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                        {t("pricing.buyNowWithPrice", { price: buyPriceLabel })}
                      </Button>
                    </Link>
                  )}
                </div>

                <ul className={`space-y-2.5 ${isFull ? "flex-1" : ""}`}>
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className={isFull ? "text-foreground" : "text-muted-foreground"}>{f}</span>
                    </li>
                  ))}
                  {notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs opacity-40">
                      <span className="w-3.5 h-3.5 shrink-0 mt-0.5 text-center text-[10px]">✕</span>
                      <span className="text-muted-foreground line-through">{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        {t("pricing.bottomNote")}
      </p>
    </div>
  );
}
