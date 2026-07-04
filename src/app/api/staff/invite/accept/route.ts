import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /api/staff/invite/accept — token + giriş yapmış kullanıcı → org_member oluştur */
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token zorunludur" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapmalısınız" }, { status: 401 });

  // Find valid invite
  const { data: invite, error: fetchErr } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (fetchErr || !invite) {
    return NextResponse.json(
      { error: "Davet geçersiz veya süresi dolmuş" },
      { status: 404 }
    );
  }

  // Check if user already in this org
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Bu organizasyona zaten üyesiniz" }, { status: 409 });
  }

  // Create org_member
  const { error: memberErr } = await supabase
    .from("org_members")
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      staff_id: invite.staff_id ?? null,
      permissions_json: invite.permissions_json,
    });

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  // Mark invite as accepted
  await supabase
    .from("staff_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ success: true, org_id: invite.org_id });
}

/** GET /api/staff/invite/accept?token=xxx — token bilgisini ön yüze göster (e-posta/org adı) */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token zorunlu" }, { status: 400 });

  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from("staff_invitations")
    .select("role, expires_at, organizations(name), staff(full_name)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Geçersiz davet" }, { status: 404 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Davet süresi dolmuş" }, { status: 410 });
  }

  return NextResponse.json({
    role: invite.role,
    expires_at: invite.expires_at,
    org_name: (invite.organizations as unknown as { name: string } | null)?.name,
    staff_name: (invite.staff as unknown as { full_name: string } | null)?.full_name,
  });
}
