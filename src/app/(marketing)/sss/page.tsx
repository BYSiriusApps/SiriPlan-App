import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description: "Siriplan hakkında merak edilen tüm sorular ve cevapları. Randevu, fiyatlandırma, teknik destek ve daha fazlası.",
};

const categories = [
  {
    title: "Genel",
    items: [
      {
        q: "Siriplan nedir?",
        a: "Siriplan, kuaför, berber, güzellik salonu, SPA, klinik ve daha fazlası için geliştirilmiş yapay zeka destekli randevu ve işletme yönetim platformudur. BY Sirius Group Ai & Technology Co Ltd. tarafından geliştirilmiştir.",
      },
      {
        q: "Hangi sektörlere hitap ediyor?",
        a: "Kuaför, berber, güzellik salonu, SPA & masaj, nail salon, estetik klinik, makyaj stüdyosu, tattoo studio, diyetisyen, kaş & kirpik gibi 10'dan fazla sektöre özel çözüm sunuyoruz.",
      },
      {
        q: "Uygulamayı İngilizce kullanabilir miyim?",
        a: "Evet. Platform Türkçe, İngilizce, Rusça ve Arapça desteklemektedir. Dil tercihini ayarlardan değiştirebilirsiniz.",
      },
      {
        q: "Birden fazla şube yönetebilir miyim?",
        a: "Evet. Business planında sınırsız şube yönetebilirsiniz. Starter ve Pro planlar için şube başına ek paket seçeneği mevcuttur.",
      },
    ],
  },
  {
    title: "Fiyatlandırma & Deneme",
    items: [
      {
        q: "7 günlük deneme gerçekten ücretsiz mi?",
        a: "Evet, herhangi bir kredi kartı bilgisi gerekmez. 7 gün boyunca Pro planın tüm özelliklerini ücretsiz kullanabilirsiniz.",
      },
      {
        q: "Fiyatlar dolara mı?",
        a: "Fiyatlar USD cinsindendir. Stripe ile güvenli ödeme yapılır. Türk lirası ile ödeme için lütfen iletişime geçin.",
      },
      {
        q: "İstediğim zaman iptal edebilir miyim?",
        a: "Evet, herhangi bir taahhüt veya ceza olmaksızın istediğiniz zaman iptal edebilirsiniz. İptal etseniz bile 30 gün boyunca verilerinize erişim ve indirme hakkınız devam eder.",
      },
      {
        q: "Yıllık planla ne kadar tasarruf ediyorum?",
        a: "Yıllık ödeme tercihinde %18 indirim uygulanır. Örneğin Pro plan aylık $69 yerine $57/ay'dan (yıllık $684) kullanılabilir.",
      },
    ],
  },
  {
    title: "Randevu & Müşteri",
    items: [
      {
        q: "Müşteriler nasıl randevu alıyor?",
        a: "Web sayfası, WhatsApp, Instagram DM ve QR kod üzerinden 7/24 randevu alabiliyorlar. Çakışma kontrolü otomatik yapılır.",
      },
      {
        q: "WhatsApp hatırlatması nasıl çalışıyor?",
        a: "Randevu öncesi belirlenen saatlerde (24 saat, 2 saat önce gibi) müşteriye WhatsApp mesajı gönderilir. Gelmeme (no-show) oranınızı %60'a kadar azaltır.",
      },
      {
        q: "Müşteri skoru sistemi ne işe yarar?",
        a: "Her müşteriye ziyaret sıklığı, harcama ve sadakate göre 0-100 arası puan atanır. Değerli müşterilerinizi tanıyıp öncelikli randevu ve özel teklifler sunabilirsiniz.",
      },
      {
        q: "Bekleme listesi var mı?",
        a: "Evet, Pro ve Business planlarında bekleme listesi özelliği mevcuttur. Dolu saatlerde müşterileri sıraya ekleyin, iptal olduğunda otomatik bildirim gönderin.",
      },
    ],
  },
  {
    title: "AI & Otomasyon",
    items: [
      {
        q: "AI asistanı ne yapıyor?",
        a: "7/24 WhatsApp ve Instagram DM'lerini okur, fiyat ve randevu sorularını yanıtlar, müşteri adına randevu oluşturur. Siz uyurken işiniz yürür.",
      },
      {
        q: "AI asistanı yanlış bilgi verebilir mi?",
        a: "AI asistanı yalnızca sizin tanımladığınız hizmet, fiyat ve uygunluk bilgilerine göre yanıt verir. Bunu aşan soruları \"Doğrudan iletişime geçin\" şeklinde yönlendirir.",
      },
      {
        q: "Kampanya modülü nasıl çalışıyor?",
        a: "Belirli kriterlere göre müşteri listesi oluşturun (3 aydır gelmeyenler, doğum günü yaklaşanlar vb.) ve toplu WhatsApp/SMS/e-posta gönderin.",
      },
    ],
  },
  {
    title: "Teknik & Güvenlik",
    items: [
      {
        q: "Verilerimi başka bir sisteme taşıyabilir miyim?",
        a: "Evet. JSON, Excel ve CSV formatında istediğiniz zaman tüm verilerinizi indirebilirsiniz. Hiçbir platforma bağımlı değilsiniz.",
      },
      {
        q: "Mevcut sistemdeki verileri aktarabilir miyim?",
        a: "Evet. Kullandığınız randevu yazılımından veya Excel'den tek tıkla veri aktarımı desteklenmektedir. Profesyonel Veri Göçü hizmetimizle ekibimiz bunu sizin için yapabilir.",
      },
      {
        q: "KVKK uyumlu mu?",
        a: "Evet. Müşteri verileri KVKK mevzuatına uygun saklanır, uçtan uca şifreleme uygulanır ve veriler Türkiye sunucularında işlenebilir.",
      },
      {
        q: "Uygulama kapanıyor mu?",
        a: "BY Sirius Group altyapısı üzerinde %99.9 uptime hedeflenmektedir. Planlı bakımlar önceden bildirilir ve genellikle gece gerçekleştirilir.",
      },
    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: categories.flatMap((cat) =>
    cat.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    }))
  ),
};

export default function SssPage() {
  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <HelpCircle className="w-3.5 h-3.5" />
            SSS
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Sıkça Sorulan<br />
            <span className="brand-gradient-text">Sorular</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Aradığınızı bulamadıysanız WhatsApp veya e-posta ile ulaşın.
          </p>
        </div>
      </section>

      {/* FAQ content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-12">
          {categories.map((cat) => (
            <div key={cat.title}>
              <h2 className="text-xl font-bold mb-6 pb-3 border-b border-border">{cat.title}</h2>
              <div className="space-y-4">
                {cat.items.map((item) => (
                  <details
                    key={item.q}
                    className="group p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-all open:border-primary/30"
                  >
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <h3 className="font-semibold text-sm pr-4">{item.q}</h3>
                      <span className="text-primary shrink-0 text-lg group-open:rotate-45 transition-transform duration-200 leading-none">+</span>
                    </summary>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <MessageCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-3">Cevabını Bulamadınız mı?</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Ekibimiz 2 saat içinde size dönüş yapar. WhatsApp&apos;tan hızlı yanıt için tercih edebilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/iletisim">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                İletişime Geçin
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a
              href="https://wa.me/905355032634?text=Merhaba%2C%20bir%20sorum%20var."
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp&apos;tan Yazın
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
