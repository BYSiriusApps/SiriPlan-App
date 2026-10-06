import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Mobil uygulama vitrini — iOS/Android uygulamasının gerçek ekran görüntüleri
 * (demo verisiyle) telefon çerçevesi içinde. Dosyalar public/app-shots/ altında.
 */
const SHOTS = [
  { key: "calendar", img: "takvim", tilt: "md:-rotate-2 md:translate-y-4" },
  { key: "stock", img: "stok", tilt: "md:rotate-1" },
  { key: "customers", img: "musteriler", tilt: "md:-rotate-1 md:translate-y-4" },
  { key: "finance", img: "gelirgider", tilt: "md:rotate-2" },
] as const;

export async function MobileShowcase() {
  const t = await getTranslations("homeVisual.mobile");

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("title")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {SHOTS.map((s) => (
            <figure key={s.key} className={`transition-transform duration-500 ${s.tilt}`}>
              <div className="rounded-[2rem] border-[6px] border-foreground/85 bg-foreground/85 shadow-2xl shadow-primary/15">
                <div className="relative aspect-[1284/2778] overflow-hidden rounded-[1.5rem] bg-background">
                  <Image
                    src={`/app-shots/${s.img}.webp`}
                    alt={t(s.key)}
                    fill
                    sizes="(min-width:768px) 22vw, 46vw"
                    className="object-cover object-top"
                  />
                </div>
              </div>
              <figcaption className="mt-4 text-center text-sm font-semibold">{t(s.key)}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
