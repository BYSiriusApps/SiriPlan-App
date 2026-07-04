import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

async function getMember(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
  return member ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("staff")
    .select("*, staff_services(service_id, services(id, name, price, duration_minutes))")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ staff: data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const ALLOWED = ["full_name", "role", "phone", "email", "commission_rate", "start_time", "end_time", "working_days", "is_active", "telegram_chat_id", "whatsapp_number"];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  if (updates.commission_rate !== undefined) {
    const raw = parseFloat(String(updates.commission_rate)) || 0;
    const normalized = raw > 1 ? raw / 100 : raw;
    updates.commission_rate = Math.min(1, Math.max(0, normalized));
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("staff")
    .update(updates)
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { error } = await supabase
    .from("staff")
    .update({ is_active: false })
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
