import { getTranslations } from "next-intl/server";
import { formatPrice, type PricingCurrency } from "@/lib/pricing";
import { CalendarCheck, Mic, MessageCircle, TrendingUp, Check, Star, BellRing } from "lucide-react";

/**
 * Ana sayfa hero görseli — gerçek ekran görüntüsü yerine CSS ile çizilmiş
 * panel önizlemesi (takvim + WhatsApp onayı + ciro + sesli asistan).
 * Tamamen dekoratif; veri çekmez, tema renklerini (primary/card/muted) kullanır.
 */
// Örnek ciro rakamı ziyaretçinin para birimine göre gösterilir (TL / USD / EUR).
const SAMPLE_REVENUE: Record<PricingCurrency, number> = { TRY: 18450, USD: 540, EUR: 500 };

export async function HeroMockup({ currency = "TRY" }: { currency?: PricingCurrency }) {
  const t = await getTranslations("homeVisual.mock");

  const rows = [
    { time: "10:00", name: "Elif K.", img: "/sectors/guzellik.jpg", pos: "object-[50%_22%]", svc: t("svc1"), tone: "bg-primary/15 text-primary border-primary/30" },
    { time: "11:30", name: "Zeynep A.", img: "/sectors/spa.jpg", pos: "object-[45%_20%]", svc: t("svc2"), tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    { time: "13:00", name: "Selin D.", img: "/sectors/makyaj.jpg", pos: "object-[45%_22%]", svc: t("svc3"), tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
    { time: "15:30", name: "İpek Y.", img: "/sectors/diyetisyen.jpg", pos: "object-[28%_28%]", svc: t("svc1"), tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  ];
  const bars = [38, 55, 44, 70, 62, 88, 76];

  return (
    <div className="relative mx-auto w-full max-w-[520px] select-none" aria-hidden="true">
      {/* arka plan ışıma */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-tr from-primary/25 via-primary/5 to-amber-400/20 blur-3xl" />

      {/* Ana panel kartı */}
      <div className="rounded-3xl border border-border bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur overflow-hidden md:[transform:perspective(1400px)_rotateY(-7deg)_rotateX(3deg)]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarCheck className="h-3.5 w-3.5 text-primary" />
            {t("today")}
          </span>
        </div>

        <div className="flex items-center gap-3 bg-gradient-to-r from-primary/20 via-amber-400/10 to-transparent px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-500 text-lg font-bold text-primary-foreground shadow-md">S</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-foreground">Sirius Güzellik</div>
            <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1 font-semibold text-foreground">4.9</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t("live")}
          </span>
        </div>

        <div className="space-y-2.5 p-4 pt-3">
          {rows.map((r) => (
            <div key={r.time} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.tone}`}>
              <span className="w-11 text-xs font-bold tabular-nums">{r.time}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.img} alt="" className={`h-9 w-9 shrink-0 rounded-full border-2 border-background object-cover shadow-sm ${r.pos}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{r.name}</div>
                <div className="truncate text-xs text-muted-foreground">{r.svc}</div>
              </div>
              <Check className="h-4 w-4 shrink-0" />
            </div>
          ))}
        </div>

        <div className="flex items-end gap-1.5 border-t border-border px-4 pb-4 pt-3">
          <div className="mr-3 shrink-0">
            <div className="text-[11px] text-muted-foreground">{t("revenue")}</div>
            <div className="text-lg font-bold text-foreground">{formatPrice(SAMPLE_REVENUE[currency], currency)}</div>
          </div>
          <div className="flex h-12 flex-1 items-end gap-1.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70"
                style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Yüzen: WhatsApp onayı */}
      <div className="sp-float absolute -right-2 top-[17.5rem] w-48 rounded-2xl border border-border bg-card p-3 shadow-xl md:-right-10">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sectors/guzellik.jpg" alt="" className="ml-auto h-5 w-5 rounded-full object-cover object-[50%_22%]" />
        </div>
        <div className="rounded-xl rounded-tl-sm bg-emerald-500/10 px-2.5 py-2 text-xs leading-snug text-foreground">
          {t("wa")}
        </div>
      </div>

      {/* Yüzen: ciro artışı */}
      <div className="sp-float-slow absolute -right-2 -top-5 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-xl md:-right-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </span>
        <div>
          <div className="text-sm font-bold leading-none text-foreground">+%40</div>
          <div className="text-[10px] text-muted-foreground">{t("occupancy")}</div>
        </div>
      </div>

      {/* Yüzen: yeni online randevu bildirimi */}
      <div className="sp-float-slow absolute -left-2 -top-7 hidden items-center gap-2.5 rounded-2xl border border-border bg-card py-2 pl-2 pr-3.5 shadow-xl sm:flex md:-left-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sectors/makyaj.jpg" alt="" className="h-9 w-9 rounded-full object-cover object-[45%_22%] ring-2 ring-primary/30" />
        <div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
            <BellRing className="h-3 w-3" />
            {t("newAppt")}
          </div>
          <div className="text-xs font-bold leading-tight text-foreground">Selin D. · 13:00</div>
        </div>
      </div>

      {/* Yüzen: sesli asistan — komut baloncuğu */}
      <div className="sp-float absolute -bottom-9 right-2 flex max-w-[270px] items-start gap-2.5 rounded-2xl rounded-br-sm border border-border bg-card p-2.5 pr-3.5 shadow-xl md:-right-6">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Mic className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium leading-snug text-foreground">{t("voice")}</span>
      </div>
    </div>
  );
}
