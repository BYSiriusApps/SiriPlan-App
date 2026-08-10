import Link from "next/link";
import {
  ArrowRight, Star, Zap, Users, TrendingUp, Shield, Sparkles,
  Check, Bot, Calendar, MessageSquare, BarChart3, FileDown,
  Upload, Bell, Trophy, Gift, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

// Demo ortamı şu an yok — buton geçici olarak gizli, altyapı (/demo route'u) korunuyor.
const DEMO_ENABLED = false;

const FEATURE_META = [
  { key: "booking",   icon: Calendar,       color: "text-rose-500",   bg: "bg-rose-50 dark:bg-rose-950/30"    },
  { key: "ai",        icon: Bot,            color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { key: "crm",       icon: Users,          color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30"  },
  { key: "staff",     icon: Trophy,         color: "text-emerald-500",bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "campaigns", icon: MessageSquare,  color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30"    },
  { key: "analytics", icon: BarChart3,      color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { key: "migration", icon: Upload,         color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-950/30"    },
  { key: "export",    icon: FileDown,       color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
] as const;

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

const PLAN_META = [
  { key: "starter",  monthly: "$39", annual: "$32",  annualTotal: "$384",    highlight: false },
  { key: "pro",      monthly: "$69", annual: "$57",  annualTotal: "$684",    highlight: true  },
  { key: "business", monthly: "$119",annual: "$99",  annualTotal: "$1.188",  highlight: false },
] as const;

const ADDON_META = [
  { key: "whatsappAI",      icon: Bot            },
  { key: "sms",             icon: MessageSquare  },
  { key: "multiBranch",     icon: Zap            },
  { key: "premiumAnalytics",icon: BarChart3      },
  { key: "googleReview",    icon: Star           },
  { key: "dataMigration",   icon: Gift           },
] as const;

const testimonials = [
  {
    name: "Ayşe Kaya",
    role: "Elegans Kuaför — İstanbul",
    avatar: "AK",
    text: "Eski sistemimiz sürekli çöküyordu. Siriplan'a geçtik, verilerimizi 20 dakikada aktardık. Artık WhatsApp'tan gelen sorulara AI yanıt veriyor, ben sadece hizmetimi sunuyorum.",
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

  const stats = [
    { value: "2.000+", label: t("stats.businesses")  },
    { value: "500K+",  label: t("stats.appointments") },
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

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bysirius-watermark pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
            <Sparkles className="w-3 h-3 text-primary" />
            {t("hero.badge")}
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            {t.rich("hero.title", {
              highlight: (chunks) => (
                <span className="brand-gradient-text">{chunks}</span>
              ),
            })}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-3 max-w-2xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <p className="text-base font-semibold text-primary mb-8">
            {t("hero.subtitleHighlight")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
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

          <p className="text-sm text-muted-foreground">
            ✓ {t("hero.noCard")} &nbsp;·&nbsp; ✓ {t("hero.trial14")} &nbsp;·&nbsp; ✓ {t("hero.cancelAnytime")}
          </p>
        </div>
      </section>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURE_META.map((f) => (
              <Card key={f.key} className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">{t(`features.${f.key}.title`)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`features.${f.key}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20" id="fiyatlar">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("pricing.title")}</h2>
            <p className="text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLAN_META.map((plan) => {
              const features = t.raw(`pricing.${plan.key}.features`) as string[];
              return (
                <Card
                  key={plan.key}
                  className={`relative overflow-visible ${plan.highlight ? "border-primary shadow-lg shadow-primary/10 scale-[1.02] z-10" : "border-border"}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs px-3">
                        {t("pricing.mostPopular")}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-1">{t(`pricing.${plan.key}.name`)}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{t(`pricing.${plan.key}.desc`)}</p>
                    <div className="mb-1">
                      <span className="text-3xl font-bold">{plan.monthly}</span>
                      <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-6">
                      {t("pricing.annualLabel", {
                        annual: plan.annual,
                        total: plan.annualTotal,
                        save: t("pricing.annualSave"),
                      })}
                    </p>
                    <Link href="/auth/kayit">
                      <Button
                        className={`w-full mb-6 ${plan.highlight ? "bg-primary hover:bg-primary/90" : ""}`}
                        variant={plan.highlight ? "default" : "outline"}
                      >
                        {plan.key === "business" ? t("pricing.contactUs") : t("pricing.startTrial")}
                      </Button>
                    </Link>
                    <ul className="space-y-2.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
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
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("addons.title")}</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              {t("addons.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
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
