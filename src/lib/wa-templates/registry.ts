/**
 * Meta WhatsApp Business Cloud API onaylı şablon kayıt defteri.
 *
 * Her amaç (onay/iptal/hatırlatma/revize) için Meta Business Manager'da
 * gerçekten onaylı TEK şablon kullanılır — isimler burada Meta'daki
 * kayıtlı şablon adlarıyla birebir eşleşmeli (bkz. WhatsApp Yöneticisi →
 * Mesaj şablonları). Stil seçimi (sicak/kısa/detaylı/hizmetli) ve
 * statik/dinamik buton varyantları için henüz onaylı şablon yok; bu
 * yüzden her amacın tek stili vardır. Yeni stiller Meta'da onaylandıkça
 * buraya eklenebilir.
 */

export type WaPurpose = "onay" | "iptal" | "revize" | "hatirlatma";
export type WaStyle = "sicak";

export type WaParamSource =
  | "customer_name"
  | "business_name"
  | "date"
  | "time"
  | "new_date"
  | "new_time"
  | "business_phone"
  | "location_link";

export interface WaTemplateDef {
  key: string;
  purpose: WaPurpose;
  style: WaStyle;
  /** Meta'da kayıtlı gerçek şablon adı. */
  metaName: string;
  /** {{1}}..{{n}} sırasıyla gövde parametrelerinin kaynağı. */
  bodyParamOrder: WaParamSource[];
}

export const WA_TEMPLATES: Record<string, WaTemplateDef> = {
  onay_sicak: {
    key: "onay_sicak",
    purpose: "onay",
    style: "sicak",
    metaName: "randevu_onayi_1",
    bodyParamOrder: ["customer_name", "business_name", "date", "time", "business_phone", "location_link"],
  },
  iptal_sicak: {
    key: "iptal_sicak",
    purpose: "iptal",
    style: "sicak",
    metaName: "randevu_iptali",
    bodyParamOrder: ["customer_name", "business_name", "date", "time"],
  },
  revize_sicak: {
    key: "revize_sicak",
    purpose: "revize",
    style: "sicak",
    metaName: "randevu_revize",
    // NOT: location_link BİLEREK eklenmedi — Meta'daki "randevu_revize" şablonu
    // henüz konum yer tutucusuyla onaylanmadı (bkz. hatirlatma_sicak notu, aynı risk).
    // Meta'da şablon 5 parametreye güncellenip onaylandıktan SONRA buraya
    // "location_link" eklenmeli, aksi halde TÜM revize mesajları 132000 hatasıyla başarısız olur.
    bodyParamOrder: ["customer_name", "business_name", "new_date", "new_time"],
  },
  hatirlatma_sicak: {
    key: "hatirlatma_sicak",
    purpose: "hatirlatma",
    style: "sicak",
    metaName: "randevu_hatirlatma",
    // NOT: location_link BİLEREK eklenmedi — canlıda denendi, Meta 132000 hatası
    // verdi ("randevu_hatirlatma" şablonu hâlâ 4 parametreli, 5 değil). Meta'da
    // şablon konum yer tutucusuyla güncellenip ONAYLANDIKTAN SONRA buraya
    // "location_link" eklenmeli.
    bodyParamOrder: ["customer_name", "business_name", "date", "time"],
  },
};

/** Bir amaç için hangi stiller mevcut — Ayarlar sayfasındaki dropdown'ları besler. */
export const STYLES_BY_PURPOSE: Record<WaPurpose, WaStyle[]> = {
  onay: ["sicak"],
  iptal: ["sicak"],
  revize: ["sicak"],
  hatirlatma: ["sicak"],
};

export function resolveTemplate(purpose: WaPurpose, style: WaStyle): WaTemplateDef | undefined {
  return WA_TEMPLATES[`${purpose}_${style}`];
}

export const DEFAULT_WA_TEMPLATE_STYLES: Record<WaPurpose, WaStyle> = {
  onay: "sicak",
  iptal: "sicak",
  revize: "sicak",
  hatirlatma: "sicak",
};

export const WA_REMINDER_OFFSET_PRESETS = [1, 2, 3, 6, 24] as const;
