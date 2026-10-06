import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Share2, MapPin, Phone, Images, Star, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Website Modu" vitrini — demo salonun (sirius-demo-salon) gerçek randevu
 * sayfasından alınan ekran görüntüleri. Görseller public/website-demo/ altında.
 */
const POINTS = [
  { key: "social", Icon: Share2 },
  { key: "location", Icon: MapPin },
  { key: "contact", Icon: Phone },
  { key: "photos", Icon: Images },
  { key: "reviews", Icon: Star },
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

            <ul className="mb-8 space-y-3">
              {POINTS.map(({ key, Icon }) => (
                <li key={key} className="flex items-center gap-3 text-sm font-medium">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  {t(key)}
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

          {/* Tarayıcı + telefon çerçevesi */}
          <div className="relative mx-auto w-full max-w-[640px] pb-10 pr-10 md:pr-16">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
                  siriplan.com/r/salon-adiniz
                </span>
              </div>
              <Image
                src="/website-demo/desktop.webp"
                alt={t("imgAlt")}
                width={1100}
                height={688}
                sizes="(min-width:1024px) 600px, 90vw"
                className="h-auto w-full"
              />
            </div>

            <div className="absolute -bottom-2 right-0 w-[34%] max-w-[190px] rounded-[1.6rem] border-[5px] border-foreground/85 bg-foreground/85 shadow-2xl shadow-primary/20">
              <Image
                src="/website-demo/mobile.webp"
                alt=""
                width={480}
                height={1040}
                sizes="190px"
                className="h-auto w-full rounded-[1.2rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
