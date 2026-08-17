import { getCatalog } from "@/lib/services/catalog";
import type { CatalogLocale } from "@/lib/services/catalog-i18n";
import { isSupportedLanguage } from "@/lib/languages";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Yeni kaydolan işletmenin hizmet listesini, iş türüne uygun katalogdan otomatik
 * doldurur. İşletme sahibi sonradan tek tek eklemek yerine dolu bir listeyle
 * başlar; istemediklerini Hizmetler sayfasından kaldırabilir/güncelleyebilir.
 *
 * Hizmet adları kaydolurken seçili olan dilde yazılır (locale verilmezse Türkçe).
 * Kaydedildikten sonra ad serbest metindir — randevu akışı service_id üzerinden
 * ilerlediği için sonradan dil değiştirmek mevcut randevuları etkilemez.
 */
export async function seedDefaultServices(
  admin: SupabaseClient,
  orgId: string,
  businessType: string,
  locale?: string | null
): Promise<void> {
  const safeLocale: CatalogLocale = isSupportedLanguage(locale) ? locale : "tr";
  const catalog = getCatalog(businessType, safeLocale);
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
