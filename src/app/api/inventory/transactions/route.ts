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

  // Fetch item details for name and fallback prices
  const { data: item } = await supabase
    .from("inventory_items")
    .select("name, cost_price, sale_price")
    .eq("id", item_id)
    .eq("org_id", member.org_id)
    .single();

  const fallbackPrice = type === "in" ? (item?.cost_price || 0) : type === "out" ? (item?.sale_price || 0) : null;
  const finalUnitPrice = unit_price !== undefined && unit_price !== null ? Number(unit_price) : fallbackPrice;

  const { data: tx, error } = await supabase
    .from("inventory_transactions")
    .insert({
      org_id: member.org_id,
      item_id,
      type,
      quantity: Number(quantity),
      unit_price: finalUnitPrice,
      note: note?.trim() || null,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto reflection to income/expense table
  if (tx && (type === "in" || type === "out") && finalUnitPrice !== null) {
    const finalAmount = Number(quantity) * Number(finalUnitPrice);
    if (finalAmount > 0) {
      const expType = type === "in" ? "gider" : "gelir";
      const expCategory = type === "in" ? "malzeme" : "diger";
      const description = type === "in"
        ? `Stok Alımı: ${quantity} adet ${item?.name || "Ürün"}`
        : `Stok Satışı: ${quantity} adet ${item?.name || "Ürün"}`;

      await supabase.from("expenses").insert({
        org_id: member.org_id,
        type: expType,
        category: expCategory,
        amount: finalAmount,
        description,
        note: `Stok hareketi üzerinden otomatik oluşturuldu.${note ? " Not: " + note : ""}`,
        date: new Date().toISOString().split("T")[0],
        payment_method: "nakit",
        created_by: user.id,
      });
    }
  }

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
