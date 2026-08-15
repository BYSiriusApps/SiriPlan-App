import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Bir hizmete hangi personelin verebileceğini ayarlar (staff_services tablosu).
 * Gönderilen staff_ids seti bu hizmet için TAM listeyi temsil eder — mevcut
 * atamalar silinip yeniden yazılır (sync semantiği, ekle/çıkar ayrı uç nokta değil).
 * Boş liste = "kısıtlama yok, tüm aktif personel aday" (bkz. resolveEligibleStaffIds).
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const staffIds = Array.isArray(body?.staff_ids) ? (body.staff_ids as unknown[]).filter((v): v is string => typeof v === "string") : null;
  if (!staffIds) return NextResponse.json({ error: "staff_ids zorunlu" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data: svc } = await supabase
    .from("services")
    .select("id")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();
  if (!svc) return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });

  // Sadece bu organizasyona ait personel atanabilir — cross-org id enjeksiyonunu önler.
  let validStaffIds: string[] = [];
  if (staffIds.length > 0) {
    const { data: orgStaff } = await supabase
      .from("staff")
      .select("id")
      .eq("org_id", member.org_id)
      .in("id", staffIds);
    validStaffIds = (orgStaff || []).map((s) => s.id);
  }

  const { error: delErr } = await supabase.from("staff_services").delete().eq("service_id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (validStaffIds.length > 0) {
    const { error: insErr } = await supabase
      .from("staff_services")
      .insert(validStaffIds.map((staff_id) => ({ staff_id, service_id: id })));
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ staff_ids: validStaffIds });
}
