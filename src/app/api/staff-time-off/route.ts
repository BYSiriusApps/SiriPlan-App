import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staff_id");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  let query = supabase
    .from("staff_time_off")
    .select("*")
    .eq("org_id", member.org_id)
    .order("starts_on", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ time_off: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { staff_id, starts_on, ends_on, reason } = body as {
    staff_id?: string | null;
    starts_on?: string;
    ends_on?: string;
    reason?: string;
  };

  if (!starts_on || !ends_on) {
    return NextResponse.json({ error: "Başlangıç ve bitiş tarihi zorunlu" }, { status: 400 });
  }
  if (ends_on < starts_on) {
    return NextResponse.json({ error: "Bitiş tarihi başlangıçtan önce olamaz" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data, error } = await supabase
    .from("staff_time_off")
    .insert({
      org_id: member.org_id,
      staff_id: staff_id || null,
      starts_on,
      ends_on,
      reason: reason || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ time_off: data }, { status: 201 });
}
