import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { getDashboardBadgeCounts } from "@/lib/dashboard-badges";

/**
 * `dashboard/layout.tsx` artık bu sayıları senkron beklemiyor (bkz.
 * DashboardBadgeContext.tsx) — panel her sayfa geçişinde bu uca kendi
 * yükünü bloklamadan istek atar, rozetler bir an sonra dolar. Hesap mantığı
 * `lib/dashboard-badges.ts`'te (20 sn önbellekli) — burada değişmedi.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const counts = await getDashboardBadgeCounts(member.org_id);
  return NextResponse.json(counts);
}
