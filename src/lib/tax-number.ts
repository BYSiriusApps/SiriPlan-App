/**
 * VKN / TCKN yardımcıları — işletme kaydında ve Ayarlar'da opsiyonel alan.
 *
 * VKN (Vergi Kimlik No): 10 hane
 * TCKN (TC Kimlik No):   11 hane, ilk hane 0 olamaz
 *
 * Alan zorunlu olmadığı için doğrulama kasten hoşgörülü tutuldu: yalnızca
 * uzunluk (ve TCKN'de baştaki sıfır) denetlenir, tam kontrol algoritması
 * uygulanmaz — amaç veri kalitesi, kapıda kullanıcı kaybetmek değil.
 */

export const TAX_NUMBER_MAX_LENGTH = 11;

/** Girilen metni saklama biçimine indirger: yalnızca rakam, en fazla 11 hane. */
export function normalizeTaxNumber(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/\D/g, "").slice(0, TAX_NUMBER_MAX_LENGTH);
}

/** Boş bırakılabilir; doluysa geçerli bir VKN/TCKN olmalı. */
export function isValidTaxNumber(digits: string): boolean {
  if (!digits) return true;
  if (digits.length === 10) return true;
  if (digits.length === 11) return digits[0] !== "0";
  return false;
}

export const TAX_NUMBER_ERROR =
  "VKN 10 haneli, TC Kimlik No 11 haneli olmalıdır.";
