import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export const runtime = "nodejs";

function verifyCronSecret(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const lastMonth = subMonths(new Date(), 1);
  const monthStart = startOfMonth(lastMonth).toISOString();
  const monthEnd = endOfMonth(lastMonth).toISOString();
  const badgeMonth = format(startOfMonth(lastMonth), "yyyy-MM-dd");

  // Gamification'a sahip aktif işletmeler + aktif deneme (Pro'ya denk) işletmeler.
  const nowIso = new Date().toISOString();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("subscription_status", "active")
    .or(`feature_gamification.eq.true,and(plan.eq.trial,trial_ends_at.gt.${nowIso})`);

  if (!orgs || orgs.length === 0) return NextResponse.json({ processed: 0 });

  let processed = 0;

  for (const org of orgs) {
    const { data: staffList } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("org_id", org.id)
      .eq("is_active", true);

    if (!staffList || staffList.length < 2) continue;

    type StaffStat = {
      staff_id: string;
      full_name: string;
      revenue: number;
      avg_duration: number;
      repeat_customers: number;
      appointments: number;
    };

    const stats: StaffStat[] = [];

    for (const s of staffList) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("price, duration_minutes, customer_id, status")
        .eq("org_id", org.id)
        .eq("staff_id", s.id)
        .gte("appointment_at", monthStart)
        .lte("appointment_at", monthEnd)
        .eq("status", "tamamlandi");

      const completed = appts || [];
      const revenue = completed.reduce((sum, a) => sum + Number(a.price), 0);
      const avgDuration = completed.length > 0
        ? completed.reduce((s, a) => s + a.duration_minutes, 0) / completed.length
        : 999;

      const customerIds = [...new Set(completed.map((a) => a.customer_id).filter(Boolean))];
      let repeats = 0;
      for (const cid of customerIds) {
        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", cid)
          .eq("org_id", org.id)
          .eq("status", "tamamlandi")
          .lt("appointment_at", monthStart);
        if ((count || 0) > 0) repeats++;
      }

      stats.push({
        staff_id: s.id,
        full_name: s.full_name,
        revenue,
        avg_duration: avgDuration,
        repeat_customers: repeats,
        appointments: completed.length,
      });
    }

    if (stats.length === 0) continue;

    // Badge determination
    const badges: Array<{ org_id: string; staff_id: string; badge_type: string; badge_month: string }> = [];

    const superstar = [...stats].sort((a, b) => b.revenue - a.revenue)[0];
    if (superstar.revenue > 0) {
      badges.push({ org_id: org.id, staff_id: superstar.staff_id, badge_type: "superstar", badge_month: badgeMonth });
    }

    const speedmaster = [...stats].filter((s) => s.appointments > 0).sort((a, b) => a.avg_duration - b.avg_duration)[0];
    if (speedmaster) {
      badges.push({ org_id: org.id, staff_id: speedmaster.staff_id, badge_type: "speedmaster", badge_month: badgeMonth });
    }

    const customerFav = [...stats].sort((a, b) => b.repeat_customers - a.repeat_customers)[0];
    if (customerFav.repeat_customers > 0) {
      badges.push({ org_id: org.id, staff_id: customerFav.staff_id, badge_type: "customer_fav", badge_month: badgeMonth });
    }

    if (badges.length > 0) {
      await supabase
        .from("staff_badges")
        .upsert(badges, { onConflict: "org_id,staff_id,badge_type,badge_month" });
    }

    processed++;
  }

  return NextResponse.json({ processed, badge_month: badgeMonth });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
