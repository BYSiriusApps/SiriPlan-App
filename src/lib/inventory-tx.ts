/**
 * Stok hareketi kaydı — paylaşılan iş mantığı.
 *
 * Hem `/api/inventory/transactions` (elle "Giriş/Çıkış" modalı) hem de
 * `/api/ai/voice-booking` (sesli stok komutu) buradan geçer. Böylece:
 *  - `inventory_transactions` insert'i (DB trigger `tr_inventory_stock_tx`
 *    `current_stock`'u günceller),
 *  - gelir/gider tablosuna otomatik yansıma,
 *  - kritik stok eşiği geçiş kontrolü
 * tek yerde tutulur.
 *
 * NOT: Çağıran, org doğrulamasını (getActiveMember) yapmış olmalıdır. Verilen
 * `supabase` istemcisi ister RLS kapsamlı kullanıcı istemcisi ister admin
 * istemci olabilir — item ve insert'ler her durumda `orgId` ile sınırlanır.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyLowStock } from "@/lib/notify";

export type InventoryTxType = "in" | "out" | "adjust";

interface RecordTxInput {
  item_id: string;
  type: InventoryTxType;
  quantity: number;
  unit_price?: number | null;
  note?: string | null;
  appointment_id?: string | null;
  /** false verilirse kritik stok bildirimi (Telegram/WhatsApp) atlanır. Varsayılan: true. */
  notify?: boolean;
}

export interface RecordTxResult {
  ok: boolean;
  error?: string;
  transaction?: Record<string, unknown> | null;
  itemName?: string;
  unit?: string;
  stockBefore?: number;
  stockAfter?: number;
  minAlert?: number;
  /** Bu hareket ürünü ilk kez kritik sınırın altına düşürdü mü? */
  crossedLowThreshold?: boolean;
  /** Hareket sonrası stok kritik sınırda ya da altında mı? */
  lowStock?: boolean;
}

function computeAfter(type: InventoryTxType, before: number, qty: number): number {
  if (type === "in") return before + qty;
  if (type === "out") return Math.max(0, before - qty);
  return qty; // adjust → yeni mutlak değer
}

export async function recordInventoryTransaction(
  supabase: SupabaseClient,
  orgId: string,
  userId: string | null,
  input: RecordTxInput,
): Promise<RecordTxResult> {
  const { item_id, type, quantity, unit_price, note, appointment_id } = input;
  const qty = Number(quantity);

  if (!item_id || !type || !Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: "Eksik veya geçersiz parametre" };
  }

  const { data: item } = await supabase
    .from("inventory_items")
    .select("name, unit, current_stock, min_stock_alert, cost_price, sale_price")
    .eq("id", item_id)
    .eq("org_id", orgId)
    .single();

  if (!item) return { ok: false, error: "Ürün bulunamadı" };

  const stockBefore = Number(item.current_stock) || 0;
  const stockAfter = computeAfter(type, stockBefore, qty);
  const minAlert = Number(item.min_stock_alert) || 0;

  const fallbackPrice =
    type === "in" ? Number(item.cost_price || 0) : type === "out" ? Number(item.sale_price || 0) : null;
  const finalUnitPrice =
    unit_price !== undefined && unit_price !== null ? Number(unit_price) : fallbackPrice;

  const { data: tx, error } = await supabase
    .from("inventory_transactions")
    .insert({
      org_id: orgId,
      item_id,
      type,
      quantity: qty,
      unit_price: finalUnitPrice,
      note: note?.trim() || null,
      ...(appointment_id ? { appointment_id } : {}),
      ...(userId ? { user_id: userId } : {}),
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  // Gelir/gider tablosuna otomatik yansıma (elle modaldaki mevcut davranış).
  if ((type === "in" || type === "out") && finalUnitPrice !== null) {
    const finalAmount = qty * Number(finalUnitPrice);
    if (finalAmount > 0) {
      const expType = type === "in" ? "gider" : "gelir";
      const expCategory = type === "in" ? "malzeme" : "diger";
      const description =
        type === "in"
          ? `Stok Alımı: ${qty} ${item.unit || "adet"} ${item.name}`
          : `Stok Çıkışı: ${qty} ${item.unit || "adet"} ${item.name}`;
      await supabase.from("expenses").insert({
        org_id: orgId,
        type: expType,
        category: expCategory,
        amount: finalAmount,
        description,
        note: `Stok hareketi üzerinden otomatik oluşturuldu.${note ? " Not: " + note : ""}`,
        date: new Date().toISOString().split("T")[0],
        payment_method: "nakit",
        ...(userId ? { created_by: userId } : {}),
      });
    }
  }

  const crossedLowThreshold = minAlert > 0 && stockBefore > minAlert && stockAfter <= minAlert;
  const lowStock = minAlert > 0 && stockAfter <= minAlert;

  if (crossedLowThreshold && input.notify !== false) {
    // Bildirim hatası stok akışını engellememeli.
    await notifyLowStock(orgId, {
      name: item.name,
      current_stock: stockAfter,
      min_stock_alert: minAlert,
      unit: item.unit || "adet",
    }).catch(() => {});
  }

  return {
    ok: true,
    transaction: tx,
    itemName: item.name,
    unit: item.unit || "adet",
    stockBefore,
    stockAfter,
    minAlert,
    crossedLowThreshold,
    lowStock,
  };
}
