import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", member.org_id)
    .single();

  if (error || !org) return NextResponse.json({ error: "Org bulunamadı" }, { status: 404 });
  return NextResponse.json({ org, role: member.role });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const ALLOWED = [
    "name", "type", "phone", "email", "address", "city",
    "instagram_handle", "whatsapp_number", "working_hours_json", "locale", "settings_json",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", member.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
