"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, MessageCircle, TrendingUp } from "lucide-react";

/**
 * Panel gezintisi — tamamen SAHTE/statik veriyle çizilmiş salt-okunur mock
 * ekranlar (gerçek müşteri/personel verisi yok, API çağrısı yok). Ana sayfada
 * ve /indir'de kullanılır; metinler çağıranın verdiği `labels`'tan gelir.
 */
export type PanelTourLabels = {
  title: string;
  subtitle: string;
  tabs: Record<Step, string>;
  desc: Record<Step, string>;
  mock: {
    today: string;
    pending: string;
    confirmed: string;
    approve: string;
    reject: string;
    haircut: string;
    manicure: string;
    skincare: string;
    revenue: string;
    appointments: string;
    completed: string;
    waName: string;
    waMsg: string;
  };
};

type Step = "calendar" | "approve" | "whatsapp" | "income";
const STEPS: { key: Step; Icon: typeof CalendarDays }[] = [
  { key: "calendar", Icon: CalendarDays },
  { key: "approve", Icon: CheckCircle2 },
  { key: "whatsapp", Icon: MessageCircle },
  { key: "income", Icon: TrendingUp },
];

function CalendarMock({ m }: { m: PanelTourLabels["mock"] }) {
  const rows = [
    { t: "09:00", n: "Ayşe K.", s: m.haircut, c: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900", h: "h-14" },
    { t: "10:00", n: "", s: "", c: "", h: "h-8" },
    { t: "11:00", n: "Zeynep A.", s: m.manicure, c: "bg-sky-100 border-sky-400 text-sky-900", h: "h-12" },
    { t: "12:00", n: "Elif D.", s: m.skincare, c: "bg-emerald-100 border-emerald-400 text-emerald-900", h: "h-16" },
    { t: "14:00", n: "Selin Y.", s: m.haircut, c: "bg-amber-100 border-amber-400 text-amber-900", h: "h-12" },
  ];
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm font-bold text-slate-800">{m.today}</p>
      {rows.map((r) => (
        <div key={r.t} className="flex gap-2">
          <span className="w-10 shrink-0 pt-1 text-[11px] text-slate-400">{r.t}</span>
          {r.n ? (
            <div className={`flex-1 rounded-lg border-l-4 px-2 py-1 ${r.c} ${r.h}`}>
              <p className="text-xs font-semibold">{r.n}</p>
              <p className="text-[11px] opacity-80">{r.s}</p>
            </div>
          ) : (
            <div className={`flex-1 rounded-lg border border-dashed border-slate-200 ${r.h}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ApproveMock({ m }: { m: PanelTourLabels["mock"] }) {
  return (
    <div className="space-y-3 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Ayşe K.</p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{m.pending}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{m.haircut} · 14:00 · ₺800</p>
        <div className="mt-3 flex gap-2">
          <span className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-center text-xs font-semibold text-white">{m.approve}</span>
          <span className="flex-1 rounded-lg border border-rose-300 py-1.5 text-center text-xs font-semibold text-rose-600">{m.reject}</span>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 opacity-90 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Zeynep A.</p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{m.confirmed}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{m.manicure} · 16:30 · ₺600</p>
      </div>
    </div>
  );
}

function WhatsappMock({ m }: { m: PanelTourLabels["mock"] }) {
  return (
    <div className="flex h-full flex-col bg-[#efeae2]">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-xs font-bold">S</span>
        <p className="text-sm font-semibold">{m.waName}</p>
      </div>
      <div className="flex-1 p-3">
        <div className="max-w-[88%] rounded-lg rounded-tl-none bg-white p-2.5 text-xs leading-relaxed text-slate-800 shadow">
          {m.waMsg}
          <p className="mt-1 text-right text-[10px] text-slate-400">09:41</p>
        </div>
      </div>
    </div>
  );
}

function IncomeMock({ m }: { m: PanelTourLabels["mock"] }) {
  const bars = [40, 65, 50, 80, 60, 95, 72];
  return (
    <div className="space-y-3 p-4">
      <div className="rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-700 p-3 text-white">
        <p className="text-[11px] opacity-80">{m.revenue}</p>
        <p className="text-2xl font-extrabold">₺18.400</p>
      </div>
      <div className="flex h-24 items-end gap-1.5 rounded-xl border border-slate-200 bg-white p-3">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-fuchsia-500/80" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
          <p className="text-[11px] text-slate-500">{m.appointments}</p>
          <p className="text-lg font-bold text-slate-800">42</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
          <p className="text-[11px] text-slate-500">{m.completed}</p>
          <p className="text-lg font-bold text-slate-800">38</p>
        </div>
      </div>
    </div>
  );
}

export function PanelTour({ labels, dark = false }: { labels: PanelTourLabels; dark?: boolean }) {
  const [active, setActive] = useState<Step>("calendar");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setActive((cur) => STEPS[(STEPS.findIndex((s) => s.key === cur) + 1) % STEPS.length].key);
    }, 4500);
    return () => clearInterval(id);
  }, [auto]);

  const muted = dark ? "text-white/70" : "text-muted-foreground";

  return (
    <section className={`relative overflow-hidden ${dark ? "mt-12 w-full" : "py-20"}`} aria-label={labels.title}>
      <div className={dark ? "" : "container mx-auto px-4"}>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className={`${dark ? "text-xl" : "mb-4 text-3xl md:text-4xl"} font-bold`}>{labels.title}</h2>
          <p className={`${dark ? "mt-1 text-sm" : ""} ${muted}`}>{labels.subtitle}</p>
        </div>

        <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-[1fr_auto]">
          <div role="tablist" aria-label={labels.title} className="order-2 grid grid-cols-2 gap-2 md:order-1 md:grid-cols-1">
            {STEPS.map(({ key, Icon }) => {
              const on = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setAuto(false);
                    setActive(key);
                  }}
                  className={
                    "flex items-start gap-3 rounded-2xl border p-3 text-left transition " +
                    (on
                      ? dark
                        ? "border-[#e8c15a] bg-white/15"
                        : "border-primary bg-primary/10"
                      : dark
                        ? "border-white/15 bg-white/5 hover:bg-white/10"
                        : "border-border hover:bg-muted/50")
                  }
                >
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${on ? (dark ? "text-[#e8c15a]" : "text-primary") : muted}`} aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-bold">{labels.tabs[key]}</span>
                    <span className={`hidden text-xs md:block ${muted}`}>{labels.desc[key]}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="order-1 mx-auto md:order-2" role="tabpanel" aria-live="polite">
            <div className="w-60 rounded-[2rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl sm:w-64">
              <div className="h-[26rem] overflow-hidden rounded-[1.5rem] bg-slate-50">
                {active === "calendar" && <CalendarMock m={labels.mock} />}
                {active === "approve" && <ApproveMock m={labels.mock} />}
                {active === "whatsapp" && <WhatsappMock m={labels.mock} />}
                {active === "income" && <IncomeMock m={labels.mock} />}
              </div>
            </div>
            <p className={`mt-3 text-center text-xs md:hidden ${muted}`}>{labels.desc[active]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
