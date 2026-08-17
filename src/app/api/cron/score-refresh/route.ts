import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { subDays } from "date-fns";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();

  // Get all customers that need score refresh (updated >7 days ago)
  const { data: customers } = await supabase
    .from("customers")
    .select("id, org_id, visit_count, total_spend, loyalty_punches, referral_count, last_visit_at")
    .limit(2000);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    const updates = batch.map((c) => {
      // Score algorithm (0-100)
      const last30Days = c.last_visit_at ? (now.getTime() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24) : 999;
      const visitScore = Math.min(40, c.visit_count * 4); // max 40 pts, 10+ visits
      const recencyScore = last30Days <= 30 ? 20 : last30Days <= 60 ? 10 : last30Days <= 90 ? 5 : 0; // max 20 pts
      const spendTier = Number(c.total_spend) >= 5000 ? 20 : Number(c.total_spend) >= 2000 ? 15 : Number(c.total_spend) >= 500 ? 10 : 5;
      const loyaltyScore = Math.min(10, c.loyalty_punches); // max 10 pts
      const referralScore = Math.min(10, c.referral_count * 5); // max 10 pts
      const noShowPenalty = last30Days > 180 ? -20 : 0;

      const score = Math.max(0, Math.min(100,
        visitScore + recencyScore + spendTier + loyaltyScore + referralScore + noShowPenalty
      ));

      const breakdown = {
        visit: visitScore,
        recency: recencyScore,
        spend: spendTier,
        loyalty: loyaltyScore,
        referral: referralScore,
        penalty: noShowPenalty,
      };

      return { id: c.id, score, score_breakdown: breakdown };
    });

    for (const u of updates) {
      await supabase
        .from("customers")
        .update({ score: u.score, score_breakdown: u.score_breakdown })
        .eq("id", u.id);
    }

    updated += batch.length;
  }

  return NextResponse.json({ updated });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
