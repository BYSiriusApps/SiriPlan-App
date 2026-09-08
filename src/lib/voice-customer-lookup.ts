/**
 * Sesli randevu girişinde SÖYLENEN müşteri adından kayıtlı müşteriyi bulur —
 * telefon (ve varsa e-posta) alanını otomatik doldurmak için.
 *
 * Neden ayrı bir yardımcı: `/api/customers?q=` araması PostgREST `ilike` ile
 * çalışıyor; ayrıştırıcının çıkardığı ad çoğu zaman Türkçe çekim ekli oluyor
 * ("Ayşe'ye", "Mehmet Aksoy'a"). Ham hâliyle sorgulanınca hiçbir kayıt
 * eşleşmiyordu. Burada ek/aksan temizlenip birebir ada öncelik verilerek,
 * belirsiz durumlarda (birden çok aday) hiç doldurmadan çıkılıyor.
 */

export interface LookedUpCustomer {
  full_name: string;
  phone: string;
  email?: string | null;
}

/** Türkçe küçük harf + aksan sadeleştirme + noktalama/kesme işareti temizliği. */
function normName(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/[‘’ʼ'`]/g, "")
    .replace(/İ/g, "i")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "mehmet aksoy'a" → ["mehmet", "aksoy"] (sondaki kesme işareti + çekim ekini at).
 * Konuşma tanıma yan yana tekrar ürettiğinde ("melike melike yılmaz") ardışık
 * yineleme atılır — yoksa arama sorgusu "melike melike" olup hiçbir kaydı bulmaz.
 */
function cleanTokens(spoken: string): string[] {
  const toks = normName(spoken)
    .split(" ")
    .map((t) => t.replace(/['‘’].*$/, ""))
    .filter((t) => t.length >= 2);
  return toks.filter((t, i) => i === 0 || t !== toks[i - 1]);
}

export async function lookupCustomerBySpokenName(
  spoken: string,
): Promise<LookedUpCustomer | null> {
  const tokens = cleanTokens(spoken);
  if (!tokens.length) return null;

  // Aramayı ilk 2 temiz kelimeyle yap — 3. kelimedeki çekim eki eşleşmeyi bozmasın.
  const query = tokens.slice(0, 2).join(" ");

  try {
    const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}&limit=8`);
    const json = await res.json();
    const list: LookedUpCustomer[] = (json.customers || []).filter(
      (c: LookedUpCustomer) => c && c.phone,
    );
    if (!list.length) return null;

    const key = tokens.join(" ");

    // 1) Birebir (normalize) ad eşleşmesi.
    const exact = list.filter((c) => normName(c.full_name) === key);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;

    // 2) Söylenen tüm kelimeler kayıtlı adın kelime kümesinde geçiyor.
    const subset = list.filter((c) => {
      const set = new Set(normName(c.full_name).split(" "));
      return tokens.every((t) => set.has(t));
    });
    if (subset.length === 1) return subset[0];
    if (subset.length > 1) return null;

    // 3) Tek aday döndüyse onu kullan; birden çoksa belirsiz → dokunma.
    return list.length === 1 ? list[0] : null;
  } catch {
    return null;
  }
}
