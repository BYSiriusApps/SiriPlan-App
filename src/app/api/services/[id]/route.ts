import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: svc } = await supabase
    .from("services")
    .select("id")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();
  if (!svc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: rows } = await supabase
    .from("staff_services")
    .select("staff(*)")
    .eq("service_id", id);

  const staff = (rows || []).map((r: Record<string, unknown>) => r.staff).filter(Boolean);
  return NextResponse.json({ staff });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const allowed = [
    "name", "price", "currency", "duration_minutes", "description", "category_tag",
    "category_id", "photo_url", "is_active", "contributes_loyalty", "is_bookable_online",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("services")
    .select("price, duration_minutes, is_bookable_online")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextBookable = "is_bookable_online" in updates ? updates.is_bookable_online : current.is_bookable_online;
  const nextPrice = "price" in updates ? updates.price : current.price;
  const nextDuration = "duration_minutes" in updates ? updates.duration_minutes : current.duration_minutes;
  if (nextBookable && (nextPrice === null || nextPrice === undefined || nextDuration === null || nextDuration === undefined)) {
    return NextResponse.json({ error: "Online randevuya açık hizmetler için süre ve fiyat zorunlu" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
