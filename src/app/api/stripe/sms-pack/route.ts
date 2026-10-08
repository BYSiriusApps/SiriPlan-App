import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getLocale } from "next-intl/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";
import { getPricingCurrencyFromHeaders } from "@/lib/pricing";
import { SMS_PACK_CREDITS } from "@/lib/sms-credits";

export const dynamic = "force-dynamic";

const STRIPE_LOCALE: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
  tr: "tr",
  en: "en",
  ru: "ru",
  ar: "en",
};

/**
 * Tek seferlik SMS kontörü satın alma (1.000 SMS). Abonelikten bağımsızdır:
 * Stripe Checkout `payment` modunda açılır; kontör, ödeme tamamlanınca
 * api/webhooks/stripe tarafından org'a yüklenir (burada ASLA yüklenmez).
 */
export async function POST(req: Request) {
  // Mağaza kurallarına uyum (bkz. api/stripe/checkout): native uygulama içinden
  // ödeme oturumu asla açılmaz.
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen web'den devam edin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
  // Abonelik sayfasıyla aynı kural: yalnızca sahip/yönetici ödeme başlatabilir.
  if (member.role !== "owner" && member.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const priceId = process.env.STRIPE_PRICE_SMS_PACK || "";
  if (!priceId) {
    return NextResponse.json({ error: "SMS paketi için fiyat tanımlı değil" }, { status: 500 });
  }

  type OrgJoin = { stripe_customer_id?: string | null; name: string };
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
    await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", member.org_id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const visitorCurrency = getPricingCurrencyFromHeaders(req.headers).toLowerCase();
  const locale = await getLocale();

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/abonelik?sms_pack=success`,
    cancel_url: `${appUrl}/dashboard/abonelik?sms_pack=canceled`,
    // Webhook org'u bu alandan okur (oturum nesnesinde top-level metadata bulunur).
    metadata: { kind: "sms_pack", org_id: member.org_id, credits: String(SMS_PACK_CREDITS) },
    locale: STRIPE_LOCALE[locale] ?? "auto",
  };

  // Para birimi davranışı plan checkout'uyla aynı (bkz. api/stripe/checkout):
  // önce ziyaretçinin para birimiyle denenir, yalnızca para biriminden
  // kaynaklanan hatada Price'ın varsayılanına düşülür.
  let session;
  try {
    session = await stripe.checkout.sessions.create({ ...params, currency: visitorCurrency });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/currency/i.test(message)) throw err;
    console.error(`[stripe] SMS paketi ${visitorCurrency.toUpperCase()} ile açılamadı, varsayılan para birimine düşülüyor: ${message}`);
    session = await stripe.checkout.sessions.create(params);
  }

  return NextResponse.json({ url: session.url });
}
