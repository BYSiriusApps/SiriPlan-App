/**
 * WhatsApp mesaj kotası DÖNEMİ: takvim ayı değil, abonelik BAŞLANGIÇ (çıpa) tarihinin aylık yıldönümü.
 * Saf fonksiyonlar (sunucu bağımlılığı yok) — birim testi kolay, istemciye de import edilebilir.
 *
 *  - anchor = Stripe billing_cycle_anchor (yükseltmede "şimdi"ye kayar) ya da deneme başlangıcı.
 *  - Yıllık planda da kota AYLIK yenilenir (anchor + k ay).
 *  - Ay sonu taşması kıstırılır: 31 Ocak çıpası → 28/29 Şubat → 31 Mart (çıpa gününe geri döner).
 *  - anchor yoksa ya da gelecekteyse takvim ayına düşülür (eski davranış).
 */

export interface WaCycle {
  /** Dönem başlangıcı (an). */
  start: Date;
  /** Bir sonraki yenilenme (dönem sonu, hariç). */
  end: Date;
  /** SQL `period` anahtarı: dönem başlangıcının UTC tarihi (YYYY-MM-DD). */
  key: string;
  /** Çıpa mı, takvim ayı mı kullanıldı. */
  source: "anchor" | "calendar";
}

/** Çıpanın saatini koruyarak `months` ay ekler; hedef ayda çıpa günü yoksa ayın son gününe kıstırır. */
export function addMonthsClamped(anchor: Date, months: number): Date {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(anchor.getUTCDate(), lastDay);
  return new Date(
    Date.UTC(y, m, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds())
  );
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function calendarCycle(now: Date): WaCycle {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, key: ymd(start), source: "calendar" };
}

export function computeWaCycle(anchor: Date | null | undefined, now: Date = new Date()): WaCycle {
  if (!anchor || Number.isNaN(anchor.getTime()) || anchor.getTime() > now.getTime()) return calendarCycle(now);

  let k = (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (now.getUTCMonth() - anchor.getUTCMonth());
  if (k < 0) k = 0;
  let start = addMonthsClamped(anchor, k);
  // Aynı ay içinde yıldönümü henüz gelmediyse bir önceki aya dön.
  while (start.getTime() > now.getTime() && k > 0) {
    k -= 1;
    start = addMonthsClamped(anchor, k);
  }
  const end = addMonthsClamped(anchor, k + 1);
  return { start, end, key: ymd(start), source: "anchor" };
}
