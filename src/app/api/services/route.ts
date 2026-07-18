import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staff_id");

  let query = supabase
    .from("services")
    .select("*")
    .eq("org_id", member.org_id)
    .eq("is_active", true)
    .order("display_order");

  if (staffId) {
    const { data: staffServices } = await supabase
      .from("staff_services")
      .select("service_id")
      .eq("staff_id", staffId);
    const ids = (staffServices || []).map((s) => s.service_id);
    if (ids.length > 0) {
      query = query.in("id", ids);
    } else {
      return NextResponse.json({ services: [] });
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, duration_minutes, price, category_tag, description, contributes_loyalty } = body;

  if (!name || !duration_minutes || price === undefined) {
    return NextResponse.json({ error: "Ad, süre ve fiyat zorunlu" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data, error } = await supabase
    .from("services")
    .insert({
      org_id: member.org_id,
      name,
      duration_minutes: parseInt(duration_minutes),
      price: parseFloat(price),
      category_tag: category_tag || "genel",
      description: description || null,
      contributes_loyalty: contributes_loyalty ?? true,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
