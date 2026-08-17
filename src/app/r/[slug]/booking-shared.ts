import type { Organization, Service, ServiceCategory, Staff } from "@/types/database";
import type { LanguageCode } from "@/lib/languages";

/**
 * /api/public/salon yanıtının istemcideki normalize edilmiş hâli.
 *
 * Veri TEK yerde (PublicBookingClient) çekilir ve buradan hem şablonlara hem de
 * randevu sihirbazına aynı nesne olarak geçer — iki şablonun aynı veriyi iki
 * farklı şekilde yorumlaması (ör. biri pasif hizmetleri göstermesi) mümkün olmasın.
 */
export interface SalonData {
  org: Organization;
  /** Online randevuya açık, aktif hizmetler — sihirbazın seçim listesi. */
  services: Service[];
  categories: ServiceCategory[];
  staff: Staff[];
  /** service_id -> o hizmete atanmış staff_id listesi (boşsa kısıtlama yok). */
  staffServiceMap: Record<string, string[]>;
  /** Hizmet/kategori adını ziyaretçinin diline çevirir — SADECE GÖSTERİM. */
  localizeName: (name?: string | null) => string;
  lang: LanguageCode;
}

export interface CategoryGroup {
  category: ServiceCategory;
  items: Service[];
  photos: NonNullable<ServiceCategory["service_category_photos"]>;
}

/** Kategorileri sırasıyla, altlarındaki hizmetlerle birlikte gruplar. */
export function buildCategoryGroups(
  categories: ServiceCategory[],
  services: Service[]
): CategoryGroup[] {
  return categories.map((category) => ({
    category,
    items: services.filter((s) => s.category_id === category.id),
    photos: [...(category.service_category_photos ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    ),
  }));
}

/**
 * Kategori kartında gösterilen "₺900'den başlayan" bilgisi.
 * Fiyatı olmayan (yalnızca vitrin) hizmetler hesaba katılmaz.
 */
export function minPrice(items: Service[]): number | null {
  const prices = items.map((s) => s.price).filter((p): p is number => p !== null && p !== undefined);
  return prices.length ? Math.min(...prices) : null;
}

/** Haftanın günleri — working_hours_json anahtar sırası (Pazartesi başlangıçlı). */
export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
