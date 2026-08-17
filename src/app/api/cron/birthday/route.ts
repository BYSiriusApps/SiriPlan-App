import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBirthdayEmail } from "@/lib/email/send";
import { getEntitlements } from "@/lib/entitlements";
import { format } from "date-fns";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const today = format(new Date(), "MM-dd"); // e.g. "06-15"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";

  type CustomerWithOrg = {
    id: string; org_id: string; full_name: string; phone: string; email?: string | null;
    birth_date?: string | null;
    organizations?: {
      slug: string; wa_token?: string; wa_phone_number_id?: string;
      name: string; feature_campaigns?: boolean;
      plan?: string | null; trial_ends_at?: string | null;
    };
  };

  const { data: customers } = await supabase
    .from("customers")
    .select("id, org_id, full_name, phone, email, birth_date, organizations(slug, wa_token, wa_phone_number_id, name, feature_campaigns, plan, trial_ends_at)")
    .not("birth_date", "is", null)
    .limit(10000);

  const todayBirthdays = ((customers || []) as unknown as CustomerWithOrg[]).filter((c) => {
    if (!c.birth_date) return false;
    return c.birth_date.slice(5) === today; // month-day part
  });

  let sentWhatsApp = 0;
  let sentEmail = 0;

  for (const c of todayBirthdays) {
    const org = c.organizations;
    // Deneme süresi Pro'ya denk: kampanya yetkisi etkin yetkiden hesaplanır.
    if (!org || !getEntitlements(org).feature_campaigns) continue;

    const bookingUrl = `${appUrl}/r/${org.slug}`;

    // WhatsApp kanalı
    if (org.wa_token && org.wa_phone_number_id && c.phone) {
      const to = c.phone.replace(/\D/g, "").replace(/^0/, "90");
      const message = `🎂 Doğum günün kutlu olsun, ${c.full_name}!

${org.name} ailesi olarak bu özel günde yanındayız.

Seni misafir etmek ve güzel hissettirmek isteriz. Bu ay yapacağın ziyarette sana özel %10 indirim sunuyoruz! 🎁

Randevu için: ${bookingUrl}`;

      const res = await fetch(`https://graph.facebook.com/v19.0/${org.wa_phone_number_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${org.wa_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }).catch(() => null);

      if (res?.ok) sentWhatsApp++;
    }

    // E-posta kanalı (Resend)
    if (c.email) {
      try {
        await sendBirthdayEmail({
          to: c.email,
          customerName: c.full_name,
          orgName: org.name,
          bookingUrl,
        });
        sentEmail++;
      } catch {}
    }
  }

  return NextResponse.json({ sent_whatsapp: sentWhatsApp, sent_email: sentEmail, date: today });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
