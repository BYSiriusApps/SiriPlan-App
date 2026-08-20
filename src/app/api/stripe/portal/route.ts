import { NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { isMobileApp } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";

export async function POST() {
  // Mağaza kurallarına uyum (bkz. api/stripe/checkout): Stripe müşteri
  // portalı da bir ödeme yüzeyidir — plan değiştirme, kart güncelleme ve
  // iptal oradan yapılır. Native uygulamadan hiç açılmamalı; şu an bu ucu
  // çağıran bir buton yok ama ileride eklenirse sunucu tarafı zaten kapalı.
  if (await isMobileApp()) {
    return NextResponse.json(
      { error: "Bu işlem mobil uygulama içinden yapılamaz. Lütfen destek ile iletişime geçin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);

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
