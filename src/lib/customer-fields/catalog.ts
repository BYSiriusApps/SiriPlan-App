export type CustomFieldType = "text" | "number" | "select" | "date";

export type BadgeColor = "green" | "amber" | "red" | "blue" | "slate";

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: BadgeColor;
}

export interface CustomFieldDef {
  /** customers.custom_fields[key] veya customer_metrics.metric_key */
  key: string;
  label: string;
  type: CustomFieldType;
  /** Küçük emoji ikon, kart/rozet başında gösterilir. */
  icon?: string;
  /** number tipi için birim, örn. "kg". */
  unit?: string;
  /** select tipi için seçenekler. */
  options?: CustomFieldOption[];
  /**
   * true ise bu alan customers.custom_fields'ta değil, customer_metrics
   * tablosunda zaman serisi olarak tutulur (örn. kilo takibi) ve
   * müşteri kartında en son değer + bir öncekine göre değişim rozeti
   * gösterilir.
   */
  trackHistory?: boolean;
}

const STATUS_TAKIP_KONTROL: CustomFieldOption[] = [
  { value: "takipte", label: "Takipte", color: "green" },
  { value: "kontrol_gerekli", label: "Kontrol Gerekiyor", color: "amber" },
  { value: "tamamlandi", label: "Tamamlandı", color: "slate" },
];

export const CUSTOMER_FIELD_CATALOG: Record<string, CustomFieldDef[]> = {
  diyetisyen: [
    { key: "weight", label: "Kilo", type: "number", unit: "kg", icon: "⚖️", trackHistory: true },
    { key: "target_weight", label: "Hedef Kilo", type: "number", unit: "kg", icon: "🎯" },
    { key: "program", label: "Program", type: "text", icon: "📋" },
    { key: "status", label: "Durum", type: "select", icon: "🩺", options: STATUS_TAKIP_KONTROL },
  ],
  estetik: [
    { key: "diagnosis", label: "Tanı / Muayene Notu", type: "text", icon: "📝" },
    { key: "status", label: "Durum", type: "select", icon: "🩺", options: STATUS_TAKIP_KONTROL },
  ],
  kas_kirpik: [
    { key: "diagnosis", label: "Tanı / Muayene Notu", type: "text", icon: "📝" },
    { key: "status", label: "Durum", type: "select", icon: "🩺", options: STATUS_TAKIP_KONTROL },
  ],
  pet_kuafor: [
    { key: "pet_name", label: "Evcil Hayvan Adı", type: "text", icon: "🐾" },
    {
      key: "species",
      label: "Tür",
      type: "select",
      icon: "🐕",
      options: [
        { value: "kopek", label: "Köpek" },
        { value: "kedi", label: "Kedi" },
        { value: "diger", label: "Diğer" },
      ],
    },
    { key: "breed", label: "Cins", type: "text" },
    { key: "last_vaccine", label: "Son Aşı Tarihi", type: "date", icon: "💉" },
    { key: "weight", label: "Kilo", type: "number", unit: "kg", icon: "⚖️", trackHistory: true },
    {
      key: "status",
      label: "Durum",
      type: "select",
      icon: "🐾",
      options: [
        { value: "sadik", label: "Sadık Müşteri", color: "green" },
        { value: "hassas", label: "Hassas Tüy/Cilt", color: "amber" },
        { value: "kontrol_gerekli", label: "Kontrol Gerekiyor", color: "red" },
      ],
    },
  ],
  spa: [
    {
      key: "membership",
      label: "Üyelik Tipi",
      type: "select",
      icon: "💳",
      options: [
        { value: "standart", label: "Standart" },
        { value: "premium", label: "Premium", color: "blue" },
      ],
    },
    { key: "skin_type", label: "Cilt/Vücut Tipi", type: "text", icon: "🧴" },
    { key: "status", label: "Durum", type: "select", icon: "💆", options: STATUS_TAKIP_KONTROL },
  ],
  nail: [
    { key: "allergy", label: "Alerji / Hassasiyet Notu", type: "text", icon: "⚠️" },
    { key: "preferred_style", label: "Tercih Edilen Stil", type: "text", icon: "💅" },
    { key: "status", label: "Durum", type: "select", icon: "💅", options: STATUS_TAKIP_KONTROL },
  ],
  default: [
    { key: "status", label: "Durum", type: "select", icon: "📌", options: STATUS_TAKIP_KONTROL },
  ],
};

export function getFieldCatalog(businessType: string | null | undefined): CustomFieldDef[] {
  if (!businessType) return CUSTOMER_FIELD_CATALOG.default;
  return CUSTOMER_FIELD_CATALOG[businessType] ?? CUSTOMER_FIELD_CATALOG.default;
}

export function getFieldDef(
  businessType: string | null | undefined,
  key: string,
): CustomFieldDef | undefined {
  return getFieldCatalog(businessType).find((f) => f.key === key);
}

export function getTrackableMetricKeys(businessType: string | null | undefined): string[] {
  return getFieldCatalog(businessType)
    .filter((f) => f.trackHistory)
    .map((f) => f.key);
}

export const BADGE_COLOR_CLASS: Record<BadgeColor, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  amber: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  slate: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
};
