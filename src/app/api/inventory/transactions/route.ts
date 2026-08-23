import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: transactions, error } = await supabase
    .from("inventory_transactions")
    .select("*, item:inventory_items(name, unit)")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ transactions: [] });
  return NextResponse.json({ transactions: transactions || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();
  const { item_id, type, quantity, unit_price, note } = body;

  if (!item_id || !type || quantity === undefined) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  const { data: tx, error } = await supabase
    .from("inventory_transactions")
    .insert({
      org_id: member.org_id,
      item_id,
      type,
      quantity: Number(quantity),
      unit_price: unit_price ? Number(unit_price) : null,
      note: note?.trim() || null,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: tx }, { status: 201 });
}
