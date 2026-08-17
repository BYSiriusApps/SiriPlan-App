import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * PostgREST `.or(...)` / `.filter(...)` argümanına gömülecek serbest metni
 * temizler.
 *
 * `.or()` argümanı bir SQL değeri değil, PostgREST'in KENDİ filtre dilidir:
 * virgül yeni bir koşul, parantez gruplama, nokta ise operatör ayracıdır.
 * Kullanıcı girdisi ham gömüldüğünde ("PostgREST filtre enjeksiyonu") sorgunun
 * mantığı değiştirilebilir. `.eq()` gibi tek değerli çağrılarda bu sorun yoktur
 * — sadece filtre dilinin içine string kurulan yerlerde gerekir.
 *
 * Yaklaşım: arama kutusunda anlamı olmayan kontrol karakterleri atılır, sonuç
 * makul bir uzunlukla sınırlanır. Türkçe karakterler ve boşluk korunur.
 */
export function sanitizeFilterValue(input: string, maxLength = 60): string {
  return input
    .replace(/[,()*\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}
