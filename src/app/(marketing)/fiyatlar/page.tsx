import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, Check, Star, BarChart3, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { getVisitorPricing } from "@/lib/pricing";
import { CurrencyToggle } from "@/components/marketing/CurrencyToggle";
import { PricingCards } from "@/components/marketing/PricingCards";
import { AddonsSection } from "@/components/marketing/AddonsSection";

// Fiyatlar ziyaretçinin ülkesine göre değiştiği için (bkz. lib/pricing.ts)
// sayfa istek başına render edilmeli; statik üretilirse tüm ziyaretçiler
// build anındaki tek para birimini görürdü.
export const dynamic = "force-dynamic";

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
          {pricing.currency !== "TRY" && <CurrencyToggle currentCurrency={pricing.currency} />}
          <PricingCards currency={pricing.currency} plans={pricing.plans} variant="full" />
        </div>
      </section>

      <AddonsSection />

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
