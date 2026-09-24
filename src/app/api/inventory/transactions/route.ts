import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { recordInventoryTransaction } from "@/lib/inventory-tx";

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

  // Kötüye kullanım / parmak kayması koruması: tek harekette makul üst sınır ve
  // negatif birim fiyat reddi. Barkodla satış bu ucu kullandığından burada
  // tutmak tüm çağıranları (elle modal, sesli stok, barkod) kapsar.
  const qtyNum = Number(quantity);
  if (!Number.isFinite(qtyNum) || qtyNum <= 0 || qtyNum > 100000) {
    return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
  }
  if (unit_price !== undefined && unit_price !== null && Number(unit_price) < 0) {
    return NextResponse.json({ error: "Birim fiyat negatif olamaz" }, { status: 400 });
  }

  const result = await recordInventoryTransaction(supabase, member.org_id, user.id, {
    item_id,
    type,
    quantity,
    unit_price,
    note,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    { transaction: result.transaction, lowStock: result.lowStock },
    { status: 201 }
  );
}
