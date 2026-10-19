import { NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements, type EntitlementOrg } from "@/lib/entitlements";
import { getWaUsageSummary } from "@/lib/wa-quota";

export const dynamic = "force-dynamic";

/**
 * Aktif işletmenin bu ayki WhatsApp mesaj kullanım özeti (yalnızca OKUMA). Org, oturumdaki
 * aktif üyelikten gelir — istemciden org_id ALINMAZ; böylece başka bir işletmenin bakiyesi
 * sorgulanamaz. Yalnızca sahip/yönetici (fatura/ödeme bilgisiyle aynı kural).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
  if (member.role !== "owner" && member.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = (member as unknown as { organizations: EntitlementOrg }).organizations;
  const summary = await getWaUsageSummary(member.org_id, org);
  return NextResponse.json({ ...summary, showCampaign: getEntitlements(org).feature_campaigns });
}
