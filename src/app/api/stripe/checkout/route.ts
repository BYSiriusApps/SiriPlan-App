import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, annual } = await req.json() as { plan: PlanKey; annual: boolean };
  const planConfig = PLANS[plan];
  if (!planConfig) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const member = await getActiveMember(supabase);

  if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

  type OrgJoin = { stripe_customer_id?: string; name: string; email?: string };
  const org = (member as unknown as { org_id: string; organizations: OrgJoin }).organizations;

  const stripe = getStripe();
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org.name,
      metadata: { org_id: member.org_id, user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", member.org_id);
  }

  const priceId = annual ? planConfig.annual : planConfig.monthly;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?subscription=success&plan=${plan}`,
    cancel_url: `${appUrl}/auth/plan-sec?canceled=1`,
    subscription_data: {
      trial_period_days: 7,
      metadata: { org_id: member.org_id, plan },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
