import { getTranslations } from "next-intl/server";
import {
  Calendar, Bot, Users, Trophy, MessageSquare, BarChart3, Upload, FileDown,
  Check, Star,
} from "lucide-react";

/**
 * Özellikler bento ızgarası. Başlık/açıklamalar mevcut `features.*`
 * anahtarlarından gelir; kartların içindeki küçük görseller dekoratiftir.
 */
export async function FeatureBento() {
  const t = await getTranslations();

  const card =
    "group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg";
  const iconBox = "mb-4 flex h-10 w-10 items-center justify-center rounded-xl";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      {/* Çok kanallı randevu — geniş */}
      <div className={`${card} md:col-span-4`}>
        <div className={`${iconBox} bg-rose-50 dark:bg-rose-950/30`}>
          <Calendar className="h-5 w-5 text-rose-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t("features.booking.title")}</h3>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t("features.booking.desc")}</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
          {["Web", "WhatsApp", "Instagram"].map((c) => (
            <span key={c} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* AI asistanı — sohbet balonları */}
      <div className={`${card} md:col-span-2 md:row-span-2`}>
        <div className={`${iconBox} bg-violet-50 dark:bg-violet-950/30`}>
          <Bot className="h-5 w-5 text-violet-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t("features.ai.title")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("features.ai.desc")}</p>
        <div className="mt-5 space-y-2 text-xs" aria-hidden="true">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">{t("homeVisual.chat.q")}</div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
            {t("homeVisual.chat.a")}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> {t("homeVisual.chat.done")}
          </div>
        </div>
      </div>

      {/* Müşteri skoru */}
      <div className={`${card} md:col-span-2`}>
        <div className={`${iconBox} bg-amber-50 dark:bg-amber-950/30`}>
          <Users className="h-5 w-5 text-amber-500" />
        </div>
        <h3 className="mb-2 font-semibold">{t("features.crm.title")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("features.crm.desc")}</p>
        <div className="mt-4 flex items-center gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
          <span className="ml-2 text-sm font-bold">92</span>
        </div>
      </div>

      {/* Ciro & analitik */}
      <div className={`${card} md:col-span-2`}>
        <div className={`${iconBox} bg-indigo-50 dark:bg-indigo-950/30`}>
          <BarChart3 className="h-5 w-5 text-indigo-500" />
        </div>
        <h3 className="mb-2 font-semibold">{t("features.analytics.title")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("features.analytics.desc")}</p>
        <div className="mt-4 flex h-10 items-end gap-1" aria-hidden="true">
          {[40, 60, 45, 80, 65, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-indigo-500/60" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Küçük kartlar */}
      {[
        { k: "staff", Icon: Trophy, c: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        { k: "campaigns", Icon: MessageSquare, c: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
        { k: "migration", Icon: Upload, c: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30" },
        { k: "export", Icon: FileDown, c: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
      ].map(({ k, Icon, c, bg }) => (
        <div key={k} className={`${card} md:col-span-3 lg:col-span-3`}>
          <div className="flex items-start gap-4">
            <div className={`${bg} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
              <Icon className={`h-5 w-5 ${c}`} />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">{t(`features.${k}.title`)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`features.${k}.desc`)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
