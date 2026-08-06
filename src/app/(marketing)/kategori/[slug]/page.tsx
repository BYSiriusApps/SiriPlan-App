import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Star, Calendar, Bot, Users, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Params = { slug: string };

const sectors: Record<string, {
  title: string;
  emoji: string;
  headline: string;
  desc: string;
  features: string[];
  testimonial?: { name: string; role: string; text: string };
  keywords: string[];
}> = {
  kuafor: {
    title: "Kuaför",
    emoji: "💇‍♀️",
    headline: "Kuaför Salonunuz İçin Akıllı Randevu Sistemi",
    desc: "Saç kesimi, boyama, bakım ve şekillendirme randevularını tek ekrandan yönetin. WhatsApp ile otomatik hatırlatma, müşteri sadakat programı ve ciro takibi.",
    features: [
      "Çok personelli randevu takibi",
      "Hizmet bazlı süre yönetimi",
      "WhatsApp & Instagram otomasyonu",
      "Sadakat puanı sistemi",
      "Personel komisyon raporları",
      "Ön ödeme toplama",
    ],
    testimonial: {
      name: "Ayşe Kaya",
      role: "Elegans Kuaför, İstanbul",
      text: "Siriplan'a geçtikten sonra no-show oranımız %70 düştü. WhatsApp hatırlatmaları sayesinde her randevumuz dolup taşıyor.",
    },
    keywords: ["kuaför randevu sistemi", "kuaför programı", "online kuaför randevu"],
  },
  berber: {
    title: "Berber",
    emoji: "💈",
    headline: "Berber Dükkanı İçin Randevu & Yönetim Yazılımı",
    desc: "Saç kesimi, sakal düzeltme ve bakım randevularını kolayca yönetin. Müşteri geçmişi, kişisel tercihler ve hızlı checkout sistemi.",
    features: [
      "Hızlı randevu oluşturma",
      "Müşteri tercih notları",
      "QR kod ile self servis randevu",
      "Günlük ciro özeti",
      "SMS & WhatsApp hatırlatma",
      "Personel çalışma saati takibi",
    ],
    testimonial: {
      name: "Mehmet Demir",
      role: "Prestige Berber, Ankara",
      text: "Haftanın Elemanı sistemi personelimi çok motive etti. Ciro takibi ve personel komisyon raporu artık çok kolay.",
    },
    keywords: ["berber randevu sistemi", "berber programı", "online berber randevu"],
  },
  guzellik: {
    title: "Güzellik Salonu",
    emoji: "💅",
    headline: "Güzellik Salonu Yönetiminde Yeni Standart",
    desc: "Cilt bakımı, makyaj, lazer ve epilasyon hizmetlerini tek platformda yönetin. Müşteri kartı, ürün takibi ve kampanya modülü.",
    features: [
      "Hizmet & paket satışı",
      "Ürün stok takibi",
      "Müşteri geçmişi ve notları",
      "Instagram DM otomasyonu",
      "Toplu kampanya gönderimi",
      "KDV'li ciro raporları",
    ],
    keywords: ["güzellik salonu randevu sistemi", "güzellik salonu programı"],
  },
  spa: {
    title: "SPA & Masaj",
    emoji: "🧖",
    headline: "SPA Merkezi İçin Profesyonel Randevu Yönetimi",
    desc: "Masaj, sauna, hamam, duş ve paket programlarını yönetin. Çift yönlü kabin takibi, personel uygunluk ve ön ödeme sistemi.",
    features: [
      "Kabin & oda bazlı rezervasyon",
      "Paket program satışı",
      "Otomatik hatırlatma",
      "Müşteri memnuniyet skoru",
      "Bekleme listesi",
      "Gelir & doluluk raporları",
    ],
    testimonial: {
      name: "Fatma Şahin",
      role: "Lotus SPA, İzmir",
      text: "3 şube yönetimi artık tek ekrandan. Doluluk oranımız %40 arttı.",
    },
    keywords: ["spa randevu sistemi", "masaj salonu programı"],
  },
  nail: {
    title: "Nail Salon",
    emoji: "💅",
    headline: "Nail Salon İçin Akıllı Randevu Sistemi",
    desc: "Manikür, pedikür, jel, akrilik ve protez tırnak randevularını yönetin. Uzun süreli hizmetler için blok rezervasyon ve tekrar eden müşteri takibi.",
    features: [
      "Hizmet süresi bazlı blok rezervasyon",
      "Tekrar eden müşteri hatırlatma",
      "Before/after fotoğraf notları",
      "Sadakat kartı sistemi",
      "Online ön ödeme",
      "Kapasiteli slot yönetimi",
    ],
    keywords: ["nail salon randevu sistemi", "tırnak salonu programı"],
  },
  estetik: {
    title: "Estetik Klinik",
    emoji: "✨",
    headline: "Estetik & Güzellik Kliniği Randevu Yönetimi",
    desc: "Botoks, dolgu, lazer epilasyon, mezoterapi ve cilt bakımı randevularını KVKK uyumlu şekilde yönetin.",
    features: [
      "Hasta kartı & tedavi geçmişi",
      "KVKK uyumlu veri saklama",
      "Online onay formu",
      "Hekim uygunluk takvimi",
      "Takip randevusu hatırlatma",
      "Ön ödeme & taksit",
    ],
    keywords: ["estetik klinik randevu sistemi", "klinik yönetim yazılımı"],
  },
  makyaj: {
    title: "Makyaj Stüdyosu",
    emoji: "💄",
    headline: "Makyaj Stüdyosu İçin Randevu & Müşteri Yönetimi",
    desc: "Gelin makyajı, fotoğraf çekimi, özel gün ve günlük makyaj randevularını kolayca planlayın.",
    features: [
      "Etkinlik bazlı randevu",
      "Müşteri tercih profili",
      "Kaparo & ön ödeme sistemi",
      "Gelin randevu paketi",
      "Instagram entegrasyonu",
      "Fotoğraf notları",
    ],
    keywords: ["makyaj stüdyosu randevu sistemi", "makyajcı randevu programı"],
  },
  tattoo: {
    title: "Tattoo Studio",
    emoji: "🖋",
    headline: "Tattoo Studio İçin Profesyonel Randevu Sistemi",
    desc: "Dövme, piercing ve lazer seans randevularını yönetin. Tasarım onay süreci, kaparo ve çok seanslı proje takibi.",
    features: [
      "Proje bazlı çok seanslı randevu",
      "Kaparo & bakiye takibi",
      "Tasarım notları & fotoğraflar",
      "Müşteri onam belgesi",
      "Tattoo sanatçısı takvimi",
      "WA ile seans hatırlatma",
    ],
    keywords: ["tattoo studio randevu sistemi", "dövmeci randevu programı"],
  },
  diyetisyen: {
    title: "Diyetisyen",
    emoji: "🥗",
    headline: "Diyetisyen Kliniği İçin Randevu & Danışan Yönetimi",
    desc: "Beslenme danışmanlığı, takip seansları ve online konsültasyon randevularını yönetin. Danışan kartı ve ilerleme takibi.",
    features: [
      "Online & yüz yüze seans",
      "Danışan takip profili",
      "Tekrar eden haftalık randevu",
      "E-posta & WA hatırlatma",
      "Ödeme & paket yönetimi",
      "Randevu geçmişi",
    ],
    keywords: ["diyetisyen randevu sistemi", "beslenme danışmanı programı"],
  },
  kas: {
    title: "Kaş & Kirpik",
    emoji: "👁",
    headline: "Kaş & Kirpik Stüdyosu İçin Randevu Sistemi",
    desc: "Kaş tasarımı, microblading, kirpik uzatma ve laminasyon randevularını yönetin. Seans süresi ve doluluk optimizasyonu.",
    features: [
      "Seans süresi bazlı rezervasyon",
      "Tekrar eden müşteri hatırlatma",
      "Renk ve stil notları",
      "Müşteri fotoğraf galerisi",
      "Online ön ödeme",
      "Sadakat programı",
    ],
    keywords: ["kaş kirpik randevu sistemi", "kirpik stüdyo programı"],
  },
};

