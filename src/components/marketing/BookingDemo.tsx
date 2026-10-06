"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CalendarCheck, Check, Clock, MessageCircle, Send } from "lucide-react";

/**
 * Ana sayfa "Website Modu" vitrinindeki telefon demosu. Kendi kendine oynar:
 * salon sayfası → "Randevu Al"a dokunuş → saatler → saat seçimi → uzman →
 * randevu oluştu → WhatsApp ve Telegram bildirimi. Tamamen dekoratif; hiçbir
 * API çağrısı yapmaz, yalnızca yerel zamanlayıcı kullanır.
 */
type Screen = "site" | "time" | "staff" | "done";

const TIME = "10:00";
const STAFF = "Selin";

const SLOTS = [
  { time: "09:30", taken: false },
  { time: "10:00", taken: false },
  { time: "11:30", taken: true },
  { time: "13:00", taken: false },
  { time: "14:30", taken: false },
  { time: "16:00", taken: true },
];

const PEOPLE = [
  { name: "Selin", src: "/sectors/guzellik.jpg", pos: "object-[50%_25%]" },
  { name: "Mert", src: "/sectors/berber.jpg", pos: "object-[38%_22%]" },
  { name: "Elif", src: "/sectors/makyaj.jpg", pos: "object-[45%_22%]" },
];

// Senaryo: her adım bir ekran, isteğe bağlı dokunuş (tap) ve bildirim sayısı.
const STEPS: { screen: Screen; ms: number; tap?: boolean; notif?: number }[] = [
  { screen: "site", ms: 1800 },
  { screen: "site", ms: 700, tap: true },
  { screen: "time", ms: 1500 },
  { screen: "time", ms: 800, tap: true },
  { screen: "staff", ms: 1300 },
  { screen: "staff", ms: 800, tap: true },
  { screen: "done", ms: 1400 },
  { screen: "done", ms: 2200, notif: 1 },
  { screen: "done", ms: 3200, notif: 2 },
];

function Tap() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
      <span className="sp-tap absolute -left-5 -top-5 h-10 w-10 rounded-full bg-primary/40" />
      <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-primary shadow-lg" />
    </span>
  );
}

export function BookingDemo() {
  const t = useTranslations("homeVisual.website.demo");
  const [i, setI] = useState(0);
  const step = STEPS[i];

  useEffect(() => {
    const id = setTimeout(() => setI((n) => (n + 1) % STEPS.length), step.ms);
    return () => clearTimeout(id);
  }, [i, step.ms]);

  return (
    <div className="relative w-full overflow-hidden rounded-[1.8rem] border-[5px] border-foreground/85 bg-foreground/85 shadow-2xl shadow-primary/25">
      <div className="relative aspect-[390/844] overflow-hidden rounded-[1.4rem] bg-background">
        {/* Salon sayfası (gerçek ekran görüntüsü) */}
        {step.screen === "site" && (
          <div key="site" className="absolute inset-0 animate-fade-up">
            <Image
              src="/website-demo/mobile.webp"
              alt=""
              fill
              sizes="250px"
              className="object-cover object-top"
            />
            {/* "Randevu Al" düğmesinin üstündeki dokunuş */}
            <div className="absolute bottom-[3%] left-1/2 h-[6%] w-[90%] -translate-x-1/2">
              {step.tap && <Tap />}
            </div>
          </div>
        )}

        {/* Başlık şeridi: saat/uzman/onay ekranlarında */}
        {step.screen !== "site" && (
          <div key={`head-${step.screen}`} className="absolute inset-0 flex flex-col bg-card">
            <div className="bg-gradient-to-r from-primary to-amber-500 px-4 pb-3 pt-5 text-primary-foreground">
              <div className="flex items-center gap-2 text-sm font-bold">
                <CalendarCheck className="h-4 w-4" />
                {t("title")}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] opacity-90">
                <Clock className="h-3 w-3" />
                {t("service")} · {t("tomorrow")}
              </div>
            </div>

            <div className="flex-1 p-4 pt-5">
              {step.screen === "time" && (
                <div className="animate-fade-up">
                  <div className="mb-3 text-sm font-semibold text-foreground">{t("pickTime")}</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {SLOTS.map((s) => {
                      const picked = s.time === TIME && step.tap;
                      return (
                        <div
                          key={s.time}
                          className={`relative rounded-xl border py-4 text-center text-sm font-bold transition-all duration-300 ${
                            s.taken
                              ? "border-border bg-muted/50 text-muted-foreground/50 line-through"
                              : picked
                                ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "border-primary/30 bg-primary/10 text-primary"
                          }`}
                        >
                          {s.time}
                          {s.time === TIME && step.tap && <Tap />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step.screen === "staff" && (
                <div className="animate-fade-up">
                  <div className="mb-3 text-sm font-semibold text-foreground">
                    {t("pickStaff")} · {TIME}
                  </div>
                  <div className="space-y-3">
                    {PEOPLE.map((p) => {
                      const picked = p.name === STAFF && step.tap;
                      return (
                        <div
                          key={p.name}
                          className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
                            picked ? "scale-[1.03] border-primary bg-primary/10 shadow-md" : "border-border bg-background"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.src} alt="" className={`h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 ${p.pos}`} />
                          <span className="flex-1 text-sm font-semibold">{p.name}</span>
                          {picked && <Check className="h-4 w-4 text-primary" />}
                          {picked && <Tap />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step.screen === "done" && (
                <div className="animate-fade-up pt-16 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
                    <Check className="h-8 w-8" />
                  </span>
                  <div className="mt-3 text-base font-bold">{t("done")}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t("summary", { staff: STAFF, time: TIME })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Telefon bildirimleri: üstten kayarak gelir */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-30 space-y-1.5">
          {(step.notif ?? 0) >= 1 && (
            <div key="wa" className="sp-notif rounded-2xl border border-border bg-card/95 p-2.5 shadow-xl backdrop-blur">
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500 text-white">
                  <MessageCircle className="h-2.5 w-2.5" />
                </span>
                WhatsApp
              </div>
              <div className="text-[11px] leading-snug text-foreground">{t("wa", { time: TIME })}</div>
            </div>
          )}
          {(step.notif ?? 0) >= 2 && (
            <div key="tg" className="sp-notif rounded-2xl border border-border bg-card/95 p-2.5 shadow-xl backdrop-blur">
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-sky-500 text-white">
                  <Send className="h-2.5 w-2.5" />
                </span>
                Telegram
              </div>
              <div className="text-[11px] leading-snug text-foreground">{t("tg", { time: TIME })}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
