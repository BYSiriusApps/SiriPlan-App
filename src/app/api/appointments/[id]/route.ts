import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  return member?.org_id ?? null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("appointments")
    .select("*, staff(*), service:services(*), customer:customers(*)")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ appointment: data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ALLOWED = ["status", "note", "internal_note", "tip", "payment_method", "cancel_reason"];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("appointments")
    .update({ status: "iptal" })
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
