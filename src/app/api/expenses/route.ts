import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year  = searchParams.get("year")  ?? new Date().getFullYear().toString();
  const month = searchParams.get("month");

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("org_id", member.org_id)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date", { ascending: false });

  if (month) {
    const m = month.padStart(2, "0");
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, "0");
    query = query.gte("date", `${year}-${m}-01`).lte("date", `${year}-${m}-${lastDayStr}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();
  const { type, category, amount, description, note, date, payment_method } = body;

  if (!type || !category || !amount || !description || !date) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const { data, error } = await supabase.from("expenses").insert({
    org_id: member.org_id,
    type,
    category,
    amount: Number(amount),
    description,
    note,
    date,
    payment_method,
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
