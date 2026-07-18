import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Play, Calendar, Users, TrendingUp, Bot, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Siriplan Demo",
  description: "Siriplan'ın tüm özelliklerini canlı demo ile keşfedin.",
};

const demoFeatures = [
  {
    icon: Calendar,
    title: "Randevu Yönetimi",
    desc: "Günlük takvim görünümü, çakışma kontrolü, çoklu kanal desteği",
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    icon: Users,
    title: "Müşteri CRM",
    desc: "0-100 sadakat skoru, doğum günü kampanyaları, VIP müşteri takibi",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: TrendingUp,
    title: "Ciro & Raporlar",
    desc: "Gerçek zamanlı gelir takibi, 6 aylık trend analizi, personel bazlı raporlar",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: Bot,
    title: "AI Asistanı",
    desc: "WhatsApp ve Instagram DM'lerine 7/24 otomatik yanıt, akıllı randevu önerileri",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: Star,
    title: "Gamification",
    desc: "Haftanın Elemanı, aylık rozetler, personel performans sıralaması",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

export default function DemoPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs">
            <Play className="w-3 h-3 text-primary" />
            Canlı Demo
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Siriplan&apos;ı Keşfedin
          </h1>
          <p className="text-muted-foreground text-lg">
            7 gün ücretsiz deneme ile tüm özellikleri kendi salonunuzda test edin.
            Kredi kartı gerekmez.
          </p>
        </div>

        {/* Demo video placeholder */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-fuchsia-500/10 border border-border aspect-video flex items-center justify-center shadow-xl">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <Play className="w-8 h-8 text-primary ml-1" />
              </div>
              <p className="text-lg font-semibold">Demo Video</p>
              <p className="text-sm text-muted-foreground mt-1">Yakında yayında</p>
            </div>
            {/* Decorative dots */}
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="absolute top-4 right-8 w-2 h-2 rounded-full bg-yellow-500" />
            <div className="absolute top-4 right-12 w-2 h-2 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Features grid */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Demo&apos;da Ne Göreceksiniz?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoFeatures.map((f) => (
              <Card key={f.title} className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-4">Hemen Başlayın</h2>
          <p className="text-muted-foreground mb-6">
            Demo izlemek yerine doğrudan salonunuzla deneyin. 7 gün boyunca tüm özellikler ücretsiz.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/kayit">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 h-12 px-8">
                Ücretsiz Hesap Oluştur
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="mailto:destek@siriplan.com">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Bize Ulaşın
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            ✓ Kredi kartı gerekmez &nbsp;·&nbsp; ✓ 7 gün ücretsiz &nbsp;·&nbsp; ✓ İstediğin zaman iptal
          </p>
        </div>
      </div>
    </div>
  );
}
