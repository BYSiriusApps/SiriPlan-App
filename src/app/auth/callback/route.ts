import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send";
import { notifyAdminNewSignup } from "@/lib/notify-admin";
import { seedDefaultServices } from "@/lib/services/seed";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/dashboard";
  // Only allow relative paths — prevent open redirect to external URLs
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/giris?error=no_code`);
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    return NextResponse.redirect(`${origin}/auth/giris?error=callback`);
  }

  // Check if org already exists for this user (returning user or already registered)
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    // New verified user — create org from metadata stored at signup
    const meta = user.user_metadata || {};
    const salonName = meta.salon_name as string | undefined;
    const phone = meta.phone as string | undefined;
    const type = (meta.business_type as string) || "kuafor";
    const fullName = (meta.full_name as string) || user.email!.split("@")[0];
    const slug = (meta.pending_slug as string) || (salonName ?? "salon") + "-" + Math.random().toString(36).slice(2, 6);

    if (salonName) {
      const admin = await createAdminClient();

      const { data: org, error: orgError } = await admin
        .from("organizations")
        .insert({
          slug,
          name: salonName,
          type,
          phone: phone || null,
          email: user.email!,
          plan: "trial",
          subscription_status: "active",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (orgError?.code === "23505") {
        // Slug collision — retry with different suffix
        const newSlug = slug + "-" + Math.random().toString(36).slice(2, 4);
        const { data: org2 } = await admin
          .from("organizations")
          .insert({ slug: newSlug, name: salonName, type, phone: phone || null, email: user.email!, plan: "trial", subscription_status: "active", trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() })
          .select("id").single();
        if (org2) {
          await admin.from("org_members").insert({ org_id: org2.id, user_id: user.id, role: "owner" });
          await admin.from("staff").insert({ org_id: org2.id, full_name: fullName, role: "Salon Sahibi", is_active: true });
          await seedDefaultServices(admin, org2.id, type);
          notifyAdminNewSignup({ salonName, ownerName: fullName, email: user.email!, phone, businessType: type }).catch(() => {});
        }
      } else if (org) {
        await admin.from("org_members").insert({ org_id: org.id, user_id: user.id, role: "owner" });
        await admin.from("staff").insert({ org_id: org.id, full_name: fullName, role: "Salon Sahibi", is_active: true });
        await seedDefaultServices(admin, org.id, type);

        sendWelcomeEmail({ to: user.email!, salonName, ownerName: fullName }).catch(() => {});
        notifyAdminNewSignup({ salonName, ownerName: fullName, email: user.email!, phone, businessType: type }).catch(() => {});
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
