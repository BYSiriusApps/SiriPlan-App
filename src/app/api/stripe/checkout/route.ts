import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getLocale } from "next-intl/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe/config";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";
import { getPricingCurrencyFromHeaders } from "@/lib/pricing";
import { activeStaffBlockingPlan, staffBlockingMessage } from "@/lib/stripe/plan-guard";
import { isBranchOrg } from "@/lib/branches";
import { CONSENT_VERSION } from "@/lib/legal/seller";

export const dynamic = "force-dynamic";

// Stripe Checkout'un desteklediği diller. Arapça Stripe'ta yok — 'auto'ya
// bırakılırsa tarayıcı diline göre karar verir (genelde İngilizce'ye düşer).
// Bizim NEXT_LOCALE çerezimiz kullanıcının sitede seçtiği dili yansıttığı
// için tarayıcı dilinden daha güvenilir; o yüzden burada açıkça eşleniyor.
const STRIPE_LOCALE: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
  tr: "tr",
  en: "en",
  ru: "ru",
  ar: "en",
};

// TRY ödemede Stripe sayfasının "Abone ol" düğmesi altında gösterilen not
// (Stripe custom_text.submit — en fazla 1200 karakter). Arapça Stripe'ta
// olmadığı için sayfa İngilizce açılır; not da İngilizce verilir.
const FOREIGN_FEE_NOTE: Record<string, string> = {
  tr: "Not: Ödeme yurt dışı üye işyerimiz üzerinden tahsil edildiği için kartınızın bankası işlem tutarından %1-3 arası komisyon kesintisi yapabilir. Bu komisyon bankanıza aittir, SiriPlan tarafından eklenmez.",
  en: "Note: Because payment is processed through our merchant account outside Turkey, your card's bank may deduct a 1-3% fee from the transaction amount. This fee goes to your bank, not to SiriPlan.",
  ru: "Примечание: поскольку платёж проходит через наш зарубежный счёт, банк вашей карты может удержать комиссию 1-3% от суммы операции. Эта комиссия идёт банку, а не SiriPlan.",
  ar: "Note: Because payment is processed through our merchant account outside Turkey, your card's bank may deduct a 1-3% fee from the transaction amount. This fee goes to your bank, not to SiriPlan.",
};

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

  const { plan, annual, consent } = await req.json() as {
    plan: PlanKey;
    annual: boolean;
    consent?: { distanceSales?: boolean; immediateStart?: boolean };
  };
  const planConfig = PLANS[plan];
  if (!planConfig) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Mesafeli satış: ödeme öncesi iki açık onay zorunludur (sözleşme + ön bilgilendirme
  // formu okundu/kabul; hizmetin hemen başlaması / cayma hakkı bilgilendirmesi).
  // UI atlansa bile sunucu tarafında da uygulanır; onay kaydı aşağıda Stripe
  // metadata'sına ve audit_logs'a yazılır.
  if (consent?.distanceSales !== true || consent?.immediateStart !== true) {
    return NextResponse.json(
      {
        error: "Ödemeye geçmeden önce Mesafeli Satış Sözleşmesi ve hizmetin hemen başlaması onaylarını işaretlemeniz gerekir. Sayfayı yenileyip tekrar deneyin.",
        code: "CONSENT_REQUIRED",
      },
      { status: 400 }
    );
  }
  const consentAt = new Date().toISOString();

  const member = await getActiveMember(supabase);

  if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

  type OrgJoin = {
    stripe_customer_id?: string;
    name: string;
    email?: string;
    trial_ends_at?: string | null;
    stripe_subscription_id?: string | null;
    subscription_status?: string;
  };
  const org = (member as unknown as { org_id: string; organizations: OrgJoin }).organizations;

  // Zaten aktif (iptal edilmemiş) bir aboneliği olan bir org burada YENİ bir
  // Checkout Session/subscription açarsa, eski abonelik Stripe'ta arka planda
  // çalışmaya devam eder ve kullanıcı iki kez ücretlendirilir. Mevcut abone
  // plan değiştirmek için /api/stripe/change-plan'ı kullanmalı (aynı
  // aboneliğin fiyat kalemini günceller, ikinci bir ödeme açmaz).
  if (org.stripe_subscription_id && org.subscription_status !== "canceled") {
    return NextResponse.json(
      {
        error: "Zaten aktif bir aboneliğiniz var. Plan değiştirmek için abonelik sayfasını kullanın.",
        code: "ALREADY_SUBSCRIBED",
      },
      { status: 409 }
    );
  }

  // Şube (Ek Şube paketi) ana işletmenin aboneliğine bağlıdır; kendi aboneliğini
  // açıp ikinci kez ücretlendirilmesin.
  if (await isBranchOrg(member.org_id)) {
    return NextResponse.json(
      { error: "Bu şube ana işletmenin aboneliğine bağlı. Plan işlemleri ana işletmeden yapılır.", code: "BRANCH_ORG" },
      { status: 409 }
    );
  }

  // Mini'ye geçerken aktif personel sayısı planın sınırını aşıyorsa satın almaya izin verilmez.
  const blockingStaff = await activeStaffBlockingPlan(member.org_id, plan);
  if (blockingStaff !== null) {
    return NextResponse.json({ error: staffBlockingMessage(blockingStaff), code: "STAFF_OVER_PLAN_LIMIT" }, { status: 409 });
  }

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
  if (!priceId) {
    return NextResponse.json({ error: "Bu plan için fiyat tanımlı değil" }, { status: 500 });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Ziyaretçinin fiyat sayfasında GÖRDÜĞÜ para birimi (pricing_currency
  // çerezi → IP ülkesi; bkz. lib/pricing.ts). Ödeme ekranında başka bir para
  // birimiyle karşılaşmaması için aynı kaynaktan okunuyor.
  const visitorCurrency = getPricingCurrencyFromHeaders(req.headers).toLowerCase();
  const locale = await getLocale();

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?subscription=success&plan=${plan}`,
    cancel_url: `${appUrl}/auth/plan-sec?canceled=1`,
    metadata: { org_id: member.org_id, plan, consent_version: CONSENT_VERSION, consent_at: consentAt },
    subscription_data: {
      ...(hasAlreadyHadTrial ? {} : { trial_period_days: 14 }),
      metadata: { org_id: member.org_id, plan, consent_version: CONSENT_VERSION, consent_at: consentAt },
    },
    allow_promotion_codes: true,
    locale: STRIPE_LOCALE[locale] ?? "auto",
    // Yurt dışı işlem komisyonu uyarısı Stripe'ın kendi ödeme sayfasında da
    // görünsün (plan-sec/fiyat sayfasındaki notun aynısı) — yalnızca TRY.
    ...(visitorCurrency === "try" && FOREIGN_FEE_NOTE[locale]
      ? { custom_text: { submit: { message: FOREIGN_FEE_NOTE[locale] } } }
      : {}),
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

  // Onay kaydı (ispat): sürüm, zaman, IP, tarayıcı, plan. Hata ödemeyi engellemez.
  try {
    const admin = await createAdminClient();
    await admin.from("audit_logs").insert({
      org_id: member.org_id,
      action: "consent.distance_sales",
      table_name: "organizations",
      new_data: {
        version: CONSENT_VERSION,
        at: consentAt,
        user_id: user.id,
        plan,
        interval: annual ? "year" : "month",
        currency: visitorCurrency,
        checkout_session_id: session.id,
        distance_sales: true,
        immediate_start: true,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch (err) {
    console.error("[stripe] onay kaydı yazılamadı:", err);
  }

  return NextResponse.json({ url: session.url });
}
