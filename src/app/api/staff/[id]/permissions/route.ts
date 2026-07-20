import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { PERM_LABELS } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

/**
 * Bir personel kaydının (staff.id) bağlı olduğu org_member satırını
 * getirir/günceller. Her personel kaydının giriş hesabı olmayabilir —
 * o durumda org_member bulunamaz (linked: false) ve önce davet edilmesi
 * gerekir.
 */

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data } = await supabase
    .from("org_members")
    .select("role, permissions_json")
    .eq("org_id", member.org_id)
    .eq("staff_id", id)
    .maybeSingle();

  if (!data) return NextResponse.json({ linked: false });
  return NextResponse.json({ linked: true, role: data.role, permissions_json: data.permissions_json ?? {} });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data: target } = await supabase
    .from("org_members")
    .select("id, role")
    .eq("org_id", member.org_id)
    .eq("staff_id", id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Bu personelin giriş hesabı yok — önce davet edin" }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "Sahibin yetkileri buradan değiştirilemez" }, { status: 403 });

  const updates: Record<string, unknown> = {};

  if ("role" in body) {
    if (!["staff", "manager"].includes(body.role)) {
      return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
    }
    updates.role = body.role;
  }

  if ("permissions_json" in body && body.permissions_json && typeof body.permissions_json === "object") {
    // Sadece bilinen izin anahtarları kabul edilir
    const clean: Record<string, boolean> = {};
    for (const key of Object.keys(PERM_LABELS)) {
      if (key in body.permissions_json) clean[key] = !!body.permissions_json[key];
    }
    updates.permissions_json = clean;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("org_members")
    .update(updates)
    .eq("id", target.id)
    .select("role, permissions_json")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ linked: true, role: data.role, permissions_json: data.permissions_json });
}
