import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, Check, Star, Bot, MessageSquare, Zap, BarChart3, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { formatPrice, getAnnualMonthlyEquivalent, getAnnualSavings, getVisitorPricing } from "@/lib/pricing";

// Fiyatlar ziyaretçinin ülkesine göre değiştiği için (bkz. lib/pricing.ts)
// sayfa istek başına render edilmeli; statik üretilirse tüm ziyaretçiler
// build anındaki tek para birimini görürdü.
export const dynamic = "force-dynamic";

const ADDON_META = [
  { key: "whatsappAI", icon: Bot },
  { key: "sms", icon: MessageSquare },
  { key: "multiBranch", icon: Zap },
  { key: "premiumAnalytics", icon: BarChart3 },
  { key: "dataMigration", icon: Gift },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("nav.pricing"),
    description: t("pricingPage.metaDescription"),
  };
}

export default async function FiyatlarPage() {
  const t = await getTranslations();
  const pricing = getVisitorPricing(await headers());
  const planMeta = ([
    { key: "starter", href: "/auth/kayit", highlight: false },
    { key: "pro", href: "/auth/kayit", highlight: true },
    { key: "business", href: "/iletisim", highlight: false },
  ] as const).map((plan) => {
    const details = pricing.plans[plan.key];
    return {
      ...plan,
      monthly: formatPrice(details.monthly, pricing.currency),
      annual: formatPrice(getAnnualMonthlyEquivalent(details.monthly, details.annual), pricing.currency),
      annualTotal: formatPrice(details.annual, pricing.currency),
      save: formatPrice(getAnnualSavings(details.monthly, details.annual), pricing.currency),
    };
  });

  const faqs = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`pricingPage.faq.q${n}`),
    a: t(`pricingPage.faq.a${n}`),
  }));

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1 text-xs">
            <Check className="w-3 h-3 text-primary" />
            {t("pricingPage.heroBadge")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {t("pricingPage.heroTitle")}<br />
            <span className="brand-gradient-text">{t("pricingPage.heroTitleHighlight")}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("pricingPage.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planMeta.map((plan) => {
              const features = t.raw(`pricing.${plan.key}.features`) as string[];
              const notIncluded = (t.raw(`pricing.${plan.key}.notIncluded`) as string[] | undefined) ?? [];
              return (
                <Card
                  key={plan.key}
                  className={`relative flex flex-col overflow-visible ${plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02] z-10"
                    : "border-border"
                    }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs px-3 shadow-md">
                        {t("pricing.mostPopular")}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col flex-1">
                    <div className="mb-6">
                      <h3 className="font-bold text-xl mb-1">{t(`pricing.${plan.key}.name`)}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{t(`pricing.${plan.key}.desc`)}</p>
                      <div className="mb-1">
                        <span className="text-4xl font-bold">{plan.monthly}</span>
                        <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("pricing.annualLabel", {
                          annual: plan.annual,
                          total: plan.annualTotal,
                          save: plan.save,
                        })}
                      </p>
                    </div>

                    <Link href={plan.href} className="block mb-6">
                      <Button
                        className={`w-full ${plan.highlight ? "bg-primary hover:bg-primary/90" : ""}`}
                        variant={plan.highlight ? "default" : "outline"}
                      >
                        {plan.key === "business" ? t("pricing.contactUs") : t("pricing.startTrial")}
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>

                    <ul className="space-y-2.5 flex-1">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{f}</span>
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
      </section>

      {/* Add-ons */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("addons.title")}</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              {t("addons.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADDON_META.map((a) => (
              <div key={a.key} className="flex items-start gap-4 p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-all">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm">{t(`addons.${a.key}.name`)}</span>
                    <span className="text-primary font-bold text-xs shrink-0">{t(`addons.${a.key}.price`)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`addons.${a.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t("pricingPage.faqTitle")}</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="p-5 bg-card rounded-xl border border-border">
                <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">{t("pricingPage.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("pricingPage.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                {t("pricingPage.ctaPrimary")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/iletisim">
              <Button variant="outline" className="gap-2">
                {t("pricingPage.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
