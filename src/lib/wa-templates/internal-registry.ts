/**
 * Personel/sahibe giden bildirimler (yeni randevu/talep/kritik stok) için
 * Meta onaylı şablon kayıt defteri — MÜŞTERİYE giden şablonlardan
 * (registry.ts, WaPurpose) kasıtlı olarak AYRI:
 *
 *   - Parametreleri farklı (customer_name yerine service_name/staff_name da
 *     var), Ayarlar sayfasındaki stil seçicilere hiç girmiyor.
 *   - Müşteri şablonlarının aksine bunlar serbest metnin YEDEĞİ: Meta'da
 *     onaylı bir metaName yoksa `sendInternalTemplate` `false` döner ve
 *     çağıran taraf (notify.ts) otomatik olarak eski serbest-metin yoluna
 *     (whatsapp-notify.ts → yalnızca son 24 saatte yazışılmışsa teslim
 *     olur) düşer — davranış KIRILMAZ, yalnızca template onaylanınca
 *     iyileşir.
 *
 * Meta onayı alındığında yapılacak TEK şey: aşağıdaki metaName alanını
 * gerçek şablon adıyla doldurmak. Submit edilecek örnek gövde metinleri
 * için docs/GELISTIRME-LISTESI.md içindeki "WhatsApp personel bildirimi"
 * maddesine bakın.
 */

export type WaInternalPurpose = "yeni_randevu" | "yeni_talep" | "kritik_stok";

export interface WaInternalTemplateDef {
  purpose: WaInternalPurpose;
  /** Meta Business Manager'da onaylanan gerçek şablon adı. Onaylanana kadar null. */
  metaName: string | null;
  /** {{1}}..{{n}} sırasıyla gövde parametrelerinin kaynak anahtarları. */
  bodyParamOrder: string[];
}

export const WA_INTERNAL_TEMPLATES: Record<WaInternalPurpose, WaInternalTemplateDef> = {
  yeni_randevu: {
    purpose: "yeni_randevu",
    metaName: null,
    bodyParamOrder: ["business_name", "customer_name", "service_name", "staff_name", "date", "time"],
  },
  yeni_talep: {
    purpose: "yeni_talep",
    metaName: null,
    bodyParamOrder: ["business_name", "customer_name", "service_name", "staff_name", "date", "time"],
  },
  kritik_stok: {
    purpose: "kritik_stok",
    metaName: null,
    bodyParamOrder: ["business_name", "item_name", "current_stock", "unit"],
  },
};