export async function generateStaticParams() {
  return Object.keys(sectors).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const sector = sectors[slug];
  if (!sector) return {};
  return {
    title: `${sector.title} Randevu Sistemi`,
    description: sector.desc,
    keywords: sector.keywords,
  };
}

export default async function KategoriPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const sector = sectors[slug];
  if (!sector) notFound();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="text-4xl mb-4">{sector.emoji}</div>
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
            {sector.title} Çözümü
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-5">
            {sector.headline}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            {sector.desc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/kayit">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-11 px-7">
                14 Gün Ücretsiz Dene
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="h-11 px-7">
                Demo İzle
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            {sector.title} İşletmeleri İçin Özel Özellikler
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sector.features.map((feature) => (
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
          <h2 className="text-2xl font-bold text-center mb-10">Platform Avantajları</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Calendar, title: "Çok Kanallı Randevu", desc: "Web, WA, IG, QR" },
              { icon: Bot, title: "AI Asistanı", desc: "7/24 otomatik yanıt" },
              { icon: Users, title: "Müşteri Skoru", desc: "Sadakat programı" },
              { icon: BarChart3, title: "Ciro Analitik", desc: "Gerçek zamanlı rapor" },
              { icon: Star, title: "Gamification", desc: "Haftanın Elemanı" },
              { icon: Shield, title: "KVKK Uyumlu", desc: "Güvenli veri saklama" },
              { icon: ArrowRight, title: "Kolay Göç", desc: "Mevcut verilerinizi taşıyın" },
              { icon: Check, title: "%99.9 Uptime", desc: "Kesintisiz çalışma" },
            ].map((item) => (
              <Card key={item.title} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-xs mb-1">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      {sector.testimonial && (
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
                  &ldquo;{sector.testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                    {sector.testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{sector.testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{sector.testimonial.role}</p>
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
            {sector.title} İşletmenizi Büyütmeye Hazır mısınız?
          </h2>
          <p className="text-muted-foreground mb-6">
            14 gün ücretsiz deneyin. Kredi kartı gerekmez.
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
