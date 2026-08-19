import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { canManageStaff, sanitizePermissions, OWNER_ONLY_PERMS } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

/**
 * Bir personel kaydının (staff.id) bağlı olduğu org_member satırını
 * getirir/günceller. Her personel kaydının giriş hesabı olmayabilir —
 * o durumda org_member bulunamaz (linked: false) ve önce davet edilmesi
 * gerekir.
 *
 * YETKİ KURALLARI (yetki yükseltmeyi engeller):
 *  1. Yalnızca sahip (owner) veya `manage_staff` verilmiş üye erişebilir.
 *     Eskiden "rolü staff olmayan herkes" yeterliydi; yani manage_staff'i
 *     KAPALI bir yönetici de arayüzde gizli olan bu ucu doğrudan çağırıp
 *     yetki dağıtabiliyordu.
 *  2. Kimse kendi üyeliğini düzenleyemez — aksi halde bir yönetici kendine
 *     tüm izinleri verebilirdi.
 *  3. `manage_staff` iznini ve `manager` rolünü yalnızca sahip devredebilir;
 *     böylece yetki zinciri sahipte kalır.
 *  4. Sahibin satırı hiçbir şekilde değiştirilemez.
 */

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (!canManageStaff(member)) {
    return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });
  }

  const { data } = await supabase
    .from("org_members")
    .select("role, permissions_json, user_id")
    .eq("org_id", member.org_id)
    .eq("staff_id", id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({
      linked: false,
      viewerRole: member.role,
      viewerPermissions: member.permissions_json ?? {},
    });
  }
  return NextResponse.json({
    linked: true,
    role: data.role,
    permissions_json: data.permissions_json ?? {},
    isSelf: data.user_id === user.id,
    viewerRole: member.role,
    viewerPermissions: member.permissions_json ?? {},
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (!canManageStaff(member)) {
    return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });
  }

  const { data: target } = await supabase
    .from("org_members")
    .select("id, role, user_id, permissions_json")
    .eq("org_id", member.org_id)
    .eq("staff_id", id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Bu personelin giriş hesabı yok — önce davet edin" }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "Sahibin yetkileri buradan değiştirilemez" }, { status: 403 });
  if (target.user_id === user.id) {
    return NextResponse.json({ error: "Kendi yetkilerinizi değiştiremezsiniz" }, { status: 403 });
  }

  const isOwner = member.role === "owner";
  const updates: Record<string, unknown> = {};

  if ("role" in body) {
    if (!["staff", "manager"].includes(body.role)) {
      return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
    }
    // Yönetici rolüne yükseltmeyi yalnızca sahip yapabilir. (Zaten yönetici
    // olan birini yönetici bırakmak serbest — bu bir yükseltme değil.)
    if (body.role === "manager" && !isOwner && target.role !== "manager") {
      return NextResponse.json(
        { error: "Yönetici rolünü yalnızca işletme sahibi verebilir" },
        { status: 403 }
      );
    }
    updates.role = body.role;
  }

  if ("permissions_json" in body) {
    // Sadece bilinen izin anahtarları kabul edilir
    const clean = sanitizePermissions(body.permissions_json);
    if (!isOwner) {
      // Sahip olmayan bir yönetici, sahibe özel izinleri ne verebilir ne de
      // geri alabilir — mevcut değer aynen korunur.
      const current = (target as { permissions_json?: Record<string, boolean> }).permissions_json;
      for (const key of OWNER_ONLY_PERMS) {
        delete clean[key];
        if (current && key in current) clean[key] = !!current[key];
      }
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
    .eq("org_id", member.org_id)
    .select("role, permissions_json")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ linked: true, role: data.role, permissions_json: data.permissions_json });
}
