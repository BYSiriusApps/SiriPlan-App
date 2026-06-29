import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Entegrasyonlar",
  description: "Siriplan entegrasyonları — WhatsApp, Instagram, Google Calendar, Stripe ve daha fazlası.",
};

const integrations = [
  {
    emoji: "💬",
    name: "WhatsApp Business",
    category: "Mesajlaşma",
    desc: "Müşterilere otomatik hatırlatma, randevu teyidi ve kampanya mesajı gönderin. AI asistanı ile 7/24 yanıt.",
    status: "Aktif",
  },
  {
    emoji: "📸",
    name: "Instagram DM",
    category: "Sosyal Medya",
    desc: "Instagram DM'lerine AI destekli otomatik yanıt. Randevu soruları, fiyat bilgisi ve yönlendirme.",
    status: "Aktif",
  },
  {
    emoji: "📅",
    name: "Google Calendar",
    category: "Takvim",
    desc: "Randevularınızı personelin Google takvimiyle senkronize edin. Çakışma uyarısı otomatik.",
    status: "Yakında",
  },
  {
    emoji: "💳",
    name: "Stripe",
    category: "Ödeme",
    desc: "Güvenli ön ödeme ve abonelik yönetimi. 100+ ülkede geçerli kart desteği, otomatik fatura.",
    status: "Aktif",
  },
  {
    emoji: "📧",
    name: "E-posta (Resend)",
    category: "Bildirim",
    desc: "Randevu teyidi, hatırlatma ve kampanya e-postaları. Özelleştirilebilir HTML şablonlar.",
    status: "Aktif",
  },
  {
    emoji: "📊",
    name: "Google Analytics",
    category: "Analitik",
    desc: "Online randevu sayfanızın trafiğini, dönüşümlerini ve kullanıcı davranışlarını izleyin.",
    status: "Yakında",
  },
  {
    emoji: "🔔",
    name: "SMS (Twilio)",
    category: "Mesajlaşma",
    desc: "WhatsApp olmayan müşterilere SMS hatırlatma ve onay mesajı gönderin.",
    status: "Aktif",
  },
  {
    emoji: "📱",
    name: "QR Kod",
    category: "Randevu",
    desc: "Salonunuzun kapısına veya kartvizite QR kod yapıştırın, müşteriler direkt randevu alsın.",
    status: "Aktif",
  },
  {
    emoji: "🤖",
    name: "OpenAI / Claude AI",
    category: "Yapay Zeka",
    desc: "WhatsApp, Instagram ve panel içi AI asistanı için güçlü dil modeli altyapısı.",
    status: "Aktif",
  },
];

const STATUS_STYLE: Record<string, string> = {
  "Aktif": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Yakında": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function EntegrasyonlarPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Plug className="w-3.5 h-3.5" />
            Entegrasyonlar
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Tüm Araçlarınız<br />
            <span className="brand-gradient-text">Tek Platformda</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            WhatsApp&apos;tan Google Calendar&apos;a, Stripe&apos;tan Instagram&apos;a — kullandığınız uygulamalarla
            kusursuz entegrasyon.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {integrations.map((int) => (
              <div key={int.name} className="flex flex-col gap-3 p-5 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{int.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm">{int.name}</p>
                      <p className="text-[10px] text-muted-foreground">{int.category}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[int.status]}`}>
                    {int.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{int.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center">
            <h3 className="font-bold mb-2">Eksik Entegrasyon mu Var?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              İhtiyacınız olan entegrasyonu önerebilirsiniz — aktif kullanıcılar öncelikli listeye alınır.
            </p>
            <a href="mailto:destek@siriplan.com?subject=Entegrasyon Önerisi">
              <Button variant="outline" className="gap-2">
                Öneri Gönder <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-3">Tüm Entegrasyonları Ücretsiz Deneyin</h2>
          <p className="text-muted-foreground mb-6">14 günlük deneme süresinde tüm entegrasyonlar dahil.</p>
          <Link href="/auth/kayit">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              Ücretsiz Başlayın <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
