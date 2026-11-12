import { palette } from "../lib/palette";

export interface IntervalItem {
  label: string;
  /** The point estimate, drawn as a dot. */
  value: number;
  low: number;
  high: number;
}

interface IntervalPlotProps {
  items: IntervalItem[];
  /** Vertical reference line, for example 1 for odds ratios or 1.33 for Cpk. */
  referenceValue?: number;
  referenceLabel?: string;
  xLabel: string;
  logScale?: boolean;
  valueFormat?: (value: number) => string;
  ariaLabel: string;
}

const width = 640;
const rowHeight = 38;
const leftPadding = 190;
const rightPadding = 40;
const topPadding = 24;
const bottomPadding = 44;

/** Draws a horizontal dot-and-interval chart in SVG. Each row shows an estimate and its range. */
export function IntervalPlot({
  items,
  referenceValue,
  referenceLabel,
  xLabel,
  logScale = false,
  valueFormat = (value) => value.toFixed(2),
  ariaLabel,
}: IntervalPlotProps) {
  const height = topPadding + items.length * rowHeight + bottomPadding;
  const plotWidth = width - leftPadding - rightPadding;
  const transform = (value: number) => (logScale ? Math.log(Math.max(value, 1e-9)) : value);

  const allValues = items.flatMap((item) => [item.low, item.high, item.value]).filter(Number.isFinite);
  if (referenceValue !== undefined) allValues.push(referenceValue);
  const lowest = transform(Math.min(...allValues));
  const highest = transform(Math.max(...allValues));
  const padding = (highest - lowest) * 0.08 || 0.5;
  const domainLow = lowest - padding;
  const domainHigh = highest + padding;
  const scale = (value: number) => leftPadding + ((transform(value) - domainLow) / (domainHigh - domainLow)) * plotWidth;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const transformed = domainLow + fraction * (domainHigh - domainLow);
    const value = logScale ? Math.exp(transformed) : transformed;
    return { value, x: leftPadding + fraction * plotWidth };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="interval-plot">
      {ticks.map((tick) => (
        <g key={tick.x}>
          <line x1={tick.x} x2={tick.x} y1={topPadding - 6} y2={height - bottomPadding} stroke={palette.grid} />
          <text x={tick.x} y={height - bottomPadding + 18} textAnchor="middle" className="svg-tick">
            {valueFormat(tick.value)}
          </text>
        </g>
      ))}

      {referenceValue !== undefined && (
        <g>
          <line
            x1={scale(referenceValue)}
            x2={scale(referenceValue)}
            y1={topPadding - 6}
            y2={height - bottomPadding}
            stroke={palette.bad}
            strokeDasharray="5 4"
          />
          {referenceLabel && (
            <text x={scale(referenceValue) - 6} y={topPadding - 10} textAnchor="end" className="svg-note" fill={palette.bad}>
              {referenceLabel}
            </text>
          )}
        </g>
      )}

      {items.map((item, index) => {
        const y = topPadding + index * rowHeight + rowHeight / 2;
        const lowX = scale(item.low);
        const highX = scale(item.high);
        const valueX = scale(item.value);
        return (
          <g key={item.label}>
            <text x={leftPadding - 12} y={y + 4} textAnchor="end" className="svg-label">
              {item.label}
            </text>
            <line x1={lowX} x2={highX} y1={y} y2={y} stroke={palette.accent} strokeWidth={3} strokeLinecap="round" opacity={0.55} />
            <line x1={lowX} x2={lowX} y1={y - 6} y2={y + 6} stroke={palette.accent} strokeWidth={2} />
            <line x1={highX} x2={highX} y1={y - 6} y2={y + 6} stroke={palette.accent} strokeWidth={2} />
            <circle cx={valueX} cy={y} r={5.5} fill={palette.accent} style={{ stroke: "var(--surface)" }} strokeWidth={2}>
              <title>
                {item.label}: {valueFormat(item.value)} (range {valueFormat(item.low)} to {valueFormat(item.high)})
              </title>
            </circle>
          </g>
        );
      })}

      <text x={leftPadding + plotWidth / 2} y={height - 8} textAnchor="middle" className="svg-axis-label">
        {xLabel}
      </text>
    </svg>
  );
}
