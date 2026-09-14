import { seriesDelta } from "@/lib/report-trends";

/**
 * Bağımlılıksız inline-SVG trend grafiği — hem server (raporlar) hem client
 * (gelir-gider) component'lerinde kullanılabilir. Renk aktif organizasyon
 * temasından gelir (`var(--primary)`), yazdırmada sabit gül tonuna düşer.
 *
 * dashboard/page.tsx içindeki `Sparkline`'ın genelleştirilmiş hâli:
 * negatif değer (net kâr/zarar), bar/line varyantı, dönemsel % rozeti ekler.
 *
 * Her noktanın tarihi grafiğin altında (x ekseni), tutarı ise grafiğin
 * hemen altındaki dökümde her zaman görünür yazılır — sadece hover
 * tooltip'ine (<title>) bırakılmaz, çünkü dokunmatik/PDF'te hover yoktur.
 */

export type TrendPoint = { label: string; value: number };

const PRINT_FALLBACK = "#e11d48"; // globals.css --primary ile uyumlu

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
            return (
              <rect
                key={i}
                x={bx}
                y={top}
                width={bw}
                height={bh}
                rx="2"
                fill={PRINT_FALLBACK}
                style={{ fill: "currentColor" }}
                fillOpacity={p.value < 0 ? 0.45 : 0.85}
              >
                <title>{`${p.label}: ${format(p.value)}`}</title>
              </rect>
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
            {series.map((p, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={i === series.length - 1 ? 4 : 2.5}
                fill={PRINT_FALLBACK}
                style={{ fill: "currentColor" }}
                fillOpacity={i === series.length - 1 ? 1 : 0.55}
              >
                <title>{`${p.label}: ${format(p.value)}`}</title>
              </circle>
            ))}
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
              fillOpacity="0.6"
            >
              {p.label}
            </text>
          ) : null
        )}
      </svg>

      {/* Değer dökümü — her noktanın tarihi + tutarı her zaman okunur (hover'a bağlı değil) */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((p, i) => (
          <span key={i} className="text-[10px] tabular-nums whitespace-nowrap">
            <span className="text-muted-foreground">{p.label}</span>{" "}
            <span className="font-semibold">{format(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
