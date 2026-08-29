"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLongPress } from "./useLongPress";

const NEW_APPT_PATH = "/dashboard/randevular/yeni";
const HOLD_MS = 450;

/**
 * Mobil için sabit "Randevu" düğmesi.
 *
 * - Tek dokunuş → randevu formunu açar (elle ya da formdaki "Konuşarak Doldur"
 *   düğmesiyle doldurulur).
 * - Basılı tutma → formu `?voice=true` ile açar; form açılır açılmaz dinlemeye
 *   başlar.
 *
 * Eskiden ayrı bir mikrofon ve ayrı bir "+Randevu" bağlantısı vardı; ikisi de
 * aynı sayfayı açtığı için tek düğmede birleştirildi.
 */
export function NewAppointmentFab() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tm = useTranslations("dashboard.mic");

  const { holding, handlers } = useLongPress({
    ms: HOLD_MS,
    onTap: () => router.push(NEW_APPT_PATH),
    onLongPress: () => router.push(`${NEW_APPT_PATH}?voice=true`),
  });

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 lg:bottom-8 lg:right-8 z-40 flex flex-col items-end gap-1.5">
      <span
        className={cn(
          "pointer-events-none select-none rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border transition-opacity",
          holding ? "opacity-0" : "opacity-100"
        )}
      >
        {tm("holdForVoice")}
      </span>

      <button
        type="button"
        aria-label={t("homePage.newApptButton")}
        title={tm("holdForVoice")}
        {...handlers}
        className={cn(
          "relative flex touch-none items-center gap-2 overflow-hidden rounded-full px-5 py-3.5 font-bold text-sm shadow-2xl transition-transform",
          "bg-primary text-primary-foreground neon-primary",
          holding ? "scale-95" : "hover:scale-105"
        )}
      >
        {/* Basılı tutma ilerlemesi — eşik süresi boyunca sağdan sola dolar */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 origin-left bg-red-600/90 transition-transform ease-linear",
            holding ? "scale-x-100" : "scale-x-0"
          )}
          style={{ transitionDuration: holding ? `${HOLD_MS}ms` : "150ms" }}
        />
        <span className="relative flex items-center gap-2">
          {holding ? <Mic className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />}
          {t("homePage.newApptButton")}
        </span>
      </button>
    </div>
  );
}
