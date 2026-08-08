import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const ALLOWED = ["status", "preferred_dates"];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }
  if (updates.status === "notified") {
    updates.notified_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("waitlist")
    .update(updates)
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { error } = await supabase
    .from("waitlist")
    .delete()
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
