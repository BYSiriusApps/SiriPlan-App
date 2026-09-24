/**
 * Rapor / gelir-gider ekranlarında dönemsel değişim (trend) hesapları.
 * Saf fonksiyonlar — hem server component'lerde hem client'ta kullanılabilir.
 */

export type TrendDir = "up" | "down" | "flat";

/**
 * Yüzde değişim: önceki dönem 0 (veya negatif) ise anlamlı oran yok → null.
 * ((current - previous) / previous) * 100
 */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Yüzde değişimi tr-TR biçiminde metne çevirir: "+%12,4" / "-%3,1" / "—".
 * dir eşiği ±0,05 puan — çok küçük oynamalar "flat" sayılır.
 */
export function formatPct(pct: number | null): { text: string; dir: TrendDir } {
  if (pct === null || !Number.isFinite(pct)) return { text: "—", dir: "flat" };
  const dir: TrendDir = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  const abs = Math.abs(pct).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return { text: `${sign}%${abs}`, dir };
}

/** İki dönem karşılaştırması — kart satırları için hazır paket. */
export function compareValue(current: number, previous: number) {
  const pct = pctChange(current, previous);
  return { current, previous, pct, ...formatPct(pct) };
}

export type MonthlyPoint = {
  label: string;
  gelir: number;
  gider: number;
  net: number;
  /** Bir önceki aya göre net değişim yüzdesi (ilk ay için null). */
  deltaPct: number | null;
};

/**
 * Aylık gelir/gider dizilerinden (eski → yeni sıralı) trend serisi üretir.
 * labels, gelir, gider aynı uzunlukta olmalı.
 */
export function buildMonthlySeries(
  labels: string[],
  gelir: number[],
  gider: number[],
): MonthlyPoint[] {
  return labels.map((label, i) => {
    const g = gelir[i] ?? 0;
    const e = gider[i] ?? 0;
    const net = g - e;
    const prevNet = i > 0 ? (gelir[i - 1] ?? 0) - (gider[i - 1] ?? 0) : 0;
    return { label, gelir: g, gider: e, net, deltaPct: i > 0 ? pctChange(net, prevNet) : null };
  });
}

/** Dizinin ilk → son değeri arasındaki yüzde değişim (grafik rozeti için). */
export function seriesDelta(values: number[]): { text: string; dir: TrendDir } {
  if (values.length < 2) return { text: "—", dir: "flat" };
  return formatPct(pctChange(values[values.length - 1], values[0]));
}
