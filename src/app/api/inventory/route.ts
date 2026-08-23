import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("org_id", member.org_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json({ items: items || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();
  const { name, category, unit, current_stock, min_stock_alert, cost_price, sale_price } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Ürün adı zorunludur" }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from("inventory_items")
    .insert({
      org_id: member.org_id,
      name: name.trim(),
      category: category?.trim() || "genel",
      unit: unit?.trim() || "adet",
      current_stock: Number(current_stock) || 0,
      min_stock_alert: Number(min_stock_alert) || 5,
      cost_price: Number(cost_price) || 0,
      sale_price: Number(sale_price) || 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();
  const { id, name, category, unit, current_stock, min_stock_alert, cost_price, sale_price } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: item, error } = await supabase
    .from("inventory_items")
    .update({
      name: name?.trim(),
      category: category?.trim(),
      unit: unit?.trim(),
      current_stock: Number(current_stock),
      min_stock_alert: Number(min_stock_alert),
      cost_price: Number(cost_price),
      sale_price: Number(sale_price),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("inventory_items")
    .update({ is_active: false })
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
