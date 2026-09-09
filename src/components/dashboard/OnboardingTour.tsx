"use client";

/**
 * Yeni işletme kurulum turu.
 *
 * İki parça, tek dosya:
 *  - <OnboardingWelcome>  → panel ana sayfasında bir kez çıkan karşılama kutusu.
 *    "Turu Başlat" → /dashboard/ayarlar?tour=1'e götürür.
 *  - <OnboardingTour>     → ayarlar sayfasında `?tour=1` varken çalışan, bölümleri
 *    tek tek işaret eden balon/spot ışığı gezintisi.
 *
 * GÜVENLİK / KAPSAM: Bu bileşen SALT GÖRSEL bir katmandır. Formları, kaydet
 * akışını, mesaj gönderimini veya yetki kontrollerini ne sarar ne değiştirir.
 * Tek yazdığı şey `organizations.onboarding_tour_completed_at` — ayarlar
 * sayfasının zaten kullandığı client → Supabase UPDATE ile aynı yol
 * (org_update RLS: owner/manager). Yeni API/tablo yok, yeni bağımlılık yok.
 * Kolon henüz yoksa yazım sessizce başarısız olur, tur yine de kapanır.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { Button } from "@/components/ui/button";
import { Compass, X, ChevronLeft, ChevronRight, Sparkles, BookOpen } from "lucide-react";

const LS_KEY = "siriplan_onboarding_tour_done";
/** Aynı sayfada "turu tekrar başlat" için — useSearchParams'a gerek kalmadan. */
const TOUR_EVENT = "siriplan:onboarding-tour";

/** URL'de ?tour=1 var mı? (plan-sec sayfasıyla aynı desen: window'dan oku, Suspense yok) */
function tourParamActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("tour") === "1";
  } catch {
    return false;
  }
}

/**
 * Sıra ÖNEMLİ — ayarlar sayfasındaki data-tour öznitelikleriyle eşleşir ve
 * sayfadaki GÖRSEL sırayla aynı olmalı (aksi halde tur adımlar arası
 * yukarı-aşağı zıplar). Sayfa akışı: temel bilgiler → randevu linki →
 * entegrasyonlar/Telegram → otomatik mesajlar → online randevu ayarları
 * (randevu dilimi) → WhatsApp bildirimleri → çalışma saatleri.
 */
type Step = { key: string; target?: string };

/** İşletme sahibi / yönetici turu — ayarlar sayfasında çalışır. */
const STEPS: Step[] = [
  { key: "intro" },
  { key: "basicInfo", target: "basic-info" },
  { key: "bookingLink", target: "booking-link" },
  { key: "integrations", target: "integrations" },
  { key: "autoMessage", target: "auto-message" },
  { key: "onlineBooking", target: "online-booking" },
  { key: "whatsappNotif", target: "whatsapp-notif" },
  { key: "workingHours", target: "working-hours" },
  { key: "staffPermissions", target: "staff-permissions" },
  { key: "done" },
];

/**
 * Personel turu — panel ana sayfasında çalışır, hedef işaretlemez (ortalanmış
 * kartlar). Personel ayarlar sayfasına erişemez; bu tur "neyi nerede yaparım +
 * yetkilerim" odaklı.
 */
export const STAFF_STEPS: Step[] = [
  { key: "staffIntro" },
  { key: "staffNav" },
  { key: "staffPerms" },
  { key: "staffAccount" },
  { key: "staffDone" },
];

async function markCompleted(orgId: string, personalOnly = false) {
  try {
    localStorage.setItem(LS_KEY, "1");
  } catch {
    /* özel pencere / depolama kapalı — sorun değil */
  }
  if (personalOnly) return; // personel: yalnızca kendi cihazında işaretle, org bayrağına dokunma
  try {
    await createClient()
      .from("organizations")
      .update({ onboarding_tour_completed_at: new Date().toISOString() })
      .eq("id", orgId);
  } catch {
    /* kolon yok ya da ağ hatası — tur yine kapanır, kutu DB'den tekrar gelebilir */
  }
}

