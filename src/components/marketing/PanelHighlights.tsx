import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Check, Users, UserCog, Boxes, Wallet, Sparkles, type LucideIcon } from "lucide-react";

/**
 * "Tek panelde her şey" vitrini — ortada CEO avatarı (elleri açık), yanında
 * tik atılmış dört yönetim başlığı. Tamamen dekoratif; veri çekmez.
 * Görsel: public/home/ceo-avatar.webp (şeffaf arka planlı).
 */
const ITEMS = [
  { key: "crm", Icon: Users, tone: "from-pink-500 to-rose-400" },
  { key: "staff", Icon: UserCog, tone: "from-violet-500 to-fuchsia-400" },
  { key: "stock", Icon: Boxes, tone: "from-sky-500 to-blue-400" },
  { key: "finance", Icon: Wallet, tone: "from-emerald-500 to-teal-400" },
] as const;

export async function PanelHighlights() {
  const t = await getTranslations("homeVisual.panel");

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </span>
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">{t("title")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
          <div className="order-2 space-y-4 md:order-1">
            {ITEMS.slice(0, 2).map((it) => (
              <HighlightCard key={it.key} Icon={it.Icon} tone={it.tone} label={t(it.key)} />
            ))}
          </div>

          <div className="relative order-1 mx-auto h-[360px] w-[270px] md:order-2 md:h-[430px] md:w-[320px]">
            <div className="absolute inset-x-2 bottom-0 top-10 rounded-full bg-gradient-to-b from-primary/30 via-amber-400/20 to-transparent" />
            <div className="sp-float-slow absolute -left-3 top-6 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold shadow-lg">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {t("chip1")}
            </div>
            <div className="sp-float absolute -right-4 top-14 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold shadow-lg">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {t("chip2")}
            </div>
            <Image
              src="/home/ceo-avatar.webp"
              alt=""
              width={600}
              height={800}
              sizes="320px"
              className="relative mx-auto h-full w-auto object-contain object-bottom [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
            />
          </div>

          <div className="order-3 space-y-4">
            {ITEMS.slice(2).map((it) => (
              <HighlightCard key={it.key} Icon={it.Icon} tone={it.tone} label={t(it.key)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HighlightCard({ Icon, tone, label }: { Icon: LucideIcon; tone: string; label: string }) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex-1 text-sm font-semibold leading-snug md:text-base">{label}</span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
        <Check className="h-4 w-4" />
      </span>
    </div>
  );
}
