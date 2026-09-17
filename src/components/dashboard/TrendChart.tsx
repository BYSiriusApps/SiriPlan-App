import { seriesDelta } from "@/lib/report-trends";

/**
 * Bağımlılıksız inline-SVG trend grafiği — hem server (raporlar) hem client
 * (gelir-gider) component'lerinde kullanılabilir. Renk aktif organizasyon
 * temasından gelir (`var(--primary)`), yazdırmada sabit gül tonuna düşer.
 *
 * dashboard/page.tsx içindeki `Sparkline`'ın genelleştirilmiş hâli:
 * negatif değer (net kâr/zarar), bar/line varyantı, dönemsel % rozeti ekler.
 *
 * Bar varyantı yalnızca en iyi (ve varsa negatifse en kötü) noktayı canlı
 * renk + glow ile öne çıkarır, diğerleri soluk gridir — pazarlama
 * materyallerindeki "en iyi gün" grafik stiliyle tutarlı.
 *
 * Her noktanın tarihi grafiğin altında (x ekseni), tutarı ise grafiğin
 * hemen altındaki dökümde her zaman görünür yazılır — sadece hover
 * tooltip'ine (<title>) bırakılmaz, çünkü dokunmatik/PDF'te hover yoktur.
 */

export type TrendPoint = { label: string; value: number };

const PRINT_FALLBACK = "#e11d48"; // globals.css --primary ile uyumlu
const MUTED_FALLBACK = "#9ca3af"; // gray-400 — yazdırmada currentColor düşmezse
const LOSS_FALLBACK = "#ef4444"; // red-500

// Yalnızca baz çizgiden uzak olan köşeleri yuvarlar (pozitif değerde üst,
// negatif değerde alt) — dikey çubuk baz çizgisine "oturmuş" görünür.
function barPath(x: number, yTop: number, w: number, h: number, r: number, roundTop: boolean) {
  const rad = Math.max(0, Math.min(r, w / 2, h));
  if (h <= 0) return "";
  if (roundTop) {
    return `M${x},${yTop + h} L${x},${yTop + rad} Q${x},${yTop} ${x + rad},${yTop} L${x + w - rad},${yTop} Q${x + w},${yTop} ${x + w},${yTop + rad} L${x + w},${yTop + h} Z`;
  }
  return `M${x},${yTop} L${x + w},${yTop} L${x + w},${yTop + h - rad} Q${x + w},${yTop + h} ${x + w - rad},${yTop + h} L${x + rad},${yTop + h} Q${x},${yTop + h} ${x},${yTop + h - rad} Z`;
}

