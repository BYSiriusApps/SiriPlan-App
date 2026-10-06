"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck, Check, ChevronLeft, Clock, MessageCircle, RotateCcw, Send } from "lucide-react";

/**
 * Ana sayfa "Website Modu" vitrinindeki etkileşimli mini randevu demosu.
 * Saat seç → uzman seç → randevu oluştu + müşteriye WhatsApp / salona Telegram
 * bildirimi. Tamamen dekoratif/yerel durum; hiçbir API çağrısı yapmaz.
 */
const SLOTS = [
  { time: "09:30", taken: false },
  { time: "10:00", taken: false },
  { time: "11:30", taken: true },
  { time: "13:00", taken: false },
  { time: "14:30", taken: false },
  { time: "16:00", taken: true },
];

const STAFF = [
  { name: "Selin", src: "/sectors/guzellik.jpg", pos: "object-[50%_25%]" },
  { name: "Mert", src: "/sectors/berber.jpg", pos: "object-[38%_22%]" },
  { name: "Elif", src: "/sectors/makyaj.jpg", pos: "object-[45%_22%]" },
];

type Step = "time" | "staff" | "done";

export function BookingDemo() {
  const t = useTranslations("homeVisual.website.demo");
  const [step, setStep] = useState<Step>("time");
  const [time, setTime] = useState<string | null>(null);
  const [staff, setStaff] = useState<string | null>(null);

  const reset = () => {
    setStep("time");
    setTime(null);
    setStaff(null);
  };

  return (
    <div className="w-full overflow-hidden rounded-[1.8rem] border-[5px] border-foreground/85 bg-card shadow-2xl shadow-primary/25">
      <div className="bg-gradient-to-r from-primary to-amber-500 px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-bold">
          <CalendarCheck className="h-4 w-4" />
          {t("title")}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] opacity-90">
          <Clock className="h-3 w-3" />
          {t("service")} · {t("tomorrow")}
        </div>
      </div>

      <div className="min-h-[300px] p-3.5">
        {step === "time" && (
          <div key="time" className="animate-fade-up">
            <div className="mb-2 text-xs font-semibold text-foreground">{t("pickTime")}</div>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  disabled={s.taken}
                  onClick={() => {
                    setTime(s.time);
                    setStep("staff");
                  }}
                  className={
                    s.taken
                      ? "cursor-not-allowed rounded-xl border border-border bg-muted/50 py-2 text-xs font-semibold text-muted-foreground/50 line-through"
                      : "rounded-xl border border-primary/30 bg-primary/10 py-2 text-xs font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-md active:scale-95"
                  }
                >
                  {s.time}
                </button>
              ))}
            </div>
            <p className="mt-3 animate-pulse text-center text-[11px] text-muted-foreground">👆 {t("hint")}</p>
          </div>
        )}

        {step === "staff" && time && (
          <div key="staff" className="animate-fade-up">
            <button
              type="button"
              onClick={() => setStep("time")}
              className="mb-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              {t("back")} · {time}
            </button>
            <div className="mb-2 text-xs font-semibold text-foreground">{t("pickStaff")}</div>
            <div className="space-y-2">
              {STAFF.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setStaff(p.name);
                    setStep("done");
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:scale-[0.98]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt=""
                    className={`h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 transition group-hover:ring-primary ${p.pos}`}
                  />
                  <span className="flex-1 text-sm font-semibold">{p.name}</span>
                  <Check className="h-4 w-4 text-primary opacity-0 transition group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "done" && time && staff && (
          <div key="done" className="animate-fade-up">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                <Check className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">{t("done")}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {t("summary", { staff, time })}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-[11px] leading-snug">
              <div className="animate-fade-up rounded-xl rounded-ss-sm bg-emerald-500/10 p-2.5" style={{ animationDelay: "0.5s" }}>
                <div className="mb-1 flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </div>
                {t("wa", { time })}
              </div>
              <div className="animate-fade-up rounded-xl rounded-ss-sm bg-sky-500/10 p-2.5" style={{ animationDelay: "1.2s" }}>
                <div className="mb-1 flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                  <Send className="h-3 w-3" /> Telegram
                </div>
                {t("tg", { time })}
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-3 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {t("reset")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
