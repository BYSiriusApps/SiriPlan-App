import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const runtime = "nodejs";

async function applyPlanToOrg(orgId: string, plan: PlanKey | "trial") {
  const supabase = await createAdminClient();
  if (plan === "trial") {
    await supabase.from("organizations").update({ plan: "trial", subscription_status: "active" }).eq("id", orgId);
    return;
  }
  const planConfig = PLANS[plan];
  await supabase.from("organizations").update({
    plan,
    subscription_status: "active",
    max_staff: planConfig.max_staff,
    max_appointments_monthly: planConfig.max_appointments_monthly,
    ...planConfig.features,
  }).eq("id", orgId);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // metadata is stored on the subscription; read from client_reference_id or metadata
      const meta = (session as unknown as { subscription_data?: { metadata?: Record<string, string> } }).subscription_data?.metadata;
      const orgId = meta?.org_id || (session.metadata?.org_id);
      const plan = (meta?.plan || session.metadata?.plan) as PlanKey | undefined;
      if (orgId && plan) {
        await applyPlanToOrg(orgId, plan);
        await supabase.from("organizations").update({
          stripe_subscription_id: session.subscription as string,
        }).eq("id", orgId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      if (org) {
        const plan = sub.metadata?.plan as PlanKey;
        if (plan) await applyPlanToOrg(org.id, plan);
        await supabase.from("organizations").update({
          subscription_status: sub.status,
        }).eq("id", org.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();
      if (org) {
        await supabase.from("organizations").update({
          plan: "trial",
          subscription_status: "canceled",
          feature_ai: false,
          feature_campaigns: false,
          feature_gamification: false,
          feature_api: false,
          feature_whitelabel: false,
        }).eq("id", org.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", invoice.customer as string)
        .single();
      if (org) {
        await supabase.from("organizations").update({
          subscription_status: "past_due",
        }).eq("id", org.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
