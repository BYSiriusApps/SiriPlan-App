import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Globe, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "BY Sirius Group Ai & Technology Co Ltd. ve Siriplan hakkında bilgi edinin.",
};

const values = [
  {
    icon: Zap,
    title: "Yenilikçilik",
    desc: "AI ve otomasyon teknolojileriyle işletmelerin verimliliğini maksimuma taşırız.",
  },
  {
    icon: Shield,
    title: "Güvenilirlik",
    desc: "KVKK uyumlu altyapı, uçtan uca şifreleme ve %99,9 uptime garantisiyle yanınızdayız.",
  },
  {
    icon: Users,
    title: "Müşteri Odaklılık",
    desc: "Her sektörün kendine özgü ihtiyaçlarını anlayarak çözüm üretiriz.",
  },
  {
    icon: Globe,
    title: "Global Vizyon",
    desc: "Türkiye'den dünyaya — çok dilli platformumuzla uluslararası büyümeyi destekleriz.",
  },
];

export default function HakkimizdaPage() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="py-20 md:py-28 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl">
              Siri<span className="text-primary">plan</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            Teknolojiyle İşletmenizi<br />
            <span className="brand-gradient-text">Geleceğe Taşıyoruz</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Siriplan, <strong>BY Sirius Group Ai & Technology Co Ltd.</strong> çatısı altında geliştirilen,
            10&apos;dan fazla sektöre hizmet sunan yapay zeka destekli randevu ve işletme yönetim platformudur.
          </p>
        </div>
      </section>

      {/* About BY Sirius */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">BY Sirius Group Kimdir?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>BY Sirius Group Ai & Technology Co Ltd.</strong>, yapay zeka, SaaS çözümleri ve dijital
                dönüşüm alanlarında faaliyet gösteren teknoloji şirketidir. Kuruluşumuzdan bu yana işletmelerin
                dijitalleşme yolculuğunu kolaylaştırmak için yenilikçi ürünler geliştirmekteyiz.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Siriplan, BY Sirius Group Ai & Technology Co Ltd.&apos;un amiral gemisi ürünü olarak kuaförden kliniklere, berbelerden spa
                merkezlerine kadar geniş bir sektör yelpazesine randevu yönetimi ve operasyonel verimlilik sağlar.
              </p>
              <a href="https://bysirius.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Globe className="w-4 h-4" />
                  bysirius.com
                </Button>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "10+", label: "Desteklenen Sektör" },
                { value: "2.000+", label: "Aktif İşletme" },
                { value: "%99.9", label: "Uptime Garantisi" },
                { value: "7/24", label: "AI Destek" },
              ].map((s) => (
                <div key={s.label} className="p-5 bg-card rounded-xl border border-border text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Değerlerimiz</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="flex gap-4 p-5 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <v.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">Sorularınız mı var?</h2>
          <p className="text-muted-foreground mb-6">
            Ekibimizle iletişime geçin, size en uygun çözümü birlikte bulalım.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/iletisim">
              <Button className="gap-2 bg-primary hover:bg-primary/90">İletişime Geçin</Button>
            </Link>
            <a href="https://bysirius.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Globe className="w-4 h-4" />
                bysirius.com
              </Button>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
