import { Link } from "react-router-dom";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import "../styles/executive.css";

type Tone = "good" | "warn" | "bad" | "accent";

const rate = (m: { batches: number; failures: number }[]) =>
  (m.reduce((a, b) => a + b.failures, 0) / Math.max(1, m.reduce((a, b) => a + b.batches, 0))) * 100;

function Kpi({ label, value, sub, tone, hero }: { label: string; value: string; sub: string; tone: Tone; hero?: boolean }) {
  return (
    <div className={`x-kpi x-${tone}${hero ? " x-hero" : ""}`}>
      <span className="x-label">{label}</span>
      <strong className="x-value">{value}</strong>
      <span className="x-sub">{sub}</span>
    </div>
  );
}

function Trend({ label, value, up, bad }: { label: string; value: string; up: boolean; bad: boolean }) {
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="x-trend">
      <Icon size={22} className={bad ? "x-c-bad" : "x-c-good"} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** One-screen executive view: five numbers, three trends, two charts, three insights, three alerts. */
export function ExecutivePage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const chosen = summary.classifier.test.find((r) => r.model.startsWith("Logistic")) ?? summary.classifier.test[0];
  const f = summary.forecast;

  // Failure rate: last 12 full months vs the 12 before. A part-filled final month is dropped.
  let months = data.explore?.monthly_trend ?? [];
  const typical = [...months.slice(-13, -1)].map((m) => m.batches).sort((a, b) => a - b)[6] ?? 0;
  if (months.length && months[months.length - 1].batches < typical * 0.5) months = months.slice(0, -1);
  const now = rate(months.slice(-12));
  const delta = now - rate(months.slice(-24, -12));
  const series = months.slice(-24).map((m) => ({ month: m.month, rate: Number(m.failure_rate_pct.toFixed(2)) }));

  const caps = tableRows(data, "capability");
  const capable = caps.filter((r) => numberCell(r, "cpk") >= targets.cpk).length;
  const worst = caps.reduce((a, b) => (numberCell(b, "cpk") < numberCell(a, "cpk") ? b : a), caps[0]);

  const ageing = tableRows(data, "credit_ageing");
  const open = ageing.reduce((a, r) => a + numberCell(r, "open_balance_KES"), 0);
  const overYear = ageing.filter((r) => textCell(r, "bucket").startsWith("over")).reduce((a, r) => a + numberCell(r, "open_balance_KES"), 0);

  const scen = tableRows(data, "discount_cap_scenarios");
  const profit = (k: string) => numberCell(scen.find((r) => textCell(r, "assumption") === k) ?? {}, "profit_change_KES");
  const watch = tableRows(data, "equipment_reliability").filter((r) => textCell(r, "priority").startsWith("Watch")).length;
  const unresolved = tableRows(data, "reconciliation").filter((r) => textCell(r, "status") === "Differs").length;

  const rows = [
    { label: "Recall", v: chosen.recall, t: targets.recall, d: formatFraction(chosen.recall, 0), td: formatFraction(targets.recall, 0) },
    { label: "Precision", v: chosen.precision, t: targets.precision, d: formatFraction(chosen.precision, 0), td: formatFraction(targets.precision, 0) },
    { label: "ROC-AUC", v: chosen.roc_auc, t: targets.rocAuc, d: formatNumber(chosen.roc_auc, 2), td: formatNumber(targets.rocAuc, 2) },
    { label: "Forecast gain", v: f.improvement_vs_seasonal_naive_pct / 30, t: targets.forecastGainPct / 30, d: `${formatNumber(f.improvement_vs_seasonal_naive_pct, 0)}%`, td: `${targets.forecastGainPct}%` },
  ].map((r) => ({ ...r, met: r.v >= r.t }));
  const met = rows.filter((r) => r.met).length;
  const creditFail = summary.credit_gate.status === "FAIL";
  const health = creditFail || capable === 0 ? { tone: "bad", text: "Needs attention" } : met === rows.length ? { tone: "good", text: "On track" } : { tone: "warn", text: "Watch" };

  return (
    <div className="exec">
      <header className="x-head">
        <h1>Batch quality</h1>
        <span className={`x-pill x-${health.tone}`}>{health.text}</span>
        <Link className="x-link" to="/summary">Detail →</Link>
      </header>

      <section className="x-kpis">
        <Kpi hero label="Batch failure rate" value={`${formatNumber(now, 2)}%`} sub={`${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)} pts vs prior 12 months`} tone={delta > 0.1 ? "bad" : "good"} />
        <Kpi label="Targets met" value={`${met}/${rows.length}`} sub="model and forecast" tone={met === rows.length ? "good" : "warn"} />
        <Kpi label="Sections at Cpk 1.33" value={`${capable}/${caps.length}`} sub={`worst ${formatNumber(numberCell(worst, "cpk"), 2)}`} tone={capable ? "good" : "bad"} />
        <Kpi label="Discount cap, KES" value={`+${formatNumber(profit("none") / 1e6, 0)} m`} sub={`down to ${formatNumber(profit("all") / 1e6, 0)} m`} tone="accent" />
        <Kpi label="Open credit, KES" value={`${formatNumber(open / 1e9, 1)} bn`} sub={`${formatFraction(overYear / open, 0)} over 1 year`} tone={creditFail ? "bad" : "good"} />
      </section>

      <section className="x-trends">
        <Trend label="Failure rate" value={`${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)} pts`} up={delta >= 0} bad={delta > 0} />
        <Trend label="Purchase cost / yr" value={`+${formatNumber(summary.cost_trend.growth_pct_per_year, 1)}%`} up bad />
        <Trend label="Forecast vs naive" value={`+${formatNumber(f.improvement_vs_seasonal_naive_pct, 0)}%`} up bad={false} />
      </section>

      <section className="x-charts">
        <div className="x-card">
          <h2>Failure rate, monthly %</h2>
          <div className="x-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(2)} interval={5} tickLine={false} axisLine={false} stroke={palette.axis} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke={palette.axis} fontSize={12} domain={[0, "auto"]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <ReferenceLine y={summary.failure_rate_pct} stroke={palette.muted} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="rate" stroke={palette.accent} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="x-card">
          <h2>Actual vs target</h2>
          <div className="x-bullets">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="x-brow"><span>{r.label}</span><strong className={r.met ? "x-c-good" : "x-c-bad"}>{r.d}</strong></div>
                <div className="x-bar"><i className={r.met ? "x-bg-good" : "x-bg-bad"} style={{ width: `${Math.min(100, r.v * 100)}%` }} /><b style={{ left: `${r.t * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="x-insights">
        <div className="x-ins x-accent"><span>Opportunity</span><p>5% discount cap: up to {formatKesMillions(profit("none"), 0)}. Pilot in one branch.</p></div>
        <div className="x-ins x-bad"><span>Risk</span><p>No section meets Cpk 1.33. {textCell(worst, "manufacturing_section")} at {formatNumber(numberCell(worst, "cpk"), 2)}.</p></div>
        <div className="x-ins x-warn"><span>Caution</span><p>Alerts flag {formatFraction(chosen.flag_rate, 0)} of batches. Triage aid, not a release gate.</p></div>
      </section>

      <footer className="x-alerts">
        {creditFail && <span className="x-alert">Receivables unverified</span>}
        {watch > 0 && <span className="x-alert">{watch} machines on watch</span>}
        {unresolved > 0 && <span className="x-alert">{unresolved} results unreconciled</span>}
      </footer>
    </div>
  );
}
