import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data, error } = await supabase
    .from("staff")
    .select("*, staff_services(service_id, services(id, name))")
    .eq("org_id", member.org_id)
    .eq("is_active", true)
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { full_name, role, phone, email, commission_rate, start_time, end_time, working_days } = body;

  if (!full_name) return NextResponse.json({ error: "İsim zorunlu" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data, error } = await supabase
    .from("staff")
    .insert({
      org_id: member.org_id,
      full_name,
      role: role || "Uzman",
      phone: phone || null,
      email: email || null,
      commission_rate: commission_rate || 0,
      start_time: start_time || "09:00",
      end_time: end_time || "18:00",
      working_days: working_days || [1, 2, 3, 4, 5],
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}
