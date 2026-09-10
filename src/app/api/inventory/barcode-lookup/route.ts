import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { normalizeScanned } from "@/lib/barcode";

/**
 * GET /api/inventory/barcode-lookup?code=SP830491725064
 *
 * Okunan barkodu YALNIZCA aktif işletmenin stok kalemlerinde arar. Bulunamazsa
 * `{ item: null }` (200) — 404 ya da farklı hata mesajı DÖNMEZ ki "bu barkod
 * başka bir salonda kayıtlı" bilgisi sızmasın. Sadece okuma; RLS kapsamlı
 * istemci + açık `org_id` filtresi (çift kat izolasyon).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const code = normalizeScanned(req.nextUrl.searchParams.get("code"));
  if (!code) return NextResponse.json({ item: null });

  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, name, unit, category, current_stock, min_stock_alert, sale_price, barcode")
    .eq("org_id", member.org_id)
    .eq("barcode", code)
    .eq("is_active", true)
    .maybeSingle();

  return NextResponse.json({ item: item ?? null });
}
