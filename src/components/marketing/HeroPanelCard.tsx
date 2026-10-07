import { getTranslations } from "next-intl/server";
import { Check, Users, UserCog, Boxes, Wallet, LayoutDashboard, Scissors, Megaphone } from "lucide-react";

/**
 * Hero'nun orta boşluğuna oturan "Tek panelde her şey" özeti: CRM, personel,
 * stok ve gelir-gider başlıkları tikli. Geniş ekranda yüzen kart, dar ekranda
 * küçük rozet satırı. Dekoratif; veri çekmez.
 */
const ITEMS = [
  { key: "salon", Icon: Scissors, tone: "from-orange-500 to-amber-400" },
  { key: "crm", Icon: Users, tone: "from-pink-500 to-rose-400" },
  { key: "staff", Icon: UserCog, tone: "from-violet-500 to-fuchsia-400" },
  { key: "stock", Icon: Boxes, tone: "from-sky-500 to-blue-400" },
  { key: "finance", Icon: Wallet, tone: "from-emerald-500 to-teal-400" },
  { key: "campaign", Icon: Megaphone, tone: "from-blue-500 to-indigo-400" },
] as const;

export async function HeroPanelCard() {
  const t = await getTranslations("homeVisual.panel");

  return (
    <>
      {/* Geniş ekran: sol sütunun sağ alt boşluğunda yüzen kart */}
      <div className="sp-float-slow absolute -right-10 bottom-2 z-10 hidden w-[270px] rounded-2xl border border-border bg-card/95 p-4 text-left shadow-xl backdrop-blur xl:block">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-500 text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          {t("title")}
        </div>
        <ul className="space-y-1">
          {ITEMS.map(({ key, Icon, tone }) => (
            <li key={key} className="group flex items-center gap-2.5 rounded-xl px-1.5 py-0.5 transition-colors hover:bg-muted/60">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tone} text-white shadow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[13px] font-semibold leading-tight">{t(key)}</span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3 w-3" />
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Dar ekran: rozet satırı */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start xl:hidden">
        <span className="w-full text-xs font-bold text-primary">{t("title")}</span>
        {ITEMS.map(({ key }) => (
          <span key={key} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold">
            <Check className="h-3 w-3 text-emerald-500" />
            {t(key)}
          </span>
        ))}
      </div>
    </>
  );
}
