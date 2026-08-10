import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// token 48 karakterlik hex üretiliyor (011_staff_invites_permissions_quota: encode(gen_random_bytes(24), 'hex'))
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

/**
 * Davet token'ı sahipliği tek başına yetki kanıtıdır (public/cancel,
 * public/consent uçlarındaki aynı desen) — bu yüzden okuma/kabul admin
 * (service role) client ile yapılır ve RLS'e bağlı kalınmaz. Daha önce
 * bunun için "anon" rolüne genel bir SELECT policy'si vardı ama token'ı
 * kontrol etmiyordu; herkes tüm bekleyen davetleri listeleyebiliyordu —
 * bkz. 20260809_fix_staff_invitations_rls_leak.sql.
 */

/** POST /api/staff/invite/accept — token + giriş yapmış kullanıcı → org_member oluştur */
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz davet bağlantısı" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapmalısınız" }, { status: 401 });

  const admin = await createAdminClient();

  // Find valid invite
  const { data: invite, error: fetchErr } = await admin
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
  const { data: existing } = await admin
    .from("org_members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Bu organizasyona zaten üyesiniz" }, { status: 409 });
  }

  // Create org_member
  const { error: memberErr } = await admin
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
  await admin
    .from("staff_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ success: true, org_id: invite.org_id });
}

/** GET /api/staff/invite/accept?token=xxx — token bilgisini ön yüze göster (e-posta/org adı) */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz davet bağlantısı" }, { status: 400 });
  }

  const admin = await createAdminClient();

  const { data: invite, error } = await admin
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
