import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rocket, Globe, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kariyer",
  description: "BY Sirius Group ile kariyer fırsatları — uzak çalışma, rekabetçi maaş, teknoloji odaklı ortam.",
};

const perks = [
  { icon: Globe, title: "Tam Uzak Çalışma", desc: "Türkiye'nin her yerinden, evinden veya coworking space'ten çalışabilirsin." },
  { icon: Zap, title: "Hızlı Büyüme", desc: "Startup dinamiğinde, doğrudan etki yaratacağın rol ve sorumluluklar." },
  { icon: Heart, title: "Sağlık & Yan Haklar", desc: "Özel sağlık sigortası, yemek kartı, eğitim bütçesi." },
  { icon: Rocket, title: "AI-First Kültür", desc: "Her gün en yeni AI araçlarını kullanarak iş yapıyoruz." },
];

const openings = [
  {
    title: "Senior Full-Stack Developer",
    team: "Ürün & Mühendislik",
    type: "Tam Zamanlı · Uzak",
    tags: ["Next.js", "TypeScript", "Supabase", "AI"],
  },
  {
    title: "Growth & Marketing Specialist",
    team: "Büyüme",
    type: "Tam Zamanlı · Uzak",
    tags: ["SaaS", "SEO", "İçerik", "Analitik"],
  },
  {
    title: "Customer Success Manager",
    team: "Müşteri Başarısı",
    type: "Tam Zamanlı · Hibrit İstanbul",
    tags: ["SaaS", "Müşteri İlişkileri", "Türkçe", "CRM"],
  },
  {
    title: "UI/UX Designer",
    team: "Tasarım",
    type: "Freelance / Proje Bazlı",
    tags: ["Figma", "Mobil", "Web", "Kullanıcı Araştırması"],
  },
];

export default function KariyerPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Rocket className="w-3.5 h-3.5" />
            BY Sirius Group Kariyer
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Geleceği Birlikte<br />
            <span className="brand-gradient-text">İnşa Edelim</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Yapay zeka ve SaaS alanında Türkiye&apos;nin öncü şirketlerinden birinde kariyer fırsatı yakalamak
            istiyorsanız doğru yerdesiniz.
          </p>
          <a href="mailto:kariyer@bysirius.com">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2">
              Başvuru Gönder
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-10">Neden BY Sirius?</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {perks.map((p) => (
              <div key={p.title} className="flex gap-4 p-5 bg-card rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-8">Açık Pozisyonlar</h2>
          <div className="space-y-4">
            {openings.map((job) => (
              <div key={job.title} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all group">
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{job.team} · {job.type}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.tags.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t}</span>
                    ))}
                  </div>
                </div>
                <a
                  href={`mailto:kariyer@bysirius.com?subject=Başvuru: ${job.title}`}
                  className="text-sm font-medium text-primary flex items-center gap-1.5 shrink-0 hover:gap-2.5 transition-all"
                >
                  Başvur <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Uygun pozisyon bulamadınız mı?{" "}
            <a href="mailto:kariyer@bysirius.com" className="text-primary hover:underline font-medium">
              Açık başvuru gönderin
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-3">Ürünümüzü Kullanmak İster misiniz?</h2>
          <p className="text-muted-foreground mb-6">
            Ekibimize katılmadan önce Siriplan&apos;ı deneyin.
          </p>
          <Link href="/auth/kayit">
            <Button variant="outline" className="gap-2">7 Gün Ücretsiz Deneyin <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
