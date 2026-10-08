import { NextRequest, NextResponse } from "next/server";
import { getStripe, type PlanKey } from "@/lib/stripe/config";
import { applyPlanToOrg, planFromPriceId } from "@/lib/stripe/apply-plan";

export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const runtime = "nodejs";

async function writeAuditLog(orgId: string, action: string, meta: Record<string, unknown>) {
  try {
    const supabase = await createAdminClient();
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      action,
      table_name: "organizations",
      new_data: meta,
    });
  } catch {
    // audit log failure must not block the main flow
    console.error("[audit] Failed to write audit log:", action, orgId);
  }
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
      // Checkout'u BİZ oluştururken `subscription_data.metadata` bir istek
      // parametresidir — webhook'a gelen Session nesnesinde bu alan hiç
      // bulunmaz (yalnızca oluşturulan Subscription'ın kendi metadata'sında
      // yaşar). Bu yüzden org, session.customer üzerinden bulunur — /api/
      // stripe/checkout zaten Session oluşturulmadan ÖNCE stripe_customer_id'yi
      // org'a yazmıştı, o eşleşme burada kullanılıyor (customer.subscription.*
      // handler'larındaki desenle aynı).
      // Tek seferlik SMS kontör paketi (payment modu; abonelik değil). Kontör
      // YALNIZCA ödeme alındıysa yüklenir; org'un customer'ı oturumdakiyle
      // eşleşmiyorsa yüklenmez. Aynı oturum tekrar gelirse add_sms_credits
      // idempotent olduğu için ikinci kez yüklenmez.
      if (session.mode === "payment" && session.metadata?.kind === "sms_pack") {
        const packOrgId = session.metadata.org_id;
        const credits = Number(session.metadata.credits);
        if (session.payment_status === "paid" && packOrgId && Number.isInteger(credits) && credits > 0) {
          const { data: packOrg } = await supabase
            .from("organizations")
            .select("id, stripe_customer_id")
            .eq("id", packOrgId)
            .single();
          if (packOrg && packOrg.stripe_customer_id && packOrg.stripe_customer_id === session.customer) {
            const { error } = await supabase.rpc("add_sms_credits", {
              p_org: packOrg.id,
              p_credits: credits,
              p_session: session.id,
              p_amount: session.amount_total,
              p_currency: session.currency,
            });
            if (error) {
              console.error("[stripe-webhook] SMS kontörü yüklenemedi:", error.message);
              // 500 → Stripe olayı yeniden dener; ödeme alınmış kontör kaybolmasın.
              return NextResponse.json({ error: "sms_credit_failed" }, { status: 500 });
            }
            await writeAuditLog(packOrg.id, "sms_pack.purchased", { credits, session: session.id, event: event.id });
          }
        }
        break;
      }
      const customerId = session.customer as string | null;
      const subscriptionId = session.subscription as string | null;
      if (customerId && subscriptionId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (org) {
          await supabase.from("organizations").update({
            stripe_subscription_id: subscriptionId,
          }).eq("id", org.id);
          await writeAuditLog(org.id, "subscription.activated", { event: event.id });
        }
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
        // metadata.plan öncelikli (biz kendi endpoint'lerimizde her zaman
        // yazıyoruz); bulunamazsa fiyat ID'sinden tespit edilir — Stripe
        // Müşteri Portalı'ndan yapılan bir plan değişikliği bizim custom
        // metadata alanımızı yazmaz, bu yedek olmadan DB Stripe'tan sessizce
        // sapardı.
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = (sub.metadata?.plan as PlanKey | undefined) || planFromPriceId(priceId);
        if (plan) {
          await applyPlanToOrg(org.id, plan, sub.status);
        } else {
          await supabase.from("organizations").update({
            subscription_status: sub.status,
          }).eq("id", org.id);
        }
        await writeAuditLog(org.id, "subscription.updated", { plan, status: sub.status, event: event.id });
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
          feature_website: false,
        }).eq("id", org.id);
        await writeAuditLog(org.id, "subscription.canceled", { event: event.id });
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
        await writeAuditLog(org.id, "payment.failed", { invoice: invoice.id, event: event.id });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
