import { getTranslations } from "next-intl/server";
import { PanelTour, type PanelTourLabels } from "@/components/marketing/PanelTour";

/** PanelTour'u `panelTour` çevirileriyle besleyen sunucu sarmalayıcı. */
export async function PanelTourSection({ dark = false }: { dark?: boolean }) {
  const t = await getTranslations("panelTour");
  const steps = ["calendar", "approve", "whatsapp", "income"] as const;
  const mockKeys = ["today", "pending", "confirmed", "approve", "reject", "haircut", "manicure", "skincare", "revenue", "appointments", "completed", "waName", "waMsg"] as const;
  const labels: PanelTourLabels = {
    title: t("title"),
    subtitle: t("subtitle"),
    tabs: Object.fromEntries(steps.map((s) => [s, t(`tabs.${s}`)])) as PanelTourLabels["tabs"],
    desc: Object.fromEntries(steps.map((s) => [s, t(`desc.${s}`)])) as PanelTourLabels["desc"],
    mock: Object.fromEntries(mockKeys.map((k) => [k, t(`mock.${k}`)])) as PanelTourLabels["mock"],
  };
  return <PanelTour labels={labels} dark={dark} />;
}
