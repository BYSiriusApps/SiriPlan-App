import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Star, Bot, MessageSquare, Zap, BarChart3, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Fiyatlar",
  description: "Siriplan fiyatlandırma — Starter $39/ay, Pro $69/ay, Business $119/ay. 7 gün ücretsiz deneme, kredi kartı gerekmez.",
};

const plans = [
  {
    name: "Starter",
    monthly: "$39",
    annual: "$32",
    annualTotal: "$384",
    desc: "Küçük salonlar için mükemmel başlangıç",
    features: [
      "1 şube, 3 personel",
      "300 randevu/ay",
      "Online randevu sayfası",
      "WhatsApp hatırlatma",
      "Sadakat kartı sistemi",
      "Temel ciro raporu",
      "Veri export (CSV)",
      "E-posta desteği",
    ],
    notIncluded: [
      "AI WhatsApp asistanı",
      "Kampanya modülü",
      "Müşteri skoru sistemi",
    ],
    cta: "Ücretsiz Dene",
    href: "/auth/kayit",
    highlight: false,
  },
  {
    name: "Pro",
    monthly: "$69",
    annual: "$57",
    annualTotal: "$684",
    desc: "Büyüyen salonlar için tam set",
    features: [
      "1 şube, sınırsız personel",
      "Sınırsız randevu",
      "AI WhatsApp/IG asistanı",
      "Kampanya modülü",
      "Müşteri skoru sistemi",
      "Haftanın Elemanı gamification",
      "Google Calendar sync",
      "Bekleme listesi",
      "PDF rapor export",
      "KDV hesaplama",
      "Öncelikli destek",
    ],
    notIncluded: [],
    cta: "Ücretsiz Dene",
    href: "/auth/kayit",
    highlight: true,
  },
  {
    name: "Business",
    monthly: "$119",
    annual: "$99",
    annualTotal: "$1.188",
    desc: "Çok şubeli işletmeler için",
    features: [
      "Sınırsız şube",
      "Sınırsız personel",
      "Tüm Pro özellikleri",
      "Beyaz etiket (kendi domaininiz)",
      "API erişimi",
      "Öncelikli destek",
      "Özel entegrasyonlar",
      "Dedicated account manager",
      "SLA garantisi",
    ],
    notIncluded: [],
    cta: "Bize Ulaşın",
    href: "/iletisim",
    highlight: false,
  },
];

const addons = [
  { icon: Bot, name: "AI WhatsApp Paketi", price: "$29/ay", desc: "Gelişmiş AI asistanı, duygu analizi, akıllı öneriler" },
  { icon: MessageSquare, name: "SMS Paketi", price: "$19/ay", desc: "1.000 SMS/ay, Twilio altyapısı, teslimat garantisi" },
  { icon: Zap, name: "Ek Şube Paketi", price: "$29/şube/ay", desc: "Starter/Pro'ya ek şube ekleyin" },
  { icon: BarChart3, name: "Premium Analitik", price: "$25/ay", desc: "Personel bordrosu, KPI izleme, özelleştirilebilir raporlar" },
  { icon: Star, name: "Google Yorum & SEO", price: "$15/ay", desc: "Otomatik Google yorum talebi, yerel SEO raporu" },
  { icon: Gift, name: "Profesyonel Veri Göçü", price: "$99 tek seferlik", desc: "Ekibimiz verilerinizi garanti ile aktarır" },
];

const faqs = [
  {
    q: "7 günlük deneme gerçekten ücretsiz mi?",
    a: "Evet, kredi kartı bilgisi gerekmez. 7 gün boyunca Pro özelliklerini kullanın, beğenirseniz devam edin.",
  },
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Her zaman. Herhangi bir uzun dönemli sözleşme veya ceza yok. Aboneliğinizi dashboard'dan anında iptal edebilirsiniz.",
  },
  {
    q: "Verilerimi kaybeder miyim?",
    a: "Hayır. İptal etseniz bile 30 gün boyunca verilerinize erişebilir, JSON/Excel olarak indirebilirsiniz.",
  },
  {
    q: "Faturalama nasıl çalışıyor?",
    a: "Stripe ile güvenli ödeme. Aylık veya yıllık seçebilirsiniz. Yıllıkta %18 tasarruf edersiniz.",
  },
  {
    q: "Birden fazla şube yönetebilir miyim?",
    a: "Business planında sınırsız şube yönetebilirsiniz. Starter/Pro için Ek Şube Paketi eklenerek genişletilebilir.",
  },
];

export default function FiyatlarPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1 text-xs">
            <Check className="w-3 h-3 text-primary" />
            7 Gün Ücretsiz — Kredi Kartı Gerekmez
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Şeffaf Fiyatlandırma,<br />
            <span className="brand-gradient-text">Sürpriz Yok</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            İşletmenizin büyüklüğüne göre plan seçin. İstediğiniz zaman yükseltin, düşürün veya iptal edin.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${plan.highlight
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border"
                  }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs px-3 shadow-md">
                      En Çok Tercih Edilen
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="mb-6">
                    <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                    <div className="mb-1">
                      <span className="text-4xl font-bold">{plan.monthly}</span>
                      <span className="text-muted-foreground text-sm">/ay</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      veya {plan.annual}/ay · {plan.annualTotal}/yıl{" "}
                      <span className="text-emerald-600 font-semibold">(%18 tasarruf)</span>
                    </p>
                  </div>

                  <Link href={plan.href} className="block mb-6">
                    <Button
                      className={`w-full ${plan.highlight ? "bg-primary hover:bg-primary/90" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs opacity-40">
                        <span className="w-3.5 h-3.5 shrink-0 mt-0.5 text-center text-[10px]">✕</span>
                        <span className="text-muted-foreground line-through">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            7 gün ücretsiz deneme · Kredi kartı gerekmez · İstediğin zaman iptal · Verileriniz her zaman sizin
          </p>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Ek Paketler</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Herhangi bir plana ekleyebileceğiniz modüler paketler
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((a) => (
              <div key={a.name} className="flex items-start gap-4 p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-all">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm">{a.name}</span>
                    <span className="text-primary font-bold text-xs shrink-0">{a.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Sıkça Sorulan Sorular</h2>
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
          <h2 className="text-2xl font-bold mb-4">Hâlâ Kararsız mısınız?</h2>
          <p className="text-muted-foreground mb-6">
            Demo talep edin, ekibimiz 30 dakikada salonunuz için en uygun planı anlatsın.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                Ücretsiz Deneyin
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/iletisim">
              <Button variant="outline" className="gap-2">
                Demo Talep Edin
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
