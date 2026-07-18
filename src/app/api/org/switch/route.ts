import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";

// Aktif işletmeyi değiştirir. Cookie kalıcıdır (1 yıl) — kullanıcı
// çıkış/giriş yapsa da seçili işletme korunur, veri kaybı yaşanmaz.
export async function POST(req: NextRequest) {
  const { org_id } = await req.json().catch(() => ({}));
  if (!org_id || typeof org_id !== "string") {
    return NextResponse.json({ error: "org_id gerekli" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Kullanıcı gerçekten bu işletmenin üyesi mi?
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("org_id", org_id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Bu işletmeye üye değilsiniz" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, org_id, role: membership.role });
  res.cookies.set(ACTIVE_ORG_COOKIE, org_id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
