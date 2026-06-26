import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, organizations(stripe_customer_id)")
    .eq("user_id", user.id)
    .single();

  const stripeCustomerId = (member as unknown as { organizations: { stripe_customer_id?: string } })?.organizations?.stripe_customer_id;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/dashboard/abonelik`,
  });

  return NextResponse.json({ url: session.url });
}