/* ────────────────────────────────────────────────────────────
 * Panel ana sayfası: karşılama kutusu
 * ──────────────────────────────────────────────────────────── */
export function OnboardingWelcome({ orgId, role = "owner" }: { orgId: string; role?: string }) {
  const t = useTranslations("dashboard.tour");
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  // Personel ayarlar turuna erişemez → ana sayfada çalışan kısa personel turu.
  const isStaffOnly = role === "staff";

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === "1") setHidden(true);
    } catch {
      /* yok say */
    }
  }, []);

  if (hidden) return null;

  const startTour = () => {
    if (isStaffOnly) {
      try {
        window.history.replaceState(window.history.state, "", "/dashboard?tour=1");
      } catch {
        /* yok say */
      }
      window.dispatchEvent(new Event(TOUR_EVENT));
      setHidden(true);
    } else {
      router.push("/dashboard/ayarlar?tour=1");
    }
  };

  return (
    <div className="px-4 max-w-6xl mx-auto">
      <GlassCard3D className="glass-card relative overflow-hidden" glow intensity={3}>
        <button
          onClick={() => {
            setHidden(true);
            void markCompleted(orgId, isStaffOnly);
          }}
          aria-label={t("skip")}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-4 px-4 py-4 sm:px-5">
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <p className="font-heading text-base font-bold text-foreground">
                {t(isStaffOnly ? "welcomeStaffTitle" : "welcomeTitle")}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t(isStaffOnly ? "welcomeStaffBody" : "welcomeBody")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={startTour} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("startBtn")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setHidden(true);
                  void markCompleted(orgId, isStaffOnly);
                }}
              >
                {t("skipForNow")}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard3D>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Ayarlar sayfası: adım adım spot ışığı gezintisi
 * ──────────────────────────────────────────────────────────── */
type Rect = { top: number; left: number; width: number; height: number };

