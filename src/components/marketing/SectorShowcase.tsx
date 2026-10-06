import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Sektör vitrini — gülümseyen gerçek müşteri/uzman fotoğraflarıyla.
 * Görseller public/sectors/ altında; yenisi eklemek için listeye bir satır yeter.
 */
const SECTORS = [
  { key: "barber", img: "berber", pos: "object-[50%_25%]" },
  { key: "hairdresser", img: "guzellik", pos: "object-center" },
  { key: "spa", img: "spa", pos: "object-[50%_20%]" },
  { key: "makeup", img: "makyaj", pos: "object-[50%_25%]" },
  { key: "tattoo", img: "tattoo", pos: "object-[50%_30%]" },
  { key: "dietitian", img: "diyetisyen", pos: "object-[50%_30%]" },
] as const;

export async function SectorShowcase() {
  const t = await getTranslations("categories");

  return (
    <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {SECTORS.map((s) => (
        <div
          key={s.key}
          className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-border/60 bg-muted"
        >
          <Image
            src={`/sectors/${s.img}.jpg`}
            alt={t(s.key)}
            fill
            sizes="(min-width:1024px) 16vw, (min-width:768px) 33vw, 50vw"
            className={`object-cover ${s.pos} transition-transform duration-500 group-hover:scale-105`}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-10">
            <span className="text-sm font-semibold text-white drop-shadow">{t(s.key)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
