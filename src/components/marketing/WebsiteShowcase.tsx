import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Share2, MapPin, Phone, Images, Star, Globe, Navigation } from "lucide-react";
import { BookingDemo } from "@/components/marketing/BookingDemo";
import { Button } from "@/components/ui/button";

/**
 * "Website Modu" vitrini — demo salonun (sirius-demo-salon) gerçek randevu
 * sayfasından alınan uzun ekran görüntüleri; çerçeve içinde yavaşça kayar.
 * Görseller public/website-demo/ altında.
 */
const POINTS = [
  { key: "social", Icon: Share2, tile: "from-pink-500 to-rose-400", glow: "hover:shadow-rose-500/20" },
  { key: "location", Icon: MapPin, tile: "from-emerald-500 to-teal-400", glow: "hover:shadow-emerald-500/20" },
  { key: "contact", Icon: Phone, tile: "from-sky-500 to-blue-400", glow: "hover:shadow-sky-500/20" },
  { key: "photos", Icon: Images, tile: "from-violet-500 to-fuchsia-400", glow: "hover:shadow-violet-500/20" },
  { key: "reviews", Icon: Star, tile: "from-amber-500 to-orange-400", glow: "hover:shadow-amber-500/20" },
] as const;

export async function WebsiteShowcase() {
  const t = await getTranslations("homeVisual.website");

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute right-0 top-10 -z-10 h-[380px] w-[380px] rounded-full bg-amber-400/15 blur-3xl" />
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Globe className="h-3.5 w-3.5" />
              {t("badge")}
            </span>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("title")}</h2>
            <p className="mb-6 text-muted-foreground">{t("subtitle")}</p>

            <ul className="mb-8 space-y-2.5">
              {POINTS.map(({ key, Icon, tile, glow }) => (
                <li
                  key={key}
                  className={`group flex cursor-default items-center gap-4 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-all duration-300 hover:translate-x-1.5 hover:border-border hover:bg-card hover:shadow-lg ${glow}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tile} text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">{t(key)}</span>
                  <ArrowRight className="h-4 w-4 -translate-x-2 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/r/sirius-demo-salon" target="_blank" rel="noopener">
                <Button size="lg" className="h-12 gap-2 px-7 shadow-lg shadow-primary/20">
                  {t("cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <span className="text-xs text-muted-foreground">{t("planNote")}</span>
            </div>
          </div>

          {/* Tarayıcı + telefon çerçevesi: uzun sayfa görüntüsü çerçevede kayar */}
          <div className="relative mx-auto w-full max-w-[680px] pb-0 sm:pb-24 sm:pr-32">

            {/* Orta boşluğu dolduran yüzen kartlar: Google yorumu + yol tarifi */}
            <div className="sp-float-slow absolute -left-36 top-[27%] z-10 hidden w-[210px] rounded-2xl border border-border bg-card p-3.5 shadow-xl xl:block">
              <div className="mb-1.5 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1 text-xs font-bold">4.9</span>
              </div>
              <p className="mb-2.5 text-xs leading-snug text-foreground">{t("demo.review")}</p>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sectors/spa.jpg" alt="" className="h-6 w-6 rounded-full object-cover object-[45%_20%]" />
                <span className="text-[11px] font-semibold text-muted-foreground">Zeynep A. · Google</span>
              </div>
            </div>

            <div className="sp-float absolute -left-28 bottom-[4%] z-10 hidden w-[210px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl xl:block">
              <div className="relative h-24 bg-emerald-500/10 [background-image:linear-gradient(0deg,transparent_24%,var(--border)_25%,var(--border)_26%,transparent_27%),linear-gradient(90deg,transparent_24%,var(--border)_25%,var(--border)_26%,transparent_27%)] [background-size:28px_28px]">
                <span className="absolute left-[22%] top-[40%] h-1.5 w-24 rotate-[18deg] rounded-full bg-sky-400/50" />
                <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-[60%] items-center justify-center rounded-full bg-rose-500 text-white shadow-lg ring-4 ring-rose-500/20">
                  <MapPin className="h-5 w-5" />
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold">
                <Navigation className="h-3.5 w-3.5 text-primary" />
                {t("demo.directions")}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
                  siriplan.com/r/salon-adiniz
                </span>
              </div>
              <div className="aspect-[1100/688] overflow-hidden bg-background">
                <Image
                  src="/website-demo/site-desktop.webp"
                  alt={t("imgAlt")}
                  width={1100}
                  height={2400}
                  sizes="(min-width:1024px) 600px, 90vw"
                  className="sp-site-scroll-desktop h-auto w-full"
                />
              </div>
            </div>

            <div className="mx-auto mt-6 w-full max-w-[240px] sm:absolute sm:-bottom-6 sm:right-0 sm:mt-0 sm:w-[230px]">
              <BookingDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
