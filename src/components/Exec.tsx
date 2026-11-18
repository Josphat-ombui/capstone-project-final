import type { ReactNode } from "react";
import { Bar, BarChart, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export function Kpi({ label, value, sub, tone, hero }: { label: string; value: string; sub?: string; tone: Tone; hero?: boolean }) {
  return (
    <div className={`x-kpi x-${tone}${hero ? " x-hero" : ""}`}>
      <span className="x-label">{label}</span>
      <strong className="x-value" style={value.length > 9 ? { fontSize: 22, whiteSpace: "normal", lineHeight: 1.25 } : undefined}>{value}</strong>
      {sub && <span className="x-sub">{sub}</span>}
    </div>
  );
}

export function Charts({ children }: { children: ReactNode }) {
  return <section className="x-charts x-even">{children}</section>;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="x-card">
      <h2>{title}</h2>
      <div className="x-chart">{children}</div>
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
        <Bar dataKey="value" radius={4}>
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
