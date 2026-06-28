import Link from "next/link";
import { ArrowRight, Star, Zap, Users, TrendingUp, Shield, Sparkles, Check, Bot, Calendar, MessageSquare, BarChart3, FileDown, Upload, Bell, Trophy, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/* ─── Stats ─────────────────────────────────────────────── */
const stats = [
  { value: "2.000+", label: "Aktif İşletme" },
  { value: "500K+", label: "Aylık Randevu" },
  { value: "%99.9", label: "Kesintisiz Çalışma" },
  { value: "4.8/5", label: "Memnuniyet" },
];

/* ─── Features ───────────────────────────────────────────── */
const features = [
  {
    icon: Calendar,
    title: "Çok Kanallı Randevu",
    desc: "Web, WhatsApp, Instagram ve QR kodla müşterileriniz her yerden randevu alır. Çakışma kontrolü otomatik.",
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    icon: Bot,
    title: "AI Asistanı",
    desc: "WhatsApp ve Instagram DM'lerine 7/24 akıllı yanıt. Fiyat, randevu, yön sorularını AI yanıtlar.",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: Users,
    title: "Müşteri Skoru",
    desc: "Her müşteriye 0-100 sadakat puanı. Değerli müşterilerinizi tanıyın, öncelikli randevu sunun.",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: Trophy,
    title: "Haftanın Elemanı",
    desc: "Personeli motive eden gamification sistemi. Haftalık şampiyon, aylık rozetler, performans sıralaması.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: MessageSquare,
    title: "Kampanya Modülü",
    desc: "Doğum günü mesajları, inaktif müşteri kampanyaları, hedefli toplu WhatsApp/SMS gönderimi.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: BarChart3,
    title: "Ciro & Analitik",
    desc: "Gerçek zamanlı gelir dashboard, KDV raporu, personel performansı, PDF export.",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  {
    icon: Upload,
    title: "Kolay Veri Göçü",
    desc: "SalonAppy, Arvengo veya Excel'den tek tıkla tüm verilerinizi aktarın. Veri kaybı asla yaşanmaz.",
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    icon: FileDown,
    title: "Verileriniz Sizindir",
    desc: "İstediğiniz an tüm verilerinizi JSON, Excel veya CSV olarak indirin. Hiçbir sistem kilidine girmeyin.",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
];

/* ─── Pricing ────────────────────────────────────────────── */
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
    ],
    cta: "Ücretsiz Dene",
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
    ],
    cta: "Ücretsiz Dene",
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
    ],
    cta: "Bize Ulaşın",
    highlight: false,
  },
];

/* ─── Categories ─────────────────────────────────────────── */
const categories = [
  { icon: "💇‍♀️", label: "Kuaför" },
  { icon: "💈", label: "Berber" },
  { icon: "💅", label: "Güzellik Salonu" },
  { icon: "🧖", label: "SPA & Masaj" },
  { icon: "💅", label: "Nail Salon" },
  { icon: "✨", label: "Estetik Klinik" },
  { icon: "💄", label: "Makyaj Stüdyosu" },
  { icon: "🖋", label: "Tattoo Studio" },
  { icon: "🥗", label: "Diyetisyen" },
  { icon: "👁", label: "Kaş & Kirpik" },
];

/* ─── Add-ons ────────────────────────────────────────────── */
const addons = [
  { icon: Bot, name: "AI WhatsApp Paketi", price: "$29/ay", desc: "Gelişmiş AI asistanı, duygu analizi, akıllı öneriler" },
  { icon: MessageSquare, name: "SMS Paketi", price: "$19/ay", desc: "1.000 SMS/ay, Twilio altyapısı, teslimat garantisi" },
  { icon: Zap, name: "Ek Şube Paketi", price: "$29/şube/ay", desc: "Starter/Pro'ya ek şube ekleyin" },
  { icon: BarChart3, name: "Premium Analitik", price: "$25/ay", desc: "Personel bordrosu, KPI izleme, özelleştirilebilir raporlar" },
  { icon: Star, name: "Google Yorum & SEO", price: "$15/ay", desc: "Otomatik Google yorum talebi, yerel SEO raporu" },
  { icon: Gift, name: "Profesyonel Veri Göçü", price: "$99 tek seferlik", desc: "Ekibimiz verilerinizi garanti ile aktarır" },
];

/* ─── Testimonials ───────────────────────────────────────── */
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

/* ─── Page ───────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bysirius-watermark pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
            <Sparkles className="w-3 h-3 text-primary" />
            10+ Sektörde Güvenilen Randevu Platformu
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            İşletmenizi{" "}
            <span className="brand-gradient-text">Akıllıca</span>
            {" "}Yönetin
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-3 max-w-2xl mx-auto leading-relaxed">
            Randevu, personel, müşteri ve ciro yönetimini tek platformda birleştirin.
            AI asistanı ile WhatsApp/Instagram&apos;dan otomatik yanıt verin.
          </p>

          <p className="text-base font-semibold text-primary mb-8">
            Her sektöre özel — sınırsız randevu, sıfır karmaşa.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/kayit">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 h-12 px-8 text-base">
                14 Gün Ücretsiz Deneyin
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base gap-2">
                <Sparkles className="w-4 h-4" />
                Demo İzle
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            ✓ Kredi kartı gerekmez &nbsp;·&nbsp; ✓ 14 gün ücretsiz &nbsp;·&nbsp; ✓ İstediğin zaman iptal
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
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Hangi Sektördesiniz?</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Tüm güzellik ve kişisel bakım işletmeleri için özelleştirilmiş çözüm
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-sm font-medium"
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Her Şey Tek Yerde</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Rakiplerinizden öne geçmenizi sağlayacak araçlar — hepsi bir arada
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Şeffaf Fiyatlandırma</h2>
            <p className="text-muted-foreground">
              Aylık veya yıllık ödeme yapın, istediğiniz zaman iptal edin.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.highlight ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : "border-border"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs px-3">
                      En Çok Tercih Edilen
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold">{plan.monthly}</span>
                    <span className="text-muted-foreground text-sm">/ay</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">
                    veya {plan.annual}/ay · {plan.annualTotal}/yıl (%18 tasarruf)
                  </p>
                  <Link href="/auth/kayit">
                    <Button
                      className={`w-full mb-6 ${plan.highlight ? "bg-primary hover:bg-primary/90" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            14 gün ücretsiz deneme · Kredi kartı gerekmez · İstediğin zaman iptal
          </p>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Ek Paketler</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Başka uygulamalarda çok pahalıya ayrı ayrı satılan hizmetleri planınıza ekleyin
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
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

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">İşletmeler Ne Diyor?</h2>
            <p className="text-muted-foreground">Türkiye ve dünyadan salon sahiplerinin deneyimleri</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
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
              <span>SSL Şifreli</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>%99.9 Uptime Garantisi</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span>KVKK Uyumlu</span>
            </div>
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-primary" />
              <span>Verileriniz Sizindir</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>BY Sirius Group Altyapısı</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Salonunuzu Büyütmeye<br />
              <span className="brand-gradient-text">Bugün Başlayın</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              14 gün boyunca tüm özellikleri ücretsiz deneyin. Kredi kartı gerekmez.
              Verileriniz güvende, istediğiniz zaman iptal.
            </p>
            <Link href="/auth/kayit">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-2 h-14 px-10 text-lg">
                Ücretsiz Hesap Oluştur
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
