import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getActiveMember } from "@/lib/active-org";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";
import { getPricingCurrencyFromHeaders } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Mağaza kurallarına uyum: native uygulama (App Store/Play Store) içinden
  // ödeme oturumu asla oluşturulmamalı — /auth/plan-sec ve /dashboard/abonelik
  // zaten bu durumda buton göstermiyor, burada sunucu tarafında da kapatıyoruz
  // (UI atlansa/bypass edilse dahi satın alma akışı native taraftan hiç açılmasın).
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen web'den devam edin veya destek ile iletişime geçin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, annual } = await req.json() as { plan: PlanKey; annual: boolean };
  const planConfig = PLANS[plan];
  if (!planConfig) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const member = await getActiveMember(supabase);

  if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

  type OrgJoin = { stripe_customer_id?: string; name: string; email?: string; trial_ends_at?: string | null };
  const org = (member as unknown as { org_id: string; organizations: OrgJoin }).organizations;

  // Deneme süresi yalnızca bir defa verilir: org kayıt sırasında zaten kendi
  // ücretsiz denemesini almıştır (trial_ends_at dolu). Stripe'ta ikinci bir
  // deneme süresi tanımlamıyoruz — kart girildiğinde ücretlendirme hemen başlar.
  const hasAlreadyHadTrial = !!org.trial_ends_at;

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

  // Ziyaretçinin fiyat sayfasında GÖRDÜĞÜ para birimi (pricing_currency
  // çerezi → IP ülkesi; bkz. lib/pricing.ts). Ödeme ekranında başka bir para
  // birimiyle karşılaşmaması için aynı kaynaktan okunuyor.
  const visitorCurrency = getPricingCurrencyFromHeaders(req.headers).toLowerCase();

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?subscription=success&plan=${plan}`,
    cancel_url: `${appUrl}/auth/plan-sec?canceled=1`,
    subscription_data: {
      ...(hasAlreadyHadTrial ? {} : { trial_period_days: 14 }),
      metadata: { org_id: member.org_id, plan },
    },
    allow_promotion_codes: true,
  };

  // Stripe, çok para birimli fiyatlarda `currency` GEÇİLMEDİKÇE Price'ın
  // varsayılan para birimiyle tahsil eder — Stripe panelinde currency_options
  // tanımlamak tek başına yetmez, istekte de belirtilmesi gerekir.
  //
  // Ancak ilgili Price'ta o para birimi tanımlı değilse Stripe isteği
  // reddeder. Bu yüzden önce para birimiyle denenir, reddedilirse parametresiz
  // tekrar denenir: currency_options henüz kurulmamışken ödeme akışının
  // TAMAMEN kırılması, para birimi uyuşmazlığından çok daha kötü olurdu.
  // currency_options kurulduğu anda ilk deneme tutmaya başlar, kod
  // değişikliği gerekmez.
  let session;
  try {
    session = await stripe.checkout.sessions.create({ ...params, currency: visitorCurrency });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Yalnızca para biriminden KAYNAKLANAN hatada parametresiz tekrar dene.
    // Geniş bir catch, geçersiz müşteri/fiyat gibi alakasız hataları da
    // yutup Stripe'a boşuna ikinci bir istek atardı ve asıl hatayı gizlerdi.
    if (!/currency/i.test(message)) throw err;
    console.error(
      `[stripe] ${visitorCurrency.toUpperCase()} ile oturum açılamadı, Price'ın varsayılan para birimine düşülüyor. ` +
        `Ziyaretçi ${visitorCurrency.toUpperCase()} fiyat gördü ama başka bir para birimiyle ücretlendirilecek — ` +
        `Stripe'ta ${priceId} fiyatına currency_options ekleyin. Hata: ${message}`
    );
    session = await stripe.checkout.sessions.create(params);
  }

  return NextResponse.json({ url: session.url });
}
