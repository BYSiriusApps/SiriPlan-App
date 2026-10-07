import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight, Star, Zap, TrendingUp, Shield, Sparkles,
  FileDown, Bell, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";
import { getVisitorPricing } from "@/lib/pricing";
import { buildAlternates, localizedUrl } from "@/lib/seo/alternates";
import type { Locale } from "@/lib/i18n/resolve-locale";
import { AppStoreBadges } from "@/components/marketing/AppStoreBadges";
import { PricingCards } from "@/components/marketing/PricingCards";
import { AddonsSection } from "@/components/marketing/AddonsSection";
import { MiniSpotlight } from "@/components/marketing/MiniSpotlight";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { LiveTicker } from "@/components/marketing/LiveTicker";
import { WebsiteShowcase } from "@/components/marketing/WebsiteShowcase";
import { MobileShowcase } from "@/components/marketing/MobileShowcase";
import { SectorShowcase } from "@/components/marketing/SectorShowcase";
import { HeroPanelCard } from "@/components/marketing/HeroPanelCard";
import { FeatureBento } from "@/components/marketing/FeatureBento";

// Demo ortamı şu an yok — buton geçici olarak gizli, altyapı (/demo route'u) korunuyor.
const DEMO_ENABLED = false;

export const dynamic = "force-dynamic";

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const alternates = await buildAlternates("/");
  // root layout'taki openGraph tüm alanları (title/description/image) taşır;
  // sayfa seviyesinde openGraph set etmek Next.js'te TÜMÜNÜ replace eder
  // (bkz. node_modules/next/dist/docs/.../generate-metadata.md#merging), bu
  // yüzden sadece url'i canonical ile eşleştirip gerisini parent'tan devralıyoruz.
  const parentOpenGraph = (await parent).openGraph;
  return {
    alternates,
    openGraph: {
      ...parentOpenGraph,
      url: alternates.canonical,
    },
  };
}

const CATEGORY_META = [
  { key: "hairdresser", icon: "💇‍♀️" },
  { key: "barber",      icon: "💈"    },
  { key: "beauty",      icon: "💅"    },
  { key: "spa",         icon: "🧖"    },
  { key: "nail",        icon: "💅"    },
  { key: "aesthetic",   icon: "✨"    },
  { key: "makeup",      icon: "💄"    },
  { key: "tattoo",      icon: "🖋"    },
  { key: "dietitian",   icon: "🥗"    },
  { key: "eyebrow",     icon: "👁"    },
  { key: "petGrooming", icon: "🐾"    },
] as const;

const testimonials = [
  {
    name: "Ayşe Kaya",
    role: "Elegans Kuaför — İstanbul",
    avatar: "AK",
    text: "Eski sistemimiz sürekli çöküyordu. SiriPlan'a geçtik, verilerimizi 20 dakikada aktardık. Artık WhatsApp'tan gelen sorulara AI yanıt veriyor, ben sadece hizmetimi sunuyorum.",
    stars: 5,
  },
  {
    name: "Mehmet Demir",
    role: "Prestige Berber — Ankara",
    avatar: "MD",
    text: "Haftanın Elemanı sistemi personelimi çok motive etti. Ciro takibi ve personel komisyon raporu artık çok kolay. AI asistanı sayesinde mesai saatleri dışında bile randevu alıyoruz.",
    stars: 5,
  },
  {
    name: "Fatma Şahin",
    role: "Lotus SPA — İzmir",
    avatar: "FŞ",
    text: "3 şube yönetimi artık tek ekrandan. Müşteri skorlama sistemi sayesinde sadık müşterilerimizi tanıyıp özel kampanyalar yapıyoruz. Doluluk oranımız %40 arttı.",
    stars: 5,
  },
];

