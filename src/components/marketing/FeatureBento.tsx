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
        <div className="pointer-events-none absolute right-6 top-6 hidden w-[260px] space-y-2 lg:block" aria-hidden="true">
          {[
            { ch: "Web", time: "10:00", name: "Elif K.", img: "/sectors/guzellik.jpg", pos: "object-[50%_22%]", tone: "bg-sky-500" },
            { ch: "WhatsApp", time: "11:30", name: "Zeynep A.", img: "/sectors/spa.jpg", pos: "object-[45%_20%]", tone: "bg-emerald-500" },
            { ch: "Instagram", time: "13:00", name: "Selin D.", img: "/sectors/makyaj.jpg", pos: "object-[45%_22%]", tone: "bg-pink-500" },
          ].map((b) => (
            <div key={b.ch} className="flex items-center gap-2.5 rounded-xl border border-border bg-background/80 px-2.5 py-2 shadow-sm transition-transform duration-300 group-hover:-translate-x-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.img} alt="" className={`h-8 w-8 rounded-full object-cover ${b.pos}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{b.name}</div>
                <div className="text-[10px] text-muted-foreground">{b.time}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${b.tone}`}>{b.ch}</span>
            </div>
          ))}
        </div>
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
          <div className="mb-1 flex items-center gap-2 rounded-xl bg-violet-500/10 px-2.5 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sectors/diyetisyen.jpg" alt="" className="h-6 w-6 rounded-full object-cover object-[28%_28%]" />
            <span className="text-[11px] font-bold">SiriPlan AI</span>
            <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">{t("homeVisual.chat.q")}</div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
            {t("homeVisual.chat.a")}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> {t("homeVisual.chat.done")}
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">{t("homeVisual.chat.q2")}</div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
            {t("homeVisual.chat.a2")}
          </div>
          <div className="flex w-14 items-center justify-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
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
          <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">VIP</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
        </div>
        <div className="mt-3 flex -space-x-2" aria-hidden="true">
          {[
            ["/sectors/guzellik.jpg", "object-[50%_22%]"],
            ["/sectors/spa.jpg", "object-[45%_20%]"],
            ["/sectors/makyaj.jpg", "object-[45%_22%]"],
            ["/sectors/berber.jpg", "object-[38%_22%]"],
          ].map(([src, pos]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className={`h-7 w-7 rounded-full border-2 border-card object-cover ${pos}`} />
          ))}
        </div>
      </div>

      {/* Ciro & analitik */}
      <div className={`${card} md:col-span-2`}>
        <div className={`${iconBox} bg-indigo-50 dark:bg-indigo-950/30`}>
          <BarChart3 className="h-5 w-5 text-indigo-500" />
        </div>
        <h3 className="mb-2 font-semibold">{t("features.analytics.title")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("features.analytics.desc")}</p>
        <div className="mt-4 flex items-center justify-between" aria-hidden="true">
          <span className="text-xs font-semibold text-muted-foreground">{t("homeVisual.mock.revenue")}</span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">↑ 40%</span>
        </div>
        <div className="mt-2 flex h-14 items-end gap-1" aria-hidden="true">
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
