import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuySmsPackButton } from "@/components/dashboard/BuySmsPackButton";
import { getEntitlements, isWaQuotaEnforced, type EntitlementOrg } from "@/lib/entitlements";
import { getWaUsageSummary } from "@/lib/wa-quota";
import { WA_CREDIT_PACKS } from "@/lib/wa-credit-packs";
import { formatPrice, getPricingCurrencyFromHeaders } from "@/lib/pricing";

/**
 * WhatsApp mesaj kullanım özeti (sunucu bileşeni): plana dahil aylık randevu-mesajı hakkı,
 * ek paket bakiyesi, kampanya kredisi ve dönem bitişi.
 *
 *  - variant="full"   : Abonelik sayfası — özet + (web'de, sahip/yönetici için) satın alma.
 *  - variant="summary": Hesabım / Ayarlar — yalnızca özet + abonelik sayfasına bağlantı.
 *
 * Satın alma yüzeyi native uygulamada ASLA render edilmez (mağaza kuralları); orada yalnızca
 * bilgi gösterilir. Veri sunucuda admin client ile okunur (tablolar RLS'li, istemciye açık değil).
 */
export async function WaUsageCard({
  orgId,
  org,
  variant,
  mobileApp,
  canBuy = false,
  returnStatus,
}: {
  orgId: string;
  org: EntitlementOrg;
  variant: "full" | "summary";
  mobileApp: boolean;
  /** Yalnızca sahip/yönetici ve şube olmayan işletme. */
  canBuy?: boolean;
  returnStatus?: string;
}) {
  const t = await getTranslations("dashboard.waUsage");
  const locale = await getLocale();
  const summary = await getWaUsageSummary(orgId, org);
  const showCampaign = getEntitlements(org).feature_campaigns;
  const enforced = isWaQuotaEnforced(org);
  const nf = new Intl.NumberFormat(locale);
  const periodEnd = new Date(summary.periodEnd).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  const quota = summary.utilityQuota;
  const used = quota === null ? summary.utilityUsed : Math.min(summary.utilityUsed, quota);
  const pct = quota && quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  let buy: React.ReactNode = null;
  if (variant === "full" && canBuy && !mobileApp) {
    const currency = getPricingCurrencyFromHeaders(await headers());
    const packs = WA_CREDIT_PACKS.filter((p) => p.kind === "utility" || showCampaign).map((p) => ({
      id: p.id,
      label: t(p.kind === "utility" ? "buyUtility" : "buyCampaign", { count: nf.format(p.credits) }),
      priceLabel: formatPrice(p.prices[currency], currency),
    }));
    buy = (
      <div className="space-y-2">
        <BuySmsPackButton
          packs={packs}
          endpoint="/api/stripe/wa-pack"
          idPrefix="pc-wa"
          errorText={t("buyError")}
          successText={t("buySuccess")}
          canceledText={t("buyCanceled")}
          returnStatus={returnStatus}
        />
        <p className="text-xs text-muted-foreground">{t("buyHint")}</p>
      </div>
    );
  }

  return (
    <Card id="whatsapp-kredi" className="kpi-tile border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t("utilityLabel")}</span>
            <span className="text-sm font-bold tabular-nums">
              {nf.format(used)}
              {quota !== null ? ` / ${nf.format(quota)}` : ""}
            </span>
          </div>
          {quota !== null && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
              <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1.5">{t("renews", { date: periodEnd })}</p>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{t("addonBalance")}</span>
          <span className="text-sm font-bold tabular-nums">{nf.format(summary.utilityAddonBalance)}</span>
        </div>

        {showCampaign && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> {t("campaignBalance")}
            </span>
            <span className="text-sm font-bold tabular-nums">{nf.format(summary.marketingBalance)}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{enforced ? t("noteEnforced") : t("noteMetered")}</p>
        {showCampaign && <p className="text-xs text-muted-foreground">{t("campaignNote")}</p>}

        {buy}

        {variant === "summary" && (
          <Link href="/dashboard/abonelik#whatsapp-kredi" className="inline-block text-sm font-semibold text-primary hover:underline">
            {t("manageLink")}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
