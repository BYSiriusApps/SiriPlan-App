import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

function verifyCronSecret(req: NextRequest) {
  return isCronAuthorized(req.headers.get("authorization"));
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  // Calculate last week's range
  const lastWeek = subWeeks(new Date(), 1);
  const weekStart = format(startOfWeek(lastWeek, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 }).toISOString();
  const weekStartISO = startOfWeek(lastWeek, { weekStartsOn: 1 }).toISOString();

  // Gamification'a sahip aktif işletmeler + aktif deneme (Pro'ya denk) işletmeler.
  const nowIso = new Date().toISOString();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("subscription_status", "active")
    .or(`feature_gamification.eq.true,and(plan.eq.trial,trial_ends_at.gt.${nowIso})`);

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const org of orgs) {
    // Get all staff for this org
    const { data: staffList } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("org_id", org.id)
      .eq("is_active", true);

    if (!staffList || staffList.length === 0) continue;

    const performances: Array<{
      org_id: string; staff_id: string; week_start: string;
      appointments_done: number; total_revenue: number;
      no_show_count: number; repeat_customers: number; score: number;
    }> = [];

    for (const s of staffList) {
      // Count completed appointments last week
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, price, customer_id, status")
        .eq("org_id", org.id)
        .eq("staff_id", s.id)
        .gte("appointment_at", weekStartISO)
        .lte("appointment_at", weekEnd)
        .neq("status", "iptal");

      const completed = (appts || []).filter((a) => a.status === "tamamlandi");
      const noshows = (appts || []).filter((a) => a.status === "gelmedi").length;
      const totalRevenue = completed.reduce((sum, a) => sum + Number(a.price), 0);

      // Count repeat customers (visited more than once total before)
      const customerIds = [...new Set(completed.map((a) => a.customer_id).filter(Boolean))];
      let repeatCount = 0;
      for (const cid of customerIds) {
        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", cid)
          .eq("org_id", org.id)
          .eq("status", "tamamlandi");
        if ((count || 0) > 1) repeatCount++;
      }

      // Score formula: appointments×2 + revenue/10 + no_show penalty + repeat×3
      const score = completed.length * 2 + totalRevenue / 10 - noshows * 2 + repeatCount * 3;

      performances.push({
        org_id: org.id,
        staff_id: s.id,
        week_start: weekStart,
        appointments_done: completed.length,
        total_revenue: totalRevenue,
        no_show_count: noshows,
        repeat_customers: repeatCount,
        score,
      });
    }

    if (performances.length === 0) continue;

    // Rank by score
    performances.sort((a, b) => b.score - a.score);
    const ranked = performances.map((p, idx) => ({
      ...p,
      rank: idx + 1,
      is_top: idx === 0 && p.score > 0,
    }));

    // Upsert performance records
    await supabase
      .from("staff_performance_weekly")
      .upsert(ranked, { onConflict: "org_id,staff_id,week_start" });

    processed++;
  }

  return NextResponse.json({ processed, week_start: weekStart });
}

// Also allow GET for Vercel cron
export async function GET(req: NextRequest) {
  return POST(req);
}
