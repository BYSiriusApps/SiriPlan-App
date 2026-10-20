import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { isWaQuotaEnforced, monthlyUtilityQuota } from "@/lib/entitlements";
import { getWaUsageSummary } from "@/lib/wa-quota";
import { isMobileApp } from "@/lib/mobile-app";

/**
 * Bekleyen İstekler / Bekleme Listesi sayfalarının üstünde: aylık WhatsApp mesaj hakkı (ve ek paket)
 * bittiyse sahip/yöneticiye uyarı. DashboardBanners'taki "waFull" şeridiyle aynı koşul ve metin
 * (mesajlar gerçekten duracağı planlarda, ek utility kredisi 0 iken); yalnızca okur, hiçbir akışı
 * değiştirmez. Hata/okunamama durumunda sessizce hiçbir şey göstermez.
 */
export async function WaQuotaNotice({ orgId, role }: { orgId: string; role: string }) {
  if (role !== "owner" && role !== "manager") return null;
  let limit: number | null = null;
  let full = false;
  try {
    const admin = await createAdminClient();
    const { data: org } = await admin.from("organizations").select("plan, trial_ends_at").eq("id", orgId).single();
    limit = monthlyUtilityQuota(org);
    if (limit !== null && isWaQuotaEnforced(org)) {
      const summary = await getWaUsageSummary(orgId, org);
      full = summary.utilityAddonBalance === 0 && summary.utilityUsed >= limit;
    }
  } catch {
    return null;
  }
  if (!full || limit === null) return null;

  const t = await getTranslations("dashboardBanners");
  const mobileApp = await isMobileApp();
  return (
    <div className="mb-4 rounded-lg bg-rose-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4 shrink-0" />
        {t("waFull", { used: limit, limit })}
      </span>
      {!mobileApp && (
        <Link href="/dashboard/abonelik#whatsapp-kredi" className="underline hover:opacity-80 transition-opacity shrink-0 font-bold">
          {t("upgrade")}
        </Link>
      )}
    </div>
  );
}
