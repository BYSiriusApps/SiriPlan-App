import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCampaignNow } from "@/lib/campaign-send";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

/**
 * Zamanlanmış kampanyaları tetikler. Vercel'in (Hobby plan) cron'ları günde
 * bir kez çalıştırdığı için burada kullanılmıyor — bunun yerine Supabase
 * pg_cron her 5 dakikada bir bu endpoint'i çağırıyor (bkz.
 * supabase/migrations/20260814_campaign_scheduler.sql), tıpkı WhatsApp
 * hatırlatmalarındaki net.http_post deseni gibi.
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const { data: due } = await supabase
    .from("campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  let sent = 0;
  let failed = 0;

  for (const c of due ?? []) {
    const result = await sendCampaignNow(supabase, c.id);
    if (result.ok && result.sent_count > 0) sent++;
    else failed++;
  }

  return NextResponse.json({ processed: (due ?? []).length, sent, failed });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