export function OnboardingTour({
  orgId,
  steps = STEPS,
  basePath = "/dashboard/ayarlar",
  personalOnly = false,
}: {
  orgId: string;
  /** Adım listesi — varsayılan: ayarlar turu. Personel turu için STAFF_STEPS. */
  steps?: Step[];
  /** Tur bittiğinde URL'den ?tour=1 temizlenip bu yola dönülür. */
  basePath?: string;
  /** Personel turu: org bayrağına dokunma, yalnızca localStorage. */
  personalOnly?: boolean;
}) {
  const t = useTranslations("dashboard.tour");
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const step = steps[idx];
  const total = steps.length;

  const finish = useCallback(() => {
    void markCompleted(orgId, personalOnly);
    setIdx(0);
    setActive(false);
    // Sadece ?tour=1'i URL'den temizle — sayfa yeniden yüklenmesin (useSearchParams
    // kullanmıyoruz, bu yüzden Next router'ıyla senkron kalmak gerekmiyor).
    try {
      window.history.replaceState(window.history.state, "", basePath);
    } catch {
      /* yok say */
    }
  }, [orgId, personalOnly, basePath]);

  // ?tour=1 (ilk yükleme / geri-ileri) + aynı sayfadaki "tekrar başlat" olayı
  useEffect(() => {
    const sync = () => {
      if (tourParamActive()) {
        setIdx(0);
        setActive(true);
      }
    };
    sync();
    window.addEventListener(TOUR_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(TOUR_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  // Hedef elemanı bul + görünür alana kaydır + konumu ölç
  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!active) return;
    const el = step?.target
      ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    // scrollIntoView animasyonu bitene kadar birkaç kez yeniden ölç
    measure();
    const timers = [80, 200, 400, 650].map((ms) => window.setTimeout(measure, ms));
    return () => timers.forEach(clearTimeout);
  }, [active, idx, step, measure]);

  // Kaydırma / yeniden boyutlandırmada spot ışığını takip et
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const onScrollResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [active, measure]);

  // Balon konumunu hesapla
  useLayoutEffect(() => {
    if (!active) return;
    const bw = bubbleRef.current?.offsetWidth ?? 340;
    const bh = bubbleRef.current?.offsetHeight ?? 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;

    if (!rect) {
      setBubblePos({
        top: Math.max(margin, vh / 2 - bh / 2),
        left: Math.max(margin, vw / 2 - bw / 2),
      });
      return;
    }

    const spaceBelow = vh - (rect.top + rect.height);
    const placeBelow = spaceBelow > bh + margin || spaceBelow > rect.top;
    const top = placeBelow
      ? Math.min(vh - bh - margin, rect.top + rect.height + margin)
      : Math.max(margin, rect.top - bh - margin);
    let left = rect.left + rect.width / 2 - bw / 2;
    left = Math.max(margin, Math.min(vw - bw - margin, left));
    setBubblePos({ top, left });
  }, [active, rect, idx]);

  // Klavye — ok/Enter yalnızca odak bir form alanında DEĞİLKEN (kullanıcı balon
  // açıkken alanları doldurabildiği için ok tuşları imleci oynatmalı, turu değil).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finish();
        return;
      }
      const el = e.target as HTMLElement | null;
      const inField =
        !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if (inField) return;
      if (e.key === "ArrowRight") setIdx((i) => Math.min(total - 1, i + 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, total]);

  if (!active || !step) return null;

  const isLast = idx === total - 1;

  return (
    // pointer-events-none: karartma ve spot ışığı hiçbir tıklamayı yakalamaz —
    // altındaki alan (işaret edilen form dahil) tam etkileşimli kalır. Yalnızca
    // balonun kendisi tıklanabilir.
    <div className="pointer-events-none fixed inset-0 z-[120]">
      {rect ? (
        <div
          className="absolute rounded-2xl ring-2 ring-primary/70 transition-[top,left,width,height] duration-200"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(2,6,23,0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/55" />
      )}

      {/* Balon */}
      <div
        ref={bubbleRef}
        role="dialog"
        aria-label={t("ariaLabel")}
        className="pointer-events-auto absolute w-[min(340px,calc(100vw-24px))] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl transition-[top,left] duration-200"
        style={{ top: bubblePos.top, left: bubblePos.left }}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Compass className="h-3 w-3" />
            {t("stepCounter", { current: idx + 1, total })}
          </span>
          <button
            onClick={finish}
            aria-label={t("skip")}
            className="-mr-1 -mt-0.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-3 pt-2">
          <p className="font-heading text-sm font-bold text-foreground">{t(`${step.key}Title`)}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t(`${step.key}Body`)}</p>
          {isLast && (
            <button
              onClick={() => {
                finish();
                router.push("/dashboard/rehber");
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t("openGuideBtn")}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
          <button
            onClick={finish}
            className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {t("skip")}
          </button>
          <div className="flex items-center gap-1.5">
            {idx > 0 && (
              <Button size="sm" variant="ghost" className="h-8 gap-1 px-2" onClick={() => setIdx((i) => Math.max(0, i - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
                {t("back")}
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 gap-1 px-3"
              onClick={() => (isLast ? finish() : setIdx((i) => i + 1))}
            >
              {isLast ? t("finish") : t("next")}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Ayarlar üstündeki "turu tekrar başlat" düğmesi
 * ──────────────────────────────────────────────────────────── */
export function OnboardingRestartButton() {
  const t = useTranslations("dashboard.tour");
  return (
    <button
      onClick={() => {
        try {
          localStorage.removeItem(LS_KEY);
          window.history.replaceState(window.history.state, "", "/dashboard/ayarlar?tour=1");
        } catch {
          /* yok say */
        }
        window.dispatchEvent(new Event(TOUR_EVENT));
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      <Compass className="h-3.5 w-3.5" />
      {t("restartBtn")}
    </button>
  );
}
