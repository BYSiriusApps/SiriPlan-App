import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Globe, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

const VALUE_META = [
  { key: "innovation", icon: Zap },
  { key: "reliability", icon: Shield },
  { key: "customerFocus", icon: Users },
  { key: "globalVision", icon: Globe },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("footer.about"),
    description: t("aboutPage.metaDescription"),
  };
}

export default async function HakkimizdaPage() {
  const t = await getTranslations();

  const stats = [
    { value: "10+", label: t("aboutPage.stats.sectors") },
    { value: "2.000+", label: t("aboutPage.stats.businesses") },
    { value: "%99.9", label: t("aboutPage.stats.uptime") },
    { value: "7/24", label: t("aboutPage.stats.support") },
  ];

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="py-20 md:py-28 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl">
              Siri<span className="text-primary">plan</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            {t("aboutPage.heroTitle")}<br />
            <span className="brand-gradient-text">{t("aboutPage.heroTitleHighlight")}</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t.rich("aboutPage.heroSubtitle", { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </div>
      </section>

      {/* About BY Sirius */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("aboutPage.aboutTitle")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t.rich("aboutPage.aboutP1", { strong: (chunks) => <strong>{chunks}</strong> })}
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("aboutPage.aboutP2")}
              </p>
              <a href="https://bysirius.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Globe className="w-4 h-4" />
                  {t("aboutPage.websiteButton")}
                </Button>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="p-5 bg-card rounded-xl border border-border text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t("aboutPage.valuesTitle")}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUE_META.map((v) => (
              <div key={v.key} className="flex gap-4 p-5 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <v.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t(`aboutPage.values.${v.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`aboutPage.values.${v.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">{t("aboutPage.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("aboutPage.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/iletisim">
              <Button className="gap-2 bg-primary hover:bg-primary/90">{t("aboutPage.ctaContact")}</Button>
            </Link>
            <a href="https://bysirius.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Globe className="w-4 h-4" />
                {t("aboutPage.websiteButton")}
              </Button>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
