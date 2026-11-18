import type { ReactNode } from "react";
import { Area as RArea, AreaChart, Bar, BarChart, Cell, ComposedChart, LabelList, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { palette } from "../lib/palette";
import "../styles/executive.css";

export type Tone = "good" | "warn" | "bad" | "accent";
type Datum = { name: string; value: number };
const minZero = [(m: number) => Math.min(0, m), "auto"] as [(m: number) => number, "auto"];
const axis = { tickLine: false, axisLine: false, stroke: palette.axis, fontSize: 12 } as const;

/** Page frame shared by every tab: a title, an overall status pill, then the content. */
export function Page({ title, status, children }: { title: string; status?: { tone: Tone; text: string }; children: ReactNode }) {
  return (
    <div className="exec">
      <header className="x-head">
        <h1>{title}</h1>
        {status && <span className={`x-pill x-${status.tone}`}>{status.text}</span>}
      </header>
      {children}
    </div>
  );
}

export function Kpis({ children }: { children: ReactNode }) {
  return <section className="x-kpis x-auto">{children}</section>;
}

export function Ring({ value, target, tone, size = 84, text }: { value: number; target?: number; tone: Tone; size?: number; text?: string }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  const pos = (f: number) => { const a = f * 2 * Math.PI - Math.PI / 2; return [size / 2 + (r + 7) * Math.cos(a), size / 2 + (r + 7) * Math.sin(a), size / 2 + (r - 7) * Math.cos(a), size / 2 + (r - 7) * Math.sin(a)]; };
  const t = target === undefined ? null : pos(target);
  return (
    <svg width={size} height={size} role="img" aria-label={text ?? `${Math.round(v * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={"var(--border)"} strokeWidth={9} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={toneColour(tone)} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      {t && <line x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} stroke={"var(--text)"} strokeWidth={3} />}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 5} fontWeight={700} fill={"var(--text)"}>{text ?? `${Math.round(v * 100)}%`}</text>
    </svg>
  );
}

export function Spark({ data, tone = "accent" }: { data: number[]; tone?: Tone }) {
  const d = data.map((v, i) => ({ i, v }));
  const id = `sp${tone}`;
  return (
    <div className="x-spark"><ResponsiveContainer width="100%" height="100%"><AreaChart data={d} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={toneColour(tone)} stopOpacity={0.35} /><stop offset="100%" stopColor={toneColour(tone)} stopOpacity={0} /></linearGradient></defs>
      <RArea type="monotone" dataKey="v" stroke={toneColour(tone)} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
    </AreaChart></ResponsiveContainer></div>
  );
}

export function Kpi({ label, value, sub, tone, hero, spark, ring }: { label: string; value: string; sub?: string; tone: Tone; hero?: boolean; spark?: number[]; ring?: { value: number; target?: number } }) {
  return (
    <div className={`x-kpi x-${tone}${hero ? " x-hero" : ""}`}>
      <span className="x-label">{label}</span>
      <strong className="x-value" style={value.length > 9 ? { fontSize: 22, whiteSpace: "normal", lineHeight: 1.25 } : undefined}>{value}</strong>
      {sub && <span className="x-sub">{sub}</span>}
      {ring && <div className="x-ring"><Ring value={ring.value} target={ring.target} tone={tone} text=" " size={60} /></div>}
      {spark && <Spark data={spark} tone={tone} />}
    </div>
  );
}

export function Charts({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <section className={`x-charts x-c${cols}`}>{children}</section>;
}

export function Panel({ title, children, h }: { title: string; children: ReactNode; h?: number }) {
  return (
    <div className="x-card">
      <h2>{title}</h2>
      <div className="x-chart" style={h ? { height: h } : undefined}>{children}</div>
    </div>
  );
}

/** Bars with value labels only. Horizontal bars suit names, vertical bars suit time or ordered levels. */
export function Bars({ data, fmt = String, horizontal, refValue, colorOf }: { data: Datum[]; fmt?: (v: number) => string; horizontal?: boolean; refValue?: number; colorOf?: (d: Datum) => string }) {
  const ref = refValue === undefined ? null : horizontal ? <ReferenceLine x={refValue} stroke={palette.axis} strokeDasharray="4 4" /> : <ReferenceLine y={refValue} stroke={palette.axis} strokeDasharray="4 4" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 16, right: horizontal ? 56 : 8, bottom: data.some((d) => d.value < 0) ? 24 : 0, left: horizontal ? 8 : 0 }}>
        {horizontal ? (
          <>
            <XAxis type="number" hide domain={minZero} />
            <YAxis type="category" dataKey="name" width={150} {...axis} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" interval={0} tickMargin={data.some((d) => d.value < 0) ? 22 : 6} {...axis} />
            <YAxis hide domain={minZero} />
          </>
        )}
        <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: "transparent" }} />
        {ref}
        <Bar dataKey="value" radius={4} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorOf ? colorOf(d) : palette.accent} />
          ))}
          <LabelList dataKey="value" position={horizontal ? "right" : "top"} formatter={(v: unknown) => fmt(Number(v))} fontSize={12} fill={palette.axis} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Trendline({ data, fmt = String, refValue, tickEvery = 5 }: { data: Datum[]; fmt?: (v: number) => string; refValue?: number; tickEvery?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="name" interval={tickEvery} {...axis} />
        <YAxis domain={[0, (m: number) => Math.ceil(Math.max(m, refValue ?? 0))]} {...axis} />
        <Tooltip formatter={(v) => fmt(Number(v))} />
        {refValue !== undefined && <ReferenceLine y={refValue} stroke={palette.muted} strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="value" stroke={palette.accent} strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Insights({ items }: { items: { tag: string; text: string; tone: Tone }[] }) {
  return (
    <section className="x-insights">
      {items.map((i) => (
        <div key={i.tag} className={`x-ins x-${i.tone}`}>
          <span>{i.tag}</span>
          <p>{i.text}</p>
        </div>
      ))}
    </section>
  );
}

export function Alerts({ items }: { items: (string | false)[] }) {
  const shown = items.filter(Boolean) as string[];
  return shown.length ? <footer className="x-alerts">{shown.map((a) => <span key={a} className="x-alert">{a}</span>)}</footer> : null;
}

export const toneColour = (t: Tone) => ({ good: palette.good, warn: palette.warn, bad: palette.bad, accent: palette.accent })[t];

export const seriesColours = [palette.accent, palette.good, palette.warn, palette.bad, palette.muted, "#8b5cf6", "#06b6d4"];

export function Donut({ data, fmt = (v: number) => `${Math.round(v)}`, center }: { data: Datum[]; fmt?: (v: number) => string; center?: string }) {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={seriesColours[i % seriesColours.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend iconType="circle" iconSize={9} verticalAlign="bottom" formatter={(n) => <span style={{ color: palette.axis, fontSize: 12 }}>{n}</span>} />
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="x-center">{center}</div>}
    </div>
  );
}

/** Filled trend with an optional trailing 12-point average line. */
export function Area({ data, fmt = String, avg, refValue, tickEvery = 11, id = "ar" }: { data: Datum[]; fmt?: (v: number) => string; avg?: boolean; refValue?: number; tickEvery?: number; id?: string }) {
  const rows = data.map((d, i) => ({ ...d, avg: avg ? data.slice(Math.max(0, i - 11), i + 1).reduce((a, b) => a + b.value, 0) / Math.min(12, i + 1) : undefined }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 24, bottom: 0, left: -20 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.accent} stopOpacity={0.3} /><stop offset="100%" stopColor={palette.accent} stopOpacity={0} /></linearGradient></defs>
        <XAxis dataKey="name" interval={tickEvery} {...axis} />
        <YAxis domain={[0, (m: number) => Math.ceil(Math.max(m, refValue ?? 0))]} {...axis} />
        <Tooltip formatter={(v) => fmt(Number(v))} />
        {refValue !== undefined && <ReferenceLine y={refValue} stroke={palette.muted} strokeDasharray="4 4" />}
        <RArea type="monotone" dataKey="value" stroke={avg ? palette.muted : palette.accent} strokeWidth={avg ? 1 : 3} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
        {avg && <Line type="monotone" dataKey="avg" stroke={palette.accent} strokeWidth={3} dot={false} isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** x/y curve on a 0-1 square with a diagonal reference (ROC, cumulative gains). */
export function Curve({ points }: { points: { x: number; y: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <defs><linearGradient id="cv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.accent} stopOpacity={0.3} /><stop offset="100%" stopColor={palette.accent} stopOpacity={0.02} /></linearGradient></defs>
        <XAxis type="number" dataKey="x" domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(v) => `${v * 100}%`} {...axis} />
        <YAxis type="number" domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(v) => `${v * 100}%`} {...axis} />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={palette.muted} strokeDasharray="4 4" />
        <Tooltip formatter={(v) => `${Math.round(Number(v) * 100)}%`} />
        <RArea type="monotone" dataKey="y" stroke={palette.accent} strokeWidth={3} fill="url(#cv)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars({ data, keys, fmt = String }: { data: ({ name: string } & Record<string, number | string>)[]; keys: { key: string; name: string }[]; fmt?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="name" interval={0} {...axis} />
        <YAxis {...axis} domain={[0, "auto"]} />
        <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: "transparent" }} />
        <Legend iconType="circle" iconSize={9} formatter={(n) => <span style={{ color: palette.axis, fontSize: 12 }}>{n}</span>} />
        {keys.map((k, i) => <Bar key={k.key} dataKey={k.key} name={k.name} fill={seriesColours[i === 0 ? 0 : i === 1 ? 2 : 3]} radius={4} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Dot-and-whisker rows: value with its interval against a reference line. */
export function Forest({ rows, max = 4, refValue = 1 }: { rows: { name: string; value: number; lo: number; hi: number; tone: Tone }[]; max?: number; refValue?: number }) {
  const pc = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  return (
    <div className="x-forest">
      {rows.map((r) => (
        <div key={r.name} className="x-frow"><span>{r.name}</span>
          <div className="x-ftrack"><i style={{ left: pc(refValue) }} className="x-fref" /><b style={{ left: pc(r.lo), width: `calc(${pc(r.hi)} - ${pc(r.lo)})` }} /><u style={{ left: pc(r.value), background: toneColour(r.tone) }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Square heat map for matrices (correlations). */
export function Heat({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  return (
    <div className="x-heat" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
      {matrix.flatMap((row, i) => row.map((v, j) => <i key={`${i}-${j}`} title={`${labels[i]} x ${labels[j]}: ${v.toFixed(2)}`} style={{ background: v >= 0 ? palette.accent : palette.bad, opacity: i === j ? 0.15 : 0.12 + Math.min(1, Math.abs(v)) * 0.88 }} />))}
    </div>
  );
}

export function Matrix2({ cells }: { cells: { label: string; value: number; tone: Tone }[] }) {
  const total = cells.reduce((a, b) => a + b.value, 0);
  return (
    <div className="x-matrix">
      {cells.map((c) => <div key={c.label} style={{ background: toneColour(c.tone), opacity: 0.25 + 0.75 * Math.sqrt(c.value / total) }}><strong>{c.value.toLocaleString("en-US")}</strong><span>{c.label}</span></div>)}
    </div>
  );
}
