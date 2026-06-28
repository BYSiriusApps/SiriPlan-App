import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("org_id", member.org_id)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data, total: count });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { full_name, phone, email, birth_date, gender, notes, tags } = body;

  if (!full_name || !phone) {
    return NextResponse.json({ error: "Ad ve telefon zorunlu" }, { status: 400 });
  }

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
    .from("customers")
    .insert({
      org_id: member.org_id,
      full_name,
      phone,
      email: email || null,
      birth_date: birth_date || null,
      gender: gender || null,
      notes: notes || null,
      tags: tags || [],
      source: "manual",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu telefon numarası zaten kayıtlı" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data }, { status: 201 });
}
