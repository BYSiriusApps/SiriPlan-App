import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Bot, Users, Trophy, MessageSquare, BarChart3, FileDown, Upload, Bell, Zap, Star, Shield, Globe, Smartphone, QrCode, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Özellikler",
  description: "Siriplan'ın tüm özellikleri — AI randevu, müşteri yönetimi, kampanya modülü, ciro analitik ve çok daha fazlası.",
};

const featureGroups = [
  {
    category: "Randevu Yönetimi",
    icon: Calendar,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    items: [
      {
        icon: Calendar,
        title: "Çok Kanallı Online Randevu",
        desc: "Web sitesi, WhatsApp, Instagram DM ve QR kod üzerinden 7/24 randevu alın. Çakışma kontrolü otomatik, çift randevu asla yaşanmaz.",
        badge: "Tüm Planlar",
      },
      {
        icon: Smartphone,
        title: "Bekleme Listesi",
        desc: "Dolu saatlerde müşterileri bekleme listesine ekleyin, tek tıkla bilgilendirin ve randevuya çevirin.",
        badge: "Pro+",
      },
      {
        icon: QrCode,
        title: "QR Kod Randevu",
        desc: "Salonunuzun kapısına yapıştırın, kartvizite basın. Müşteri kamerası açsın, randevusu hazır olsun.",
        badge: "Tüm Planlar",
      },
      {
        icon: Bell,
        title: "Otomatik Hatırlatmalar",
        desc: "Randevu öncesi WhatsApp, SMS ve e-posta hatırlatmaları. Gelmeme (no-show) oranınızı %60 azaltın.",
        badge: "Tüm Planlar",
      },
    ],
  },
  {
    category: "AI & Otomasyon",
    icon: Bot,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    items: [
      {
        icon: Bot,
        title: "WhatsApp AI Asistanı",
        desc: "7/24 müşteri sorularını yanıtlar, randevu alır, ön ödeme toplar. Sizi uyandırmaz, işinizi yürütür.",
        badge: "Business",
      },
      {
        icon: MessageSquare,
        title: "Instagram DM Otomasyonu",
        desc: "\"Fiyatlarınız nedir?\" sorularına anında yanıt. Randevu linkini DM üzerinden paylaşır.",
        badge: "Business",
      },
      {
        icon: Bell,
        title: "Doğum Günü Kampanyaları",
        desc: "Müşteri doğum günlerinde otomatik özel teklif mesajı gönderir. Kişiselleştirilmiş, zamanlı, etkili.",
        badge: "Pro+",
      },
    ],
  },
  {
    category: "Müşteri & CRM",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    items: [
      {
        icon: Users,
        title: "Müşteri Skoru (0-100)",
        desc: "Ziyaret sıklığı, harcama ve sadakate göre her müşteriye otomatik puan. Değerlilerinizi tanıyın.",
        badge: "Pro+",
      },
      {
        icon: Star,
        title: "Sadakat Kartı",
        desc: "10 randevu = 1 bedava hizmet gibi özelleştirilebilir ödül sistemi. Müşteri bağlılığını artırır.",
        badge: "Tüm Planlar",
      },
      {
        icon: MessageSquare,
        title: "Kampanya Modülü",
        desc: "Inaktif müşterileri geri kazanın, özel günlerde kampanya yapın. Hedefli WhatsApp/SMS gönderimi.",
        badge: "Pro+",
      },
    ],
  },
  {
    category: "Personel Yönetimi",
    icon: Trophy,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    items: [
      {
        icon: Trophy,
        title: "Haftanın Elemanı",
        desc: "Randevu sayısı, müşteri memnuniyeti ve ciro bazlı haftalık sıralama. Motivasyon patlar.",
        badge: "Pro+",
      },
      {
        icon: Star,
        title: "Aylık Rozetler",
        desc: "\"Bu Ayın Şampiyonu\", \"Müşteri Aşığı\" gibi rozetler personeli oyunlaştırır.",
        badge: "Pro+",
      },
      {
        icon: BarChart3,
        title: "Komisyon Takibi",
        desc: "Her personelin aylık cirosunu, komisyonunu ve bordrosunu otomatik hesaplar.",
        badge: "Pro+",
      },
    ],
  },
  {
    category: "Raporlar & Finans",
    icon: BarChart3,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    items: [
      {
        icon: BarChart3,
        title: "Gerçek Zamanlı Ciro Dashboard",
        desc: "Bugünkü, bu haftaki ve bu ayki gelirinizi anlık takip edin. Tahmini KDV tutarını otomatik görün.",
        badge: "Tüm Planlar",
      },
      {
        icon: FileDown,
        title: "PDF & Excel Rapor",
        desc: "Muhasebeci için PDF, kendi analiziniz için Excel. Tek tıkla hazır rapor.",
        badge: "Pro+",
      },
      {
        icon: CreditCard,
        title: "Stripe Ödeme",
        desc: "Randevu öncesi ön ödeme, abonelik veya tek seferlik ödeme. 100+ ülke kart desteği.",
        badge: "Pro+",
      },
    ],
  },
  {
    category: "Teknik & Güvenlik",
    icon: Shield,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    items: [
      {
        icon: Shield,
        title: "KVKK Uyumlu Altyapı",
        desc: "Müşteri verileri Türkiye KVKK mevzuatına uygun saklanır. Uçtan uca şifreleme.",
        badge: "Tüm Planlar",
      },
      {
        icon: Upload,
        title: "Kolay Veri Göçü",
        desc: "Mevcut randevu yazılımınızdan veya Excel'den tek tıkla aktarım. Veri kaybı asla yaşanmaz.",
        badge: "Tüm Planlar",
      },
      {
        icon: FileDown,
        title: "Veri Taşınabilirliği",
        desc: "İstediğiniz zaman tüm verilerinizi JSON, Excel veya CSV olarak indirin. Hiçbir platforma bağımlı değilsiniz.",
        badge: "Tüm Planlar",
      },
      {
        icon: Globe,
        title: "Çok Dilli & Çok Para Birimi",
        desc: "TR, EN, RU, AR dil desteği. TRY, USD, EUR ile fiyatlandırma.",
        badge: "Business",
      },
      {
        icon: Zap,
        title: "%99.9 Uptime Garantisi",
        desc: "BY Sirius Group altyapısı üzerinde. Bakım anında bildirilir, kesinti sıfır hedeftir.",
        badge: "Tüm Planlar",
      },
    ],
  },
];

