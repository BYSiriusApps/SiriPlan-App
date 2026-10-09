import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Bot, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADDONS, getOrgAddons } from "@/lib/stripe/addons";
import { getBranchInfo } from "@/lib/branches";
import { ADDON_PRICING_BY_CURRENCY, formatPrice, getPricingCurrencyFromHeaders } from "@/lib/pricing";
import { AddBranchForm, BuyAddonButtons } from "@/components/dashboard/AddonsPanelClient";

const AI_ELIGIBLE = ["starter", "pro"];
const BRANCH_ELIGIBLE = ["starter", "pro", "business"];

/**
 * /dashboard/abonelik "Ek Paketler" bölümü (AI Asistan + Ek Şube).
 *
 * MAĞAZA KURALI: native uygulamada (mobileApp) hiçbir SATIN ALMA yüzeyi, fiyat
 * veya şube oluşturma formu render edilmez; yalnızca zaten aktif olan paketlerin
 * durumu gösterilir (SMS kontör bakiyesiyle aynı yaklaşım). Uç noktalar ayrıca
 * mobil uygulamayı sunucuda reddeder.
 */
export async function AddonsPanel({
  orgId,
  role,
  plan,
  subscriptionStatus,
  hasSubscription,
  mobileApp,
  returnStatus,
}: {
  orgId: string;
  role: string;
  plan: string;
  subscriptionStatus: string;
  hasSubscription: boolean;
  mobileApp: boolean;
  returnStatus?: string;
}) {
  const t = await getTranslations("dashboard.subscriptionPage");
  const [addons, info] = await Promise.all([getOrgAddons(orgId), getBranchInfo(orgId)]);

  // Şube: ana işletmenin aboneliğine bağlı, kendi ek paketi yok.
  if (info.parent) {
    return (
      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {t("branchLinkedTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("branchLinkedDesc", { parent: info.parent.name })}</p>
        </CardContent>
      </Card>
    );
  }

  const paid = (subscriptionStatus === "active" || subscriptionStatus === "trialing") && hasSubscription;
  const canBuy = !mobileApp && paid && (role === "owner" || role === "manager");
  const aiOffer = canBuy && AI_ELIGIBLE.includes(plan) && !addons.ai_subscription_id;
  const branchOffer = canBuy && BRANCH_ELIGIBLE.includes(plan) && addons.extra_branch_slots === 0;
  const branchActive = addons.extra_branch_slots > 0 || info.branches.length > 0;

  if (!aiOffer && !branchOffer && !addons.ai_assistant && !branchActive) return null;

  const currency = getPricingCurrencyFromHeaders(await headers());
  const prices = ADDON_PRICING_BY_CURRENCY[currency];
  const buyLabels = (key: "ai_assistant" | "extra_branch") => ({
    monthlyLabel: t("addonBuyMonthly", { price: formatPrice(prices[key].monthly, currency) }),
    // Yıllık Price tanımlı değilse yıllık buton gösterilmez (şu an yalnızca aylık satılır).
    annualLabel: ADDONS[key].annual ? t("addonBuyAnnual", { price: formatPrice(prices[key].monthly * 12, currency) }) : undefined,
    errorText: t("addonError"),
    successText: t("addonSuccess"),
    canceledText: t("addonCanceled"),
  });
  // Dönüş toast'u yalnızca ilk render edilen satın alma bileşeninde.
  const returnForAi = aiOffer ? returnStatus : undefined;
  const returnForBranch = !aiOffer && branchOffer ? returnStatus : undefined;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">{t("addonsTitle")}</h2>

      {(aiOffer || addons.ai_assistant) && (
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              {t("addonAiTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addons.ai_assistant ? (
              <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("addonAiActive")}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("addonAiDesc")}</p>
                <BuyAddonButtons addon="ai_assistant" returnStatus={returnForAi} {...buyLabels("ai_assistant")} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(branchOffer || branchActive) && (
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {t("addonBranchTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {branchActive ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">{t("addonBranchSlotsLabel")}</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {info.branches.length} / {addons.extra_branch_slots}
                  </span>
                </div>
                {info.branches.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {info.branches.map((b) => (
                      <li key={b.id} className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {b.name}
                      </li>
                    ))}
                  </ul>
                )}
                {!mobileApp && role === "owner" && info.branches.length < addons.extra_branch_slots && (
                  <AddBranchForm
                    label={t("addonBranchNameLabel")}
                    placeholder={t("addonBranchNamePlaceholder")}
                    submitLabel={t("addonBranchCreate")}
                    errorText={t("addonBranchError")}
                    successText={t("addonBranchCreated")}
                  />
                )}
                {!mobileApp && info.branches.length >= addons.extra_branch_slots && (
                  <p className="text-xs text-muted-foreground">{t("addonBranchMoreHint")}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("addonBranchDesc")}</p>
                <BuyAddonButtons
                  addon="extra_branch"
                  withQuantity
                  quantityLabel={t("addonBranchQuantity")}
                  returnStatus={returnForBranch}
                  {...buyLabels("extra_branch")}
                />
                <p className="text-xs text-muted-foreground">{t("addonBranchPerBranchNote")}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
