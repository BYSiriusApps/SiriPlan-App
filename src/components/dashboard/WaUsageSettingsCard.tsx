"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, MessageCircle } from "lucide-react";

type Summary = {
  utilityQuota: number | null;
  utilityUsed: number;
  utilityAddonBalance: number;
  marketingBalance: number;
  showCampaign: boolean;
};

/**
 * Ayarlar sayfasında kompakt WhatsApp mesaj kullanım özeti + abonelik sayfasındaki
 * ek paket satın alma girişine bağlantı. Veri /api/wa-usage'tan (yalnızca sahip/yönetici)
 * gelir; yetki yoksa ya da hata olursa hiçbir şey render edilmez.
 */
export function WaUsageSettingsCard() {
  const t = useTranslations("dashboard.waUsage");
  const locale = useLocale();
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/wa-usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setS(d as Summary); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!s) return null;
  const nf = new Intl.NumberFormat(locale);
  return (
    <Link
      href="/dashboard/abonelik#whatsapp-kredi"
      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
        <MessageCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t("title")}</p>
        <p className="text-xs text-muted-foreground">
          {t("utilityLabel")}: {nf.format(s.utilityUsed)}
          {s.utilityQuota !== null ? ` / ${nf.format(s.utilityQuota)}` : ""} · {t("addonBalance")}: {nf.format(s.utilityAddonBalance)}
          {s.showCampaign ? ` · ${t("campaignBalance")}: ${nf.format(s.marketingBalance)}` : ""}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
