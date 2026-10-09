import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getLocale } from "next-intl/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe } from "@/lib/stripe/config";
import { ADDONS, getOrgAddons, type AddonKey } from "@/lib/stripe/addons";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";
import { getPricingCurrencyFromHeaders } from "@/lib/pricing";
import { CONSENT_VERSION } from "@/lib/legal/seller";

export const dynamic = "force-dynamic";

const STRIPE_LOCALE: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
  tr: "tr",
  en: "en",
  ru: "ru",
  ar: "en",
};

const MAX_BRANCH_QUANTITY = 20;

/**
 * Ek paket (AI Asistan / Ek Şube) satın alma — plan aboneliğinden AYRI bir
 * Stripe aboneliği açar (bkz. lib/stripe/addons.ts). Paket, ödeme tamamlanınca
 * api/webhooks/stripe tarafından org_addons'a yazılır (burada ASLA yazılmaz).
 * Price ID env'de tanımlı değilse uç 503 döner → özellik fiilen kapalıdır ve
 * mevcut plan akışına hiçbir etkisi yoktur.
 */
export async function POST(req: NextRequest) {
  // Mağaza kuralları: native uygulama içinden ödeme oturumu açılmaz (bkz. api/stripe/checkout).
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen web'den devam edin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    addon?: string;
    annual?: boolean;
    quantity?: number;
    consent?: { distanceSales?: boolean; immediateStart?: boolean };
  } | null;
  const addonKey = body?.addon as AddonKey | undefined;
  if (!addonKey || !(addonKey in ADDONS)) {
    return NextResponse.json({ error: "Geçersiz paket." }, { status: 400 });
  }
  // Mesafeli satış: ödeme öncesi iki açık onay zorunlu (bkz. api/stripe/checkout).
  if (body?.consent?.distanceSales !== true || body?.consent?.immediateStart !== true) {
    return NextResponse.json(
      { error: "Ödemeye geçmeden önce Mesafeli Satış Sözleşmesi ve hizmetin hemen başlaması onaylarını işaretlemeniz gerekir.", code: "CONSENT_REQUIRED" },
      { status: 400 }
    );
  }
  const consentAt = new Date().toISOString();
  const addon = ADDONS[addonKey];
  const priceId = body?.annual ? addon.annual : addon.monthly;
  if (!priceId) {
    return NextResponse.json({ error: "Bu paket için fiyat tanımlı değil" }, { status: 503 });
  }

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
  // Abonelik sayfasıyla aynı kural: yalnızca sahip/yönetici ödeme başlatabilir.
  if (member.role !== "owner" && member.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = member.organizations;
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

  // Ek paket yalnızca ÖDENEN bir plana eklenir (deneme/iptal/ödeme sorunu olan org'a değil).
  const plan = org.plan;
  const paid = org.subscription_status === "active" || org.subscription_status === "trialing";
  if (!(addon.eligiblePlans as readonly string[]).includes(plan) || !paid || !org.stripe_subscription_id) {
    return NextResponse.json(
      { error: "Bu paket mevcut planınıza eklenemez.", code: "PLAN_NOT_ELIGIBLE" },
      { status: 409 }
    );
  }

  // Aynı paketten ikinci abonelik açılıp çift ücret alınmasın (plan checkout'taki ALREADY_SUBSCRIBED ile aynı fikir).
  const existing = await getOrgAddons(member.org_id);
  const alreadyHas = addonKey === "ai_assistant" ? !!existing.ai_subscription_id : !!existing.branch_subscription_id;
  if (alreadyHas) {
    return NextResponse.json(
      { error: "Bu pakete zaten abonesiniz. Değişiklik için abonelik sayfasını kullanın.", code: "ALREADY_SUBSCRIBED" },
      { status: 409 }
    );
  }

  const stripe = getStripe();
  const customerId = org.stripe_customer_id;
  if (!customerId) {
    // Ödenen plan varsa müşteri vardır; yoksa tutarsızlık — sessizce yeni müşteri açmayız.
    return NextResponse.json({ error: "Ödeme hesabı bulunamadı." }, { status: 409 });
  }

  const quantity =
    addonKey === "extra_branch"
      ? Math.min(MAX_BRANCH_QUANTITY, Math.max(1, Math.floor(Number(body?.quantity) || 1)))
      : 1;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const visitorCurrency = getPricingCurrencyFromHeaders(req.headers).toLowerCase();
  const locale = await getLocale();
  const meta = { kind: "addon", addon: addonKey, org_id: member.org_id, consent_version: CONSENT_VERSION, consent_at: consentAt };

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity,
        ...(addonKey === "extra_branch"
          ? { adjustable_quantity: { enabled: true, minimum: 1, maximum: MAX_BRANCH_QUANTITY } }
          : {}),
      },
    ],
    success_url: `${appUrl}/dashboard/abonelik?addon=success`,
    cancel_url: `${appUrl}/dashboard/abonelik?addon=canceled`,
    // Deneme yok: plan zaten ücretsiz denemesini aldı; ek paket hemen ücretlenir.
    subscription_data: { metadata: meta },
    metadata: meta,
    allow_promotion_codes: true,
    locale: STRIPE_LOCALE[locale] ?? "auto",
  };

  // Para birimi davranışı plan/SMS checkout'uyla aynı: önce ziyaretçinin para
  // birimi, yalnızca para biriminden kaynaklanan hatada Price varsayılanı.
  let session;
  try {
    session = await stripe.checkout.sessions.create({ ...params, currency: visitorCurrency });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/currency/i.test(message)) throw err;
    console.error(`[stripe] Ek paket ${addonKey} ${visitorCurrency.toUpperCase()} ile açılamadı, varsayılana düşülüyor: ${message}`);
    session = await stripe.checkout.sessions.create(params);
  }

  // Denetim izi: kim, hangi paketi başlattı (ödeme tamamlanması webhook'ta kaydedilir).
  try {
    const admin = await createAdminClient();
    await admin.from("audit_logs").insert({
      org_id: member.org_id,
      action: "addon.checkout_started",
      table_name: "organizations",
      new_data: { addon: addonKey, quantity, annual: !!body?.annual, user_id: user.id },
    });
    await admin.from("audit_logs").insert({
      org_id: member.org_id,
      action: "consent.distance_sales",
      table_name: "organizations",
      new_data: {
        version: CONSENT_VERSION,
        at: consentAt,
        user_id: user.id,
        kind: "addon",
        addon: addonKey,
        quantity,
        interval: body?.annual ? "year" : "month",
        currency: visitorCurrency,
        checkout_session_id: session.id,
        distance_sales: true,
        immediate_start: true,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch {
    // denetim kaydı ödeme akışını engellemez
  }

  return NextResponse.json({ url: session.url });
}