const BADGE_STYLE: Record<string, string> = {
  "Tüm Planlar": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Pro+": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Business": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function OzelliklerPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1 text-xs">
            <Zap className="w-3 h-3 text-primary" />
            30+ Özellik — Tek Platform
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-5">
            Salonunuzu Büyütecek<br />
            <span className="brand-gradient-text">Her Araç Burada</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Randevu otomasyonundan AI asistana, müşteri skorlamadan gamification&apos;a kadar
            işletmenizi bir üst seviyeye taşıyacak tüm araçlar tek çatı altında.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-11 px-7">
                14 Gün Ücretsiz Dene
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/fiyatlar">
              <Button variant="outline" className="h-11 px-7">
                Fiyatlara Bak
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature groups */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-16">
          {featureGroups.map((group) => (
            <div key={group.category}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-10 h-10 rounded-xl ${group.bg} flex items-center justify-center`}>
                  <group.icon className={`w-5 h-5 ${group.color}`} />
                </div>
                <h2 className="text-2xl font-bold">{group.category}</h2>
              </div>

              {/* Feature cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((feature) => (
                  <div
                    key={feature.title}
                    className="p-5 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${group.bg} flex items-center justify-center`}>
                        <feature.icon className={`w-4 h-4 ${group.color}`} />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLE[feature.badge]}`}>
                        {feature.badge}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Tüm Özellikleri 14 Gün Ücretsiz Deneyin
          </h2>
          <p className="text-muted-foreground mb-6">
            Kredi kartı gerekmez. İstediğiniz zaman iptal. Verileriniz her zaman sizin.
          </p>
          <Link href="/auth/kayit">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2 h-12 px-10">
              Ücretsiz Hesap Oluştur
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
