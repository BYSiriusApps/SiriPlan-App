import { SERVICE_CATALOG } from "@/lib/services/catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Yeni kaydolan işletmenin hizmet listesini, iş türüne uygun katalogdan otomatik
 * doldurur. İşletme sahibi sonradan tek tek eklemek yerine dolu bir listeyle
 * başlar; istemediklerini Hizmetler sayfasından kaldırabilir/güncelleyebilir.
 */
export async function seedDefaultServices(
  admin: SupabaseClient,
  orgId: string,
  businessType: string
): Promise<void> {
  const catalog = SERVICE_CATALOG[businessType] || SERVICE_CATALOG["kuafor"];
  if (!catalog) return;

  const rows = catalog.flatMap((cat) =>
    cat.services.map((svc) => ({
      org_id: orgId,
      name: svc.name,
      duration_minutes: svc.duration,
      price: svc.price,
      category_tag: svc.category,
      contributes_loyalty: true,
      is_active: true,
    }))
  );

  if (rows.length === 0) return;
  await admin.from("services").insert(rows);
}
