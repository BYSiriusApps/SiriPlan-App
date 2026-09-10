import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { generateInternalBarcode, normalizeScanned } from "@/lib/barcode";

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

/**
 * Ürünün barkodunu çözer.
 *  - `generateBarcode` true  → işletmeye özel, tahmin edilemez bir iç kod üretir
 *    (org içinde çakışmayana kadar birkaç deneme; son güvence DB unique indeksi).
 *  - `barcode` verilmiş      → normalleştirip döndürür; geçersizse hata.
 *  - hiçbiri                 → { barcode: null } (dokunma).
 * `undefined` döndürürse barkod alanına HİÇ dokunulmamalı (PUT'ta kısmi güncelleme).
 */
async function resolveBarcode(
  supabase: SupabaseClient,
  orgId: string,
  body: { barcode?: unknown; generateBarcode?: unknown },
  selfId?: string,
): Promise<{ barcode: string | null; barcode_source: string | null } | { error: string } | undefined> {
  if (body.generateBarcode === true) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = generateInternalBarcode();
      const { data: clash } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("org_id", orgId)
        .eq("barcode", candidate)
        .maybeSingle();
      if (!clash || clash.id === selfId) {
        return { barcode: candidate, barcode_source: "generated" };
      }
    }
    return { error: "Barkod üretilemedi, lütfen tekrar deneyin." };
  }

  if (body.barcode === undefined) return undefined;
  if (body.barcode === null || body.barcode === "") {
    return { barcode: null, barcode_source: null };
  }

  const normalized = normalizeScanned(body.barcode);
  if (!normalized) {
    return { error: "Barkod 6–32 karakter olmalı (harf, rakam, tire)." };
  }

  const { data: clash } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("org_id", orgId)
    .eq("barcode", normalized)
    .maybeSingle();
  if (clash && clash.id !== selfId) {
    return { error: "Bu barkod bu işletmede zaten başka bir ürüne bağlı." };
  }

  return { barcode: normalized, barcode_source: "manual" };
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

  const resolved = await resolveBarcode(supabase, member.org_id, body);
  if (resolved && "error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
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
      ...(resolved ? { barcode: resolved.barcode, barcode_source: resolved.barcode_source } : {}),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu barkod bu işletmede zaten başka bir ürüne bağlı." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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

  const resolved = await resolveBarcode(supabase, member.org_id, body, id);
  if (resolved && "error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

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
      ...(resolved ? { barcode: resolved.barcode, barcode_source: resolved.barcode_source } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu barkod bu işletmede zaten başka bir ürüne bağlı." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
