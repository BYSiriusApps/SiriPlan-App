import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Play, Calendar, Users, TrendingUp, Bot, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/seo/alternates";

const FEATURE_META = [
  { key: "booking", icon: Calendar, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { key: "crm", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "revenue", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "ai", icon: Bot, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { key: "gamification", icon: Star, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: "SiriPlan Demo",
    description: t("demoPage.metaDescription"),
    alternates: await buildAlternates("/demo"),
  };
}

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "SiriPlan Demo",
  description:
    "SiriPlan canlı uygulama tanıtımı: takvim, müşteri, personel, stok, kampanya, paket, gelir-gider ve raporlar.",
  thumbnailUrl: "https://siriplan.com/video/siriplan-demo-poster.jpg",
  contentUrl: "https://siriplan.com/video/siriplan-demo.mp4",
  uploadDate: "2026-10-10",
  duration: "PT1M9S",
  inLanguage: "tr",
  publisher: { "@id": "https://siriplan.com/#organization" },
};

export default async function DemoPage() {
  const t = await getTranslations();

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs">
            <Play className="w-3 h-3 text-primary" />
            {t("demoPage.heroBadge")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {t("demoPage.heroTitle")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("demoPage.heroSubtitle")}
          </p>
        </div>

        {/* Demo video — uygulama ekran kayıtları + altyazı (public/video) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
        <div className="max-w-3xl mx-auto mb-16">
          <div className="relative rounded-2xl overflow-hidden border border-border aspect-video shadow-xl bg-black">
            <video
              className="absolute inset-0 w-full h-full"
              controls
              playsInline
              preload="metadata"
              poster="/video/siriplan-demo-poster.jpg"
              aria-label={t("demoPage.videoTitle")}
            >
              <source src="/video/siriplan-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* Features grid */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("demoPage.featuresTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_META.map((f) => (
              <Card key={f.key} className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{t(`demoPage.features.${f.key}.title`)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`demoPage.features.${f.key}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-4">{t("demoPage.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("demoPage.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/kayit">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 h-12 px-8">
                {t("demoPage.ctaPrimary")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="mailto:info@bysirius.com">
              <Button size="lg" variant="outline" className="h-12 px-8">
                {t("demoPage.ctaSecondary")}
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {t("demoPage.footNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