export default async function HomePage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const pricing = getVisitorPricing(await headers());

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("home.breadcrumbLabel"),
        item: localizedUrl("/", locale),
      },
    ],
  };

  const stats = [
    { value: "100+",   label: t("stats.businesses")  },
    { value: "4.000+", label: t("stats.appointments") },
    { value: "%99.9",  label: t("stats.uptime")       },
    { value: "4.8/5",  label: t("stats.satisfaction") },
  ];

  const faqItems = [
    { q: t("home.faq.q1"), a: t("home.faq.a1") },
    { q: t("home.faq.q2"), a: t("home.faq.a2") },
    { q: t("home.faq.q3"), a: t("home.faq.a3") },
    { q: t("home.faq.q4"), a: t("home.faq.a4") },
    { q: t("home.faq.q5"), a: t("home.faq.a5") },
    { q: t("home.faq.q6"), a: t("home.faq.a6") },
  ];

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bysirius-watermark pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative text-center lg:text-left">
              <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
                <Sparkles className="w-3 h-3 text-primary" />
                {t("hero.badge")}
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                {t.rich("hero.title", {
                  highlight: (chunks) => (
                    <span className="brand-gradient-text">{chunks}</span>
                  ),
                })}
              </h1>

              <p className="text-lg text-muted-foreground mb-3 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t("hero.subtitle")}
              </p>

              <p className="text-base font-semibold text-primary mb-8">
                {t("hero.subtitleHighlight")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/auth/kayit">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 h-12 px-8 text-base">
                    {t("hero.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                {DEMO_ENABLED && (
                  <Link href="/demo">
                    <Button size="lg" variant="outline" className="h-12 px-8 text-base gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t("hero.ctaSecondary")}
                    </Button>
                  </Link>
                )}
              </div>

              <div className="mb-6 flex flex-col items-center lg:items-start gap-2">
                <AppStoreBadges className="justify-center lg:justify-start" />
                <p className="text-xs text-muted-foreground">{t("homeVisual.storeNote")}</p>
              </div>
              <div className="mb-6 flex items-center justify-center gap-3 lg:justify-start">
                <div className="flex -space-x-2.5" aria-hidden="true">
                  {[
                    { src: "/sectors/berber.jpg", pos: "object-[38%_22%]" },
                    { src: "/sectors/diyetisyen.jpg", pos: "object-[28%_28%]" },
                    { src: "/sectors/spa.jpg", pos: "object-[45%_20%]" },
                    { src: "/sectors/makyaj.jpg", pos: "object-[45%_22%]" },
                  ].map((a) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.src} src={a.src} alt="" className={`h-9 w-9 rounded-full border-2 border-background object-cover ${a.pos}`} />
                  ))}
                </div>
                <div className="text-left text-xs leading-tight text-muted-foreground">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">100+</span> {t("stats.businesses")}
                </div>
              </div>

              <HeroPanelCard />

              <p className="text-sm text-muted-foreground">
                ✓ {t("hero.noCard")} &nbsp;·&nbsp; ✓ {t("hero.trial14")} &nbsp;·&nbsp; ✓ {t("hero.cancelAnytime")}
              </p>
            </div>

            <HeroMockup currency={pricing.currency} />
          </div>
          {/* SEO: uzun tanıtım metni korunur; görsel hiyerarşiyi bozmaması için alta alındı */}
          <p className="mt-16 text-base md:text-lg font-bold text-foreground max-w-3xl mx-auto text-center leading-relaxed">
            {t("hero.intro")}
          </p>
        </div>
      </section>

      <LiveTicker />

      {/* Stats */}
      <section className="py-12 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("categories.title")}</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            {t("categories.subtitle")}
          </p>
          <SectorShowcase />
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORY_META.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-sm font-medium"
              >
                <span>{c.icon}</span>
                <span>{t(`categories.${c.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Features */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("features.subtitle")}
            </p>
          </div>
          <FeatureBento />
        </div>
      </section>

      <WebsiteShowcase />

      <MobileShowcase />

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("homeVisual.steps.title")}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {(["s1", "s2", "s3"] as const).map((k, i) => (
              <div key={k} className="relative rounded-3xl border border-border/60 bg-card p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-semibold">{t(`homeVisual.steps.${k}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`homeVisual.steps.${k}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MiniSpotlight currency={pricing.currency} mini={pricing.plans.mini} />

      {/* Pricing */}
      <section className="py-20" id="fiyatlar">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("pricing.title")}</h2>
            <p className="text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>
          <PricingCards currency={pricing.currency} plans={pricing.plans} variant="home" />
        </div>
      </section>

      <AddonsSection />

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("testimonials.title")}</h2>
            <p className="text-muted-foreground">{t("testimonials.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((tv) => (
              <Card key={tv.name} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: tv.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">&ldquo;{tv.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {tv.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{tv.name}</div>
                      <div className="text-xs text-muted-foreground">{tv.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobil uygulama */}
      <section className="py-16 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <img
              src="/icons/icon-192x192.png"
              alt="SiriPlan"
              className="w-20 h-20 rounded-2xl shadow-lg shrink-0"
            />
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{t("appDownload.title")}</h2>
              <p className="text-muted-foreground text-sm mb-5 max-w-lg">
                {t("appDownload.subtitle")}
              </p>
              <AppStoreBadges className="justify-center md:justify-start" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-12 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>{t("home.trust.ssl")}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>{t("home.trust.uptime")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span>{t("home.trust.kvkk")}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-primary" />
              <span>{t("home.trust.dataOwnership")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>{t("home.trust.infrastructure")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/20 border-y border-border" id="sss">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <HelpCircle className="w-3.5 h-3.5" />
              {t("nav.faq")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("home.faq.title")}</h2>
            <p className="text-muted-foreground">{t("home.faq.subtitle")}</p>
          </div>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-all open:border-primary/30"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-sm pr-4">{item.q}</span>
                  <span className="text-primary shrink-0 text-xl group-open:rotate-45 transition-transform duration-200 leading-none font-light">+</span>
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/sss">
              <span className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
                {t("home.faq.viewAll")} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              {t("home.cta.title")}<br />
              <span className="brand-gradient-text">{t("home.cta.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              {t("home.cta.subtitle")}
            </p>
            <Link href="/auth/kayit">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-2 h-14 px-10 text-lg">
                {t("home.cta.button")}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
