import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";

const PLAN_RANK: Record<string, number> = { mini: 1, starter: 2, pro: 3, business: 4 };

/**
 * Plan değişikliğinden ÖNCE kullanıcıya "şu an şu kadar ödeyeceksiniz"
 * göstermek için tutar önizlemesi. Hiçbir şey tahsil etmez/değiştirmez
 * (Stripe `invoices.createPreview` salt okunur). Parametreler
 * `change-plan/route.ts` ile birebir aynı tutulmalıdır (always_invoice;
 * yükseltmede billing_cycle_anchor: now) ki gösterilen tutar gerçek tutarla
 * eşleşsin.
 */
export async function GET(req: NextRequest) {
  if (await isMobileApp()) {
    return NextResponse.json({ error: "Bu işlem mobil uygulama içinden yapılamaz." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Yalnızca işletme sahibi plan değiştirebilir" }, { status: 403 });
  }

  const plan = req.nextUrl.searchParams.get("plan") as PlanKey | null;
  const targetPlanConfig = plan ? PLANS[plan] : undefined;
  if (!plan || !targetPlanConfig) {
    return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
  }

  type OrgJoin = { stripe_subscription_id?: string | null; subscription_status?: string; plan?: string };
  const org = (member as unknown as { organizations: OrgJoin }).organizations;
  if (!org?.stripe_subscription_id || org.subscription_status === "canceled") {
    return NextResponse.json({ error: "Aktif bir aboneliğiniz yok." }, { status: 404 });
  }

  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const currentItem = sub.items.data[0];
    if (!currentItem) return NextResponse.json({ error: "Abonelik kalemi bulunamadı" }, { status: 500 });

    const interval = currentItem.price.recurring?.interval;
    const targetPriceId = interval === "year" ? targetPlanConfig.annual : targetPlanConfig.monthly;
    if (!targetPriceId) return NextResponse.json({ error: "Bu plan için fiyat tanımlı değil" }, { status: 500 });
    if (currentItem.price.id === targetPriceId) {
      return NextResponse.json({ error: "Zaten bu plandasınız" }, { status: 400 });
    }

    const isUpgrade = (PLAN_RANK[plan] ?? 0) > (PLAN_RANK[org.plan ?? ""] ?? 0);
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: sub.id,
      subscription_details: {
        items: [{ id: currentItem.id, price: targetPriceId }],
        proration_behavior: "always_invoice",
        // Stripe denemesindeki (trialing) abonelikte anchor "now" HATA verir
        // (trial_end anchor'dan sonra olamaz); deneme sürerken plan değişir, ücret deneme sonunda.
        ...(isUpgrade && sub.status !== "trialing" ? { billing_cycle_anchor: "now" as const } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      isUpgrade,
      interval: interval ?? "month",
      currency: preview.currency,
      // kuruş cinsinden; negatifse hesaba kredi olarak yazılır, şimdi tahsilat yok
      amountDue: preview.amount_due,
      total: preview.total,
    });
  } catch {
    return NextResponse.json({ error: "Tutar hesaplanamadı" }, { status: 502 });
  }
}
