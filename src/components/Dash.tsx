import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell as ChartCell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Row } from "../lib/data";
import { formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { DataTable, type ColumnSpec } from "./DataTable";
import { QuestionPanel } from "./QuestionPanel";

/**
 * The shared building blocks of every page, so all pages look and behave the same:
 * header, alerts, key figures, findings, charts, tables and the method panels.
 */

export type Tone = "good" | "warn" | "bad" | "accent" | "neutral";
export interface Datum {
  name: string;
  value: number;
}

const axisProps = { tickLine: false, axisLine: false, stroke: palette.axis, fontSize: 12 } as const;
const minZero = [(m: number) => Math.min(0, m), "auto"] as [(m: number) => number, "auto"];

/** Page frame: title, one-line question, status pill, alerts, then the page body and the method panels. */
export function Page({
  eyebrow,
  title,
  question,
  status,
  alerts,
  questionIds,
  children,
}: {
  eyebrow?: string;
  title: string;
  question?: string;
  status?: { tone: Tone; text: string };
  alerts?: (string | false | undefined)[];
  questionIds?: string[];
  children: ReactNode;
}) {
  return (
    <div className="d-page">
      <header className="d-head">
        <div className="d-titles">
          {eyebrow && <p className="d-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {question && <p className="d-question">{question}</p>}
        </div>
        {status && <Pill tone={status.tone}>{status.text}</Pill>}
      </header>
      <Alerts items={alerts ?? []} />
      {children}
      {questionIds && questionIds.length > 0 && (
        <Section title="Method and findings" note="Each question gives the answer first. Open Details for the method, the target and every finding.">
          <QuestionPanel ids={questionIds} />
        </Section>
      )}
    </div>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`d-pill d-${tone}`}>{children}</span>;
}

/** Red banner items that need attention before reading the rest of the page. */
export function Alerts({ items }: { items: (string | false | undefined)[] }) {
  const shown = items.filter((item): item is string => Boolean(item));
  if (shown.length === 0) return null;
  return (
    <div className="d-alerts" role="status">
      {shown.map((text) => (
        <span key={text} className="d-alert">
          {text}
        </span>
      ))}
    </div>
  );
}

/** A row of key figures. The first card can be marked hero to make it larger. */
export function Kpis({ children }: { children: ReactNode }) {
  return <section className="d-kpis" aria-label="Key figures">{children}</section>;
}

export function Kpi({ label, value, caption, tone = "neutral", hero }: { label: string; value: string; caption?: string; tone?: Tone; hero?: boolean }) {
  return (
    <div className={`d-kpi d-${tone}${hero ? " d-hero" : ""}`}>
      <span className="d-label">{label}</span>
      <strong className="d-value">{value}</strong>
      {caption && <span className="d-caption">{caption}</span>}
    </div>
  );
}

/** A titled block with an optional one-line intro. */
export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="d-section">
      <div className="d-section-head">
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** A responsive grid of cards: two or three across on wide screens, one column on phones. */
export function Grid({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <div className={`d-grid d-cols-${cols}`}>{children}</div>;
}

/** A card with a title and a short "how to read this" note. */
export function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <figure className="d-card">
      <figcaption className="d-card-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </figcaption>
      {children}
    </figure>
  );
}

/** A chart inside a panel. Charts fill the plot area, which has a fixed height. */
export function Plot({ tall, children }: { tall?: boolean; children: ReactNode }) {
  return <div className={`d-plot${tall ? " d-tall" : ""}`}>{children}</div>;
}

/** A card holding a searchable, sortable, paged table with a CSV download. */
export function TableCard({
  title,
  note,
  rows,
  columns,
  fileName,
  pageSize,
  searchKeys,
  renderCell,
}: {
  title: string;
  note?: string;
  rows: Row[];
  columns: ColumnSpec[];
  fileName: string;
  pageSize?: number;
  searchKeys?: string[];
  renderCell?: (column: ColumnSpec, row: Row) => ReactNode | undefined;
}) {
  return (
    <div className="d-card d-table">
      <div className="d-card-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      <DataTable rows={rows} columns={columns} fileName={fileName} pageSize={pageSize} searchKeys={searchKeys} renderCell={renderCell} />
    </div>
  );
}

export interface Finding {
  tag: string;
  text: string;
  tone: Tone;
}

/** Short statements with a coloured edge: what to do, what is at risk, what to be careful about. */
export function Findings({ items }: { items: Finding[] }) {
  return (
    <div className="d-findings">
      {items.map((item) => (
        <div key={item.tag + item.text} className={`d-finding d-${item.tone}`}>
          <span>{item.tag}</span>
          <p>{item.text}</p>
        </div>
      ))}
    </div>
  );
}

export interface TargetRow {
  label: string;
  actual: number;
  target: number;
  /** The value that the full bar stands for, so fractions and percentages can share one scale. */
  max: number;
  actualText: string;
  targetText: string;
  met: boolean;
}

/** Actual against target: a bar for the result, a marker for the target. */
export function Targets({ rows }: { rows: TargetRow[] }) {
  return (
    <div className="d-targets">
      {rows.map((row) => {
        const fill = Math.max(0, Math.min(100, (row.actual / row.max) * 100));
        const mark = Math.max(0, Math.min(100, (row.target / row.max) * 100));
        return (
          <div key={row.label} className="d-target">
            <div className="d-target-head">
              <span>{row.label}</span>
              <strong className={row.met ? "d-good-text" : "d-bad-text"}>{row.actualText}</strong>
            </div>
            <div className="d-track" role="img" aria-label={`${row.label}: ${row.actualText}, target ${row.targetText}`}>
              <i className={row.met ? "d-fill-good" : "d-fill-bad"} style={{ width: `${fill}%` }} />
              <b style={{ left: `${mark}%` }} />
            </div>
            <div className="d-target-foot">Target {row.targetText}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Bars with value labels. Horizontal bars suit names; vertical bars suit time or ordered levels. */
export function Bars({
  data,
  fmt = (v) => formatNumber(v, 0),
  horizontal = false,
  refValue,
  colorOf,
}: {
  data: Datum[];
  fmt?: (v: number) => string;
  horizontal?: boolean;
  refValue?: number;
  colorOf?: (d: Datum) => string;
}) {
  const labelWidth = Math.min(260, Math.max(110, Math.max(0, ...data.map((d) => d.name.length)) * 7));
  const ref =
    refValue === undefined ? null : horizontal ? (
      <ReferenceLine x={refValue} stroke={palette.axis} strokeDasharray="4 4" />
    ) : (
      <ReferenceLine y={refValue} stroke={palette.axis} strokeDasharray="4 4" />
    );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 22, right: horizontal ? 70 : 8, bottom: 4, left: horizontal ? 4 : 0 }}>
        {horizontal ? (
          <>
            <XAxis type="number" hide domain={minZero} />
            <YAxis type="category" dataKey="name" width={labelWidth} interval={0} {...axisProps} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" interval={0} {...axisProps} />
            <YAxis hide domain={minZero} />
          </>
        )}
        <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: "transparent" }} />
        {ref}
        <Bar dataKey="value" radius={4}>
          {data.map((d, i) => (
            <ChartCell key={`${d.name}-${i}`} fill={colorOf ? colorOf(d) : palette.accent} />
          ))}
          <LabelList dataKey="value" position={horizontal ? "right" : "top"} formatter={(v: unknown) => fmt(Number(v))} fontSize={12} fill={palette.axis} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A line over time, with an optional dashed reference line. */
export function Trend({ data, fmt = (v) => formatNumber(v, 1), refValue, tickEvery = 5 }: { data: Datum[]; fmt?: (v: number) => string; refValue?: number; tickEvery?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={palette.grid} />
        <XAxis dataKey="name" interval={tickEvery} minTickGap={12} {...axisProps} />
        <YAxis domain={[0, "auto"]} width={44} {...axisProps} tickFormatter={(v: number) => formatNumber(v, 0)} />
        <Tooltip formatter={(v) => fmt(Number(v))} />
        {refValue !== undefined && <ReferenceLine y={refValue} stroke={palette.muted} strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="value" stroke={palette.accent} strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Cell renderer helper: a coloured pill for a text value. */
export function toneFor(text: string, map: Record<string, Tone>): Tone {
  return map[text] ?? "neutral";
}
