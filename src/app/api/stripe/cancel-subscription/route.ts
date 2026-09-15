import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe } from "@/lib/stripe/config";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";

/**
 * Panelden doğrudan abonelik iptali. Önceden tek yol Stripe Müşteri
 * Portalı'ydı (bkz. api/stripe/portal) — hem Starter planda hiç
 * gösterilmiyordu hem de portalın "İptal" seçeneği Stripe panelinde ayrıca
 * açılması gereken bir ayar, dolayısıyla kullanıcı için görünür bir iptal
 * alanı hiç yoktu.
 *
 * `cancel_at_period_end: true` kullanılır — kart hemen düşülmez, kullanıcı
 * ödediği dönemin sonuna kadar erişimini korur (Stripe portalının davranışıyla
 * aynı). Gerçek durum değişimi (plan → trial, feature'ların kapanması) zaten
 * `customer.subscription.updated` / `.deleted` webhook'unda merkezi olarak
 * işleniyor (bkz. api/webhooks/stripe) — burada organizations tablosuna
 * ikinci bir yazım YAPILMIYOR ki iki kaynak birbiriyle çelişmesin.
 */
export async function POST(req: NextRequest) {
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen destek ile iletişime geçin." },
      { status: 403 }
    );
  }

  const { resume } = await req.json().catch(() => ({ resume: false }));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || member.role !== "owner") {
    return NextResponse.json(
      { error: "Yalnızca işletme sahibi aboneliği iptal edebilir" },
      { status: 403 }
    );
  }

  type OrgJoin = { stripe_subscription_id?: string | null };
  const org = (member as unknown as { organizations: OrgJoin }).organizations;
  if (!org?.stripe_subscription_id) {
    return NextResponse.json({ error: "Aktif bir abonelik bulunamadı" }, { status: 404 });
  }

  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: !resume,
    });

    const admin = await createAdminClient();
    await admin.from("audit_logs").insert({
      org_id: member.org_id,
      action: resume ? "subscription.cancel_undone" : "subscription.cancel_requested",
      table_name: "organizations",
      new_data: { subscription_id: sub.id },
    });

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      periodEnd: (sub as unknown as { current_period_end: number }).current_period_end
        ? new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
        : null,
    });
  } catch {
    return NextResponse.json({ error: "İptal işlemi başarısız oldu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
