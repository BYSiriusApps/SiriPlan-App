"use client";

import Link from "next/link";
import { Plus, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePlan } from "./PlanContext";

const NEW_APPT_PATH = "/dashboard/randevular/yeni";

/**
 * Ana sayfa üst başlığındaki "+ Yeni Randevu Oluştur" + mikrofon düğmeleri.
 *
 * Aynı hedefe gider NewAppointmentFab (sağ-alt sabit düğme, tek dokunuş=form,
 * basılı tutma=sesli) ile: "+" düğmesi NEW_APPT_PATH'i açar, mikrofon düğmesi
 * Pro planlarda `?voice=true` ile sesli dinlemeyi başlatır. FAB'ın kendisi
 * DEĞİŞMEDİ — bu yalnızca üst başlıkta ek, görünür bir giriş noktası.
 */
export function HomeHeaderActions() {
  const t = useTranslations("dashboard");
  const tm = useTranslations("dashboard.mic");
  const { proTools } = usePlan();

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href={NEW_APPT_PATH}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-lg neon-primary hover:opacity-90 active:scale-95 transition-all"
      >
        <Plus className="h-4 w-4" />
        {t("homePage.newApptButtonLong")}
      </Link>
      <Link
        href={proTools ? `${NEW_APPT_PATH}?voice=true` : NEW_APPT_PATH}
        aria-label={t("homePage.micButtonAria")}
        title={proTools ? tm("holdForVoice") : t("homePage.micButtonAria")}
        className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-card border shadow-md hover:bg-accent active:scale-95 transition-all shrink-0"
      >
        <Mic className="h-4.5 w-4.5 text-primary" />
      </Link>
    </div>
  );
}
