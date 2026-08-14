import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

const INTEGRATION_META = [
  { key: "whatsapp", emoji: "💬", status: "active" },
  { key: "instagram", emoji: "📸", status: "active" },
  { key: "googleCalendar", emoji: "📅", status: "soon" },
  { key: "stripe", emoji: "💳", status: "active" },
  { key: "email", emoji: "📧", status: "active" },
  { key: "googleAnalytics", emoji: "📊", status: "soon" },
  { key: "sms", emoji: "🔔", status: "active" },
  { key: "qr", emoji: "📱", status: "active" },
  { key: "ai", emoji: "🤖", status: "active" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("footer.integrations"),
    description: t("integrationsPage.metaDescription"),
  };
}

export default async function EntegrasyonlarPage() {
  const t = await getTranslations();

  const STATUS_STYLE: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  const STATUS_LABEL: Record<string, string> = {
    active: t("integrationsPage.statusActive"),
    soon: t("integrationsPage.statusSoon"),
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Plug className="w-3.5 h-3.5" />
            {t("integrationsPage.heroEyebrow")}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {t("integrationsPage.heroTitle")}<br />
            <span className="brand-gradient-text">{t("integrationsPage.heroTitleHighlight")}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("integrationsPage.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INTEGRATION_META.map((int) => (
              <div key={int.key} className="flex flex-col gap-3 p-5 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{int.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm">{t(`integrationsPage.items.${int.key}.name`)}</p>
                      <p className="text-[10px] text-muted-foreground">{t(`integrationsPage.items.${int.key}.category`)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[int.status]}`}>
                    {STATUS_LABEL[int.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(`integrationsPage.items.${int.key}.desc`)}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center">
            <h3 className="font-bold mb-2">{t("integrationsPage.missingTitle")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("integrationsPage.missingDesc")}
            </p>
            <a href="mailto:info@bysirius.com?subject=Entegrasyon Önerisi">
              <Button variant="outline" className="gap-2">
                {t("integrationsPage.missingButton")} <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-3">{t("integrationsPage.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("integrationsPage.ctaSubtitle")}</p>
          <Link href="/auth/kayit">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              {t("integrationsPage.ctaButton")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
