import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe/config";
import { applyPlanToOrg } from "@/lib/stripe/apply-plan";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";

/**
 * Zaten ödeyen bir abone plan değiştirdiğinde (ör. yıllık Starter -> yıllık
 * Pro) kullanılır. `/api/stripe/checkout`'un aksine YENİ bir Checkout
 * Session/subscription açmaz — mevcut Stripe aboneliğinin fiyat kalemini
 * günceller. Böylece kullanıcı eski ve yeni plan için aynı anda iki kez
 * ücretlendirilmez (bkz. checkout/route.ts'teki "zaten abone" koruması).
 *
 * Hedef fiyat isteğin gönderdiği bir `annual` alanına göre DEĞİL, mevcut
 * aboneliğin faturalama periyoduna göre seçilir — yıllık ödeyen biri Pro'ya
 * geçtiğinde sessizce aylık faturalamaya düşmesin diye.
 *
 * `proration_behavior: "always_invoice"` + `payment_behavior:
 * "error_if_incomplete"`: fark tutarı hemen faturalanır ve tahsil edilir;
 * ödeme (kart reddi, 3D Secure vb.) başarısız olursa Stripe planı hiç
 * DEĞİŞTİRMEZ ve biz hata döneriz — kullanıcı ödemeden Pro'ya geçmez.
 */
export async function POST(req: NextRequest) {
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen web'den devam edin veya destek ile iletişime geçin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Yalnızca işletme sahibi plan değiştirebilir" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan as PlanKey | undefined;
  const targetPlanConfig = plan ? PLANS[plan] : undefined;
  if (!plan || !targetPlanConfig) {
    return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
  }

  type OrgJoin = { stripe_subscription_id?: string | null; subscription_status?: string; plan?: string };
  const org = (member as unknown as { organizations: OrgJoin }).organizations;

  if (!org?.stripe_subscription_id || org.subscription_status === "canceled") {
    return NextResponse.json(
      { error: "Aktif bir aboneliğiniz yok. Lütfen önce bir plan satın alın.", code: "NO_ACTIVE_SUBSCRIPTION" },
      { status: 404 }
    );
  }

  const stripe = getStripe();
  let sub;
  try {
    sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
  } catch {
    return NextResponse.json({ error: "Abonelik bilgisi alınamadı" }, { status: 502 });
  }

  const currentItem = sub.items.data[0];
  if (!currentItem) {
    return NextResponse.json({ error: "Abonelik kalemi bulunamadı" }, { status: 500 });
  }

  const interval = currentItem.price.recurring?.interval;
  const targetPriceId = interval === "year" ? targetPlanConfig.annual : targetPlanConfig.monthly;
  if (!targetPriceId) {
    return NextResponse.json({ error: "Bu plan için fiyat tanımlı değil" }, { status: 500 });
  }
  if (currentItem.price.id === targetPriceId) {
    return NextResponse.json({ error: "Zaten bu plandasınız" }, { status: 400 });
  }

  let updated;
  try {
    updated = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: targetPriceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
      // Kullanıcı planını yükseltiyorsa aboneliğe devam etmek istediği açıktır —
      // daha önce "dönem sonunda iptal" işaretlenmişse burada geri alınır.
      cancel_at_period_end: false,
      metadata: { ...sub.metadata, org_id: member.org_id, plan },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ödeme alınamadı";
    return NextResponse.json(
      {
        error: `Plan değişikliği tamamlanamadı: ${message}. Mevcut planınız aynen devam ediyor, tekrar denenebilir.`,
        code: "PAYMENT_FAILED",
      },
      { status: 402 }
    );
  }

  // Webhook (customer.subscription.updated) da aynı sonucu DB'ye yazacak;
  // burada ayrıca yazmak, kullanıcının ödeme sonrası ekranda anında güncel
  // planı görmesi için (webhook birkaç saniye gecikebilir). İkisi de aynı
  // veriyi yazdığı için çakışma riski yok.
  await applyPlanToOrg(member.org_id, plan, updated.status);

  const admin = await createAdminClient();
  await admin.from("audit_logs").insert({
    org_id: member.org_id,
    action: "subscription.plan_changed",
    table_name: "organizations",
    new_data: { from: org.plan, to: plan, interval, subscription_id: updated.id },
  });

  return NextResponse.json({ ok: true, plan });
}
