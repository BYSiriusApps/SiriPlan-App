/**
 * Meta WhatsApp Business Cloud API onaylı şablon kayıt defteri.
 *
 * Buton tipi (statik/dinamik URL) onay sonrası Meta'da değiştirilemediği
 * için her stil İKİ ayrı Meta şablonu olarak kayıtlıdır: randevu_{stil}_statik
 * ve randevu_{stil}_dinamik. Hangi varyantın kullanılacağı organizations.plan'a
 * göre otomatik seçilir (bkz. buttonVariantForPlan) — işletme ayrıca seçmez.
 *
 * Bu dosya sadece kod-tarafı eşleme yapar; şablonların kendisi Meta Template
 * Library'de sahibi tarafından manuel onaya gönderilir/onaylanır.
 */

import type { OrgPlan } from "@/types/database";

export type WaPurpose = "onay" | "iptal" | "revize" | "hatirlatma";
export type WaStyle = "sicak" | "kisa" | "detayli" | "hizmetli";
export type WaButtonVariant = "statik" | "dinamik";

export type WaParamSource =
  | "customer_name"
  | "business_name"
  | "date"
  | "time"
  | "new_date"
  | "new_time"
  | "service_name"
  | "appointment_no"
  | "cancel_no"
  | "remaining_time"
  | "business_phone";

export interface WaTemplateDef {
  key: string;
  purpose: WaPurpose;
  style: WaStyle;
  /** Meta'da kayıtlı gerçek şablon adını üretir (statik/dinamik varyant). */
  metaName: (btn: WaButtonVariant) => string;
  /** {{1}}..{{n}} sırasıyla gövde parametrelerinin kaynağı. */
  bodyParamOrder: WaParamSource[];
}

function nameFor(base: string) {
  return (btn: WaButtonVariant) => `${base}_${btn}`;
}

export const WA_TEMPLATES: Record<string, WaTemplateDef> = {
  onay_sicak: {
    key: "onay_sicak",
    purpose: "onay",
    style: "sicak",
    metaName: nameFor("randevu_onayi_sicak"),
    bodyParamOrder: ["customer_name", "business_name", "date", "time", "business_phone"],
  },
  onay_kisa: {
    key: "onay_kisa",
    purpose: "onay",
    style: "kisa",
    metaName: nameFor("randevu_onayi_kisa"),
    bodyParamOrder: ["customer_name", "business_name", "date", "time", "business_phone"],
  },
  onay_detayli: {
    key: "onay_detayli",
    purpose: "onay",
    style: "detayli",
    metaName: nameFor("randevu_onayi_detayli"),
    bodyParamOrder: ["customer_name", "business_name", "date", "time", "appointment_no", "business_phone"],
  },
  onay_hizmetli: {
    key: "onay_hizmetli",
    purpose: "onay",
    style: "hizmetli",
    metaName: nameFor("randevu_onayi_hizmetli"),
    bodyParamOrder: ["customer_name", "business_name", "service_name", "date", "time", "business_phone"],
  },
  iptal_sicak: {
    key: "iptal_sicak",
    purpose: "iptal",
    style: "sicak",
    metaName: nameFor("randevu_iptal_sicak"),
    bodyParamOrder: ["customer_name", "business_name", "date", "time", "business_phone"],
  },
  iptal_detayli: {
    key: "iptal_detayli",
    purpose: "iptal",
    style: "detayli",
    metaName: nameFor("randevu_iptal_detayli"),
    bodyParamOrder: ["customer_name", "business_name", "date", "time", "cancel_no", "business_phone"],
  },
  revize_sicak: {
    key: "revize_sicak",
    purpose: "revize",
    style: "sicak",
    metaName: nameFor("randevu_revize_sicak"),
    bodyParamOrder: ["customer_name", "business_name", "new_date", "new_time", "business_phone"],
  },
  revize_detayli: {
    key: "revize_detayli",
    purpose: "revize",
    style: "detayli",
    metaName: nameFor("randevu_revize_detayli"),
    bodyParamOrder: ["customer_name", "business_name", "new_date", "new_time", "appointment_no", "business_phone"],
  },
  hatirlatma_sicak: {
    key: "hatirlatma_sicak",
    purpose: "hatirlatma",
    style: "sicak",
    metaName: nameFor("randevu_hatirlatma_sicak"),
    bodyParamOrder: ["customer_name", "business_name", "remaining_time", "date", "time", "business_phone"],
  },
};

/** Bir amaç için hangi stiller mevcut — Ayarlar sayfasındaki dropdown'ları besler. */
export const STYLES_BY_PURPOSE: Record<WaPurpose, WaStyle[]> = {
  onay: ["sicak", "kisa", "detayli", "hizmetli"],
  iptal: ["sicak", "detayli"],
  revize: ["sicak", "detayli"],
  hatirlatma: ["sicak"],
};

export function resolveTemplate(purpose: WaPurpose, style: WaStyle): WaTemplateDef | undefined {
  return WA_TEMPLATES[`${purpose}_${style}`];
}

/** trial/starter → statik buton, pro/business → dinamik buton (randevu detay linki). */
export function buttonVariantForPlan(plan: OrgPlan): WaButtonVariant {
  return plan === "pro" || plan === "business" ? "dinamik" : "statik";
}

export const DEFAULT_WA_TEMPLATE_STYLES: Record<WaPurpose, WaStyle> = {
  onay: "sicak",
  iptal: "sicak",
  revize: "sicak",
  hatirlatma: "sicak",
};

export const WA_REMINDER_OFFSET_PRESETS = [1, 2, 3, 6, 24] as const;
