import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Star, Calendar, Bot, Users, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

type Params = { slug: string };

// Çeviriye taşınmayan, dilden bağımsız kalan alanlar (emoji + gerçek müşteri adı/salon-şehir).
const SECTOR_META: Record<string, { emoji: string; testimonial?: { name: string; role: string } }> = {
  kuafor: { emoji: "💇‍♀️", testimonial: { name: "Ayşe Kaya", role: "Elegans Kuaför, İstanbul" } },
  berber: { emoji: "💈", testimonial: { name: "Mehmet Demir", role: "Prestige Berber, Ankara" } },
  guzellik: { emoji: "💅" },
  spa: { emoji: "🧖", testimonial: { name: "Fatma Şahin", role: "Lotus SPA, İzmir" } },
  nail: { emoji: "💅" },
  estetik: { emoji: "✨" },
  makyaj: { emoji: "💄" },
  tattoo: { emoji: "🖋" },
  diyetisyen: { emoji: "🥗" },
  kas: { emoji: "👁" },
  "dis-klinigi": { emoji: "🦷" },
  petkuafor: { emoji: "🐾" },
};

const PLATFORM_FEATURE_ICONS = [
  { key: "channels", icon: Calendar },
  { key: "ai", icon: Bot },
  { key: "customerScore", icon: Users },
  { key: "revenue", icon: BarChart3 },
  { key: "gamification", icon: Star },
  { key: "kvkk", icon: Shield },
  { key: "migration", icon: ArrowRight },
  { key: "uptime", icon: Check },
] as const;

export async function generateStaticParams() {
  return Object.keys(SECTOR_META).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  if (!SECTOR_META[slug]) return {};
  const t = await getTranslations("categoryPage");
  const title = t(`sectors.${slug}.title`);
  const desc = t(`sectors.${slug}.desc`);
  const keywords = t.raw(`sectors.${slug}.keywords`) as string[];
  return {
    title: `${title} ${t("metaTitleSuffix")}`,
    description: desc,
    keywords,
    alternates: { canonical: `/kategori/${slug}` },
  };
}

export default async function KategoriPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const meta = SECTOR_META[slug];
  if (!meta) notFound();
  const t = await getTranslations("categoryPage");

  const title = t(`sectors.${slug}.title`);
  const headline = t(`sectors.${slug}.headline`);
  const desc = t(`sectors.${slug}.desc`);
  const features = t.raw(`sectors.${slug}.features`) as string[];
  const testimonialText = meta.testimonial ? t(`sectors.${slug}.testimonialText`) : null;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="text-4xl mb-4">{meta.emoji}</div>
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
            {t("solutionBadge", { title })}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-5">
            {headline}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            {desc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-11 px-7">
                {t("tryFree")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="h-11 px-7">
                {t("watchDemo")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            {t("featuresTitle", { title })}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border"
              >
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key platform features */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-10">{t("platformAdvantagesTitle")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLATFORM_FEATURE_ICONS.map((item) => (
              <Card key={item.key} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-xs mb-1">{t(`platformFeatures.${item.key}.title`)}</p>
                  <p className="text-[10px] text-muted-foreground">{t(`platformFeatures.${item.key}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      {meta.testimonial && testimonialText && (
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-base text-muted-foreground leading-relaxed mb-6 italic">
                  &ldquo;{testimonialText}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                    {meta.testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{meta.testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{meta.testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">
            {t("ctaTitle", { title })}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("ctaSubtitle")}
          </p>
          <Link href="/auth/kayit">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 h-12 px-10">
              {t("ctaButton")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