export function TrendChart({
  series,
  variant = "line",
  format = (n) => n.toLocaleString("tr-TR"),
  height = 120,
  showDelta = true,
  className,
}: {
  series: TrendPoint[];
  variant?: "line" | "bar";
  format?: (n: number) => string;
  height?: number;
  showDelta?: boolean;
  className?: string;
}) {
  if (series.length < 2) {
    return (
      <p className={`text-xs text-muted-foreground text-center py-6 ${className ?? ""}`}>
        Grafik için yeterli veri yok
      </p>
    );
  }

  const W = Math.max(320, series.length * 42);
  const chartH = height;
  const topPad = 8;
  const bottomPad = 26; // x ekseni (tarih) etiketleri için
  const H = topPad + chartH + bottomPad;
  const padX = 12;
  const values = series.map((p) => p.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const x = (i: number) => padX + (i / (series.length - 1)) * (W - padX * 2);
  const y = (v: number) => topPad + (1 - (v - min) / span) * chartH;
  const zeroY = y(0);
  const axisY = topPad + chartH;

  const uid = `tc-${variant}-${series.length}-${Math.round(max)}`;
  const delta = seriesDelta(values);
  const deltaColor =
    delta.dir === "up" ? "text-emerald-600" : delta.dir === "down" ? "text-red-600" : "text-muted-foreground";

  const linePts = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  // Çok noktalı serilerde tarih etiketleri üst üste binmesin diye her 2. etiket gösterilir.
  const labelStep = series.length > 8 ? 2 : 1;

  // En iyi (en yüksek) nokta her zaman öne çıkar; seri negatife düşüyorsa
  // en kötü (en düşük) nokta da ayrı bir renkle işaretlenir.
  const bestIdx = values.indexOf(max);
  const worstIdx = min < 0 ? values.indexOf(min) : -1;

  return (
    <div className={className}>
      {showDelta && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">
            {series[0].label} → {series[series.length - 1].label}
          </span>
          <span className={`text-xs font-semibold tabular-nums ${deltaColor}`}>
            {delta.dir === "up" ? "▲" : delta.dir === "down" ? "▼" : "▬"} {delta.text}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible text-primary"
        style={{ height: H }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Dönemsel değişim grafiği"
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.78" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* taban çizgisi (x ekseni) */}
        <line x1={padX} x2={W - padX} y1={axisY} y2={axisY} stroke="currentColor" strokeOpacity="0.15" />
        {/* sıfır çizgisi (negatif değer varsa görünür, tabandan ayrıysa) */}
        {min < 0 && (
          <line
            x1={padX}
            x2={W - padX}
            y1={zeroY}
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="3 3"
          />
        )}

        {variant === "bar" ? (
          series.map((p, i) => {
            const bw = ((W - padX * 2) / series.length) * 0.6;
            const bx = x(i) - bw / 2;
            const top = Math.min(y(p.value), zeroY);
            const bh = Math.max(2, Math.abs(y(p.value) - zeroY));
            const isBest = i === bestIdx && max > 0;
            const isWorst = i === worstIdx;
            const d = barPath(bx, top, bw, bh, 5, p.value >= 0);
            return (
              <path
                key={i}
                d={d}
                fill={isWorst ? LOSS_FALLBACK : isBest ? PRINT_FALLBACK : MUTED_FALLBACK}
                style={{
                  fill: isWorst ? "#ef4444" : isBest ? `url(#${uid}-bar)` : "currentColor",
                  color: isBest || isWorst ? undefined : "var(--muted-foreground)",
                }}
                fillOpacity={isBest || isWorst ? 1 : 0.32}
                filter={isBest || isWorst ? `url(#${uid}-glow)` : undefined}
              >
                <title>{`${p.label}: ${format(p.value)}`}</title>
              </path>
            );
          })
        ) : (
          <>
            <polygon points={`${padX},${zeroY} ${linePts} ${W - padX},${zeroY}`} fill={`url(#${uid})`} />
            <polyline
              points={linePts}
              fill="none"
              stroke={PRINT_FALLBACK}
              style={{ stroke: "currentColor" }}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {series.map((p, i) => {
              const isBest = i === bestIdx && max > 0;
              const isEnd = i === series.length - 1;
              return (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(p.value)}
                  r={isBest ? 5 : isEnd ? 4 : 2.5}
                  fill={PRINT_FALLBACK}
                  style={{ fill: "currentColor" }}
                  fillOpacity={isBest || isEnd ? 1 : 0.55}
                  filter={isBest ? `url(#${uid}-glow)` : undefined}
                >
                  <title>{`${p.label}: ${format(p.value)}`}</title>
                </circle>
              );
            })}
          </>
        )}

        {/* x ekseni — her noktanın tarih/ay etiketi, grafiğin altında sabit yazı */}
        {series.map((p, i) =>
          i % labelStep === 0 || i === series.length - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              fontSize="8"
              textAnchor="middle"
              fill="currentColor"
              fillOpacity={i === bestIdx ? 0.95 : 0.6}
              fontWeight={i === bestIdx ? 700 : 400}
            >
              {p.label}
            </text>
          ) : null
        )}
      </svg>

      {/* Değer dökümü — her noktanın tarihi + tutarı her zaman okunur (hover'a bağlı değil) */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((p, i) => (
          <span
            key={i}
            className={`text-[10px] tabular-nums whitespace-nowrap ${i === bestIdx ? "font-bold text-primary" : i === worstIdx ? "font-semibold text-red-600" : ""}`}
          >
            <span className={i === bestIdx || i === worstIdx ? "" : "text-muted-foreground"}>{p.label}</span>{" "}
            <span className="font-semibold">{format(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
