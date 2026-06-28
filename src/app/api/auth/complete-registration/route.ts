import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, salonName, type, phone, email, fullName, slug } = await req.json();

  if (!userId || !salonName || !slug || !email) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      slug,
      name: salonName,
      type: type || "kuafor",
      phone: phone || null,
      email,
      plan: "trial",
      subscription_status: "active",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (orgError) {
    // Slug collision: try with different suffix
    if (orgError.code === "23505") {
      const newSlug = slug + "-" + Math.random().toString(36).slice(2, 4);
      const { data: org2, error: orgError2 } = await supabase
        .from("organizations")
        .insert({ slug: newSlug, name: salonName, type: type || "kuafor", phone: phone || null, email, plan: "trial", subscription_status: "active", trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() })
        .select("id")
        .single();
      if (orgError2 || !org2) return NextResponse.json({ error: orgError2?.message }, { status: 500 });
      await supabase.from("org_members").insert({ org_id: org2.id, user_id: userId, role: "owner" });
      return NextResponse.json({ orgId: org2.id, slug: newSlug });
    }
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  if (!org) return NextResponse.json({ error: "Org oluşturulamadı" }, { status: 500 });

  // Link user as owner
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: userId, role: "owner" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Also create a staff record for the owner
  await supabase.from("staff").insert({
    org_id: org.id,
    full_name: fullName || email.split("@")[0],
    role: "Salon Sahibi",
    is_active: true,
  });

  return NextResponse.json({ orgId: org.id, slug });
}
