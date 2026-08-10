import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rocket, Globe, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

const PERK_META = [
  { key: "remoteWork", icon: Globe },
  { key: "fastGrowth", icon: Zap },
  { key: "benefits", icon: Heart },
  { key: "aiCulture", icon: Rocket },
] as const;

const JOB_KEYS = ["fullstack", "growth", "customerSuccess", "designer"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("footer.careers"),
    description: t("careersPage.metaDescription"),
  };
}

export default async function KariyerPage() {
  const t = await getTranslations();

  const jobs = JOB_KEYS.map((key) => ({
    key,
    title: t(`careersPage.jobs.${key}.title`),
    team: t(`careersPage.jobs.${key}.team`),
    type: t(`careersPage.jobs.${key}.type`),
    tags: t.raw(`careersPage.jobs.${key}.tags`) as string[],
  }));

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Rocket className="w-3.5 h-3.5" />
            {t("careersPage.heroEyebrow")}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {t("careersPage.heroTitle")}<br />
            <span className="brand-gradient-text">{t("careersPage.heroTitleHighlight")}</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            {t("careersPage.heroSubtitle")}
          </p>
          <a href="mailto:kariyer@bysirius.com">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2">
              {t("careersPage.applyButton")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-10">{t("careersPage.perksTitle")}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {PERK_META.map((p) => (
              <div key={p.key} className="flex gap-4 p-5 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t(`careersPage.perks.${p.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`careersPage.perks.${p.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-8">{t("careersPage.openingsTitle")}</h2>
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all group">
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{job.team} · {job.type}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
                <a
                  href={`mailto:kariyer@bysirius.com?subject=Başvuru: ${job.title}`}
                  className="text-sm font-medium text-primary flex items-center gap-1.5 shrink-0 hover:gap-2.5 transition-all"
                >
                  {t("careersPage.applyLink")} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            {t("careersPage.noPositionText")}{" "}
            <a href="mailto:kariyer@bysirius.com" className="text-primary hover:underline font-medium">
              {t("careersPage.openApplication")}
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-3">{t("careersPage.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("careersPage.ctaSubtitle")}
          </p>
          <Link href="/auth/kayit">
            <Button variant="outline" className="gap-2">{t("careersPage.ctaButton")} <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
