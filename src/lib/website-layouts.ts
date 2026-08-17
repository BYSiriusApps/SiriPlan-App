/**
 * Randevu sayfası şablonları (organizations.website_layout).
 *
 * Renk paletiyle (website-palettes.ts) dik iki eksen: palet "hangi renkler",
 * şablon "hangi yerleşim" sorusunu cevaplar. İkisi serbestçe birleşir.
 */
export type WebsiteLayoutKey = "classic" | "showcase";

interface WebsiteLayout {
  label: string;
  /** Panelde şablon kartının altında görünen tek cümlelik açıklama. */
  description: string;
}

export const WEBSITE_LAYOUTS: Record<WebsiteLayoutKey, WebsiteLayout> = {
  classic: {
    label: "Klasik — Hızlı Randevu",
    description:
      "Ziyaretçi sayfayı açar açmaz randevu adımlarını görür. En az tıklamayla randevu almak isteyen salonlar için.",
  },
  showcase: {
    label: "Vitrin — Mini Web Sitesi",
    description:
      "Geniş kapak, büyük kategori kartları ve foto galerisi önce gelir; randevu formu altta, mobilde sabit buton ile. İşini görselle anlatan salonlar için.",
  },
};

/** Veritabanında bilinmeyen/eski bir değer varsa sayfa kırılmasın diye. */
export function resolveWebsiteLayout(value: string | null | undefined): WebsiteLayoutKey {
  return value === "showcase" ? "showcase" : "classic";
}
