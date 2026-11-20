import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { useFilters } from "../components/FilterContext";
import { FilterNotice } from "../components/FilterNotice";
import { failureByLevel, failureByMonth, failureTotals } from "../lib/filters";
import { formatFraction, formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { buildTargets } from "../lib/scorecard";
import { targets } from "../lib/targets";
import { Alerts, Bars, Charts, Donut, Insights, Kpi, Page, Panel, type Tone } from "../components/Exec";

const rate = (m: { batches: number; failures: number }[]) => (m.reduce((a, b) => a + b.failures, 0) / Math.max(1, m.reduce((a, b) => a + b.batches, 0))) * 100;

function Trend({ label, value, up, bad }: { label: string; value: string; up: boolean; bad: boolean }) {
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="x-trend"><Icon size={22} className={bad ? "x-c-bad" : "x-c-good"} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></div>
  );
}

/** Mirrors the final presentation's "five things stakeholders should know", then the targets scorecard. */
export function ExecutivePage({ data }: { data: DashboardData }) {
  const { summary: s } = data;
  const { filters } = useFilters();
  const monthly = tableRows(data, "failure_monthly");
  const totals = failureTotals(monthly, filters);
  const byMonth = failureByMonth(monthly, filters);
  const secLevels = failureByLevel(monthly, filters, "manufacturing_section");
  const t = s.classifier.test.find((r) => r.model.startsWith("Logistic")) ?? s.classifier.test[0];
  const gain = s.forecast.improvement_vs_seasonal_naive_pct;
  let months = byMonth;
  const typical = [...months.slice(-13, -1)].map((m) => m.batches).sort((a, b) => a - b)[6] ?? 0;
  if (months.length && months[months.length - 1].batches < typical * 0.5) months = months.slice(0, -1);
  const series = months.slice(-24).map((m) => ({ month: m.month, rate: Number((m.rate * 100).toFixed(2)) }));
  const early = rate(byMonth.filter((m) => m.month >= "2014" && m.month < "2019")), late = rate(byMonth.filter((m) => m.month >= "2024"));
  const crit = tableRows(data, "maintenance_logit").find((r) => textCell(r, "term") === "Maintenance: Critical") ?? {};
  const scen = tableRows(data, "discount_cap_scenarios");
  const profit = (k: string) => numberCell(scen.find((r) => textCell(r, "assumption") === k) ?? {}, "profit_change_KES") / 1e6;
  const age = tableRows(data, "failure_rates").filter((r) => textCell(r, "factor") === "age_band"), op = tableRows(data, "failure_rates").filter((r) => textCell(r, "factor") === "operator_band");
  const fr = (r: typeof age[number] | undefined) => (r ? numberCell(r, "failure_rate") * 100 : 0);
  const caps = tableRows(data, "capability");
  const capable = caps.filter((r) => numberCell(r, "cpk") >= targets.cpk).length;
  const worst = caps.reduce((a, b) => (numberCell(b, "cpk") < numberCell(a, "cpk") ? b : a), caps[0]);
  const tg = buildTargets(data), met = tg.filter((r) => r.met).length;
  const secs = secLevels;
  const watch = tableRows(data, "equipment_reliability").filter((r) => textCell(r, "priority").startsWith("Watch")).length;
  const unresolved = tableRows(data, "reconciliation").filter((r) => textCell(r, "status") === "Differs").length;
  const creditFail = s.credit_gate.status === "FAIL";
  const health: { tone: Tone; text: string } = creditFail || capable === 0 ? { tone: "bad", text: "Needs attention" } : met === tg.length ? { tone: "good", text: "On track" } : { tone: "warn", text: "Watch" };
  const arrow = (a: number, b: number) => `${formatNumber(a, 1)}% → ${formatNumber(b, 1)}%`;

  return (
    <Page title="Executive overview" status={health}>
      <FilterNotice>The batch failure rate, the monthly trend and the section breakdown follow the filters. Targets, equipment trends, process capability and the commercial figures are full-period and do not change.</FilterNotice>
      <section className="x-kpis">
        <Kpi hero spark={series.map((p) => p.rate)} label="Batches failed" value={`${formatNumber(totals.rate * 100, 1)}%`} sub={`${formatInteger(totals.failures)} of ${formatInteger(totals.batches)} batches`} tone="warn" />
        <Kpi label="Critical maintenance odds" value={`${formatNumber(numberCell(crit, "odds_ratio"), 1)}×`} sub={`95% range ${formatNumber(numberCell(crit, "or_ci_low"), 1)} to ${formatNumber(numberCell(crit, "or_ci_high"), 1)}`} tone="bad" />
        <Kpi label="Failures caught" value={formatFraction(t.recall, 0)} sub="flags 3 in 4 batches" ring={{ value: t.recall, target: targets.recall }} tone="warn" />
        <Kpi label="Forecast error cut" value={`${formatNumber(gain, 0)}%`} sub={`target ${targets.forecastGainPct}%`} ring={{ value: gain / 30, target: targets.forecastGainPct / 30 }} tone="good" />
        <Kpi label="5% discount cap, KES" value={`${formatNumber(profit("all"), 1)} m`} sub={`best case +${formatNumber(profit("none"), 1)} m`} tone="bad" />
      </section>

      <section className="x-trends">
        <Trend label="Failure rate, early vs recent" value={arrow(early, late)} up bad />
        <Trend label="Newest to oldest equipment" value={arrow(fr(age[0]), fr(age[age.length - 1]))} up bad />
        <Trend label="Novice to expert operators" value={arrow(fr(op[0]), fr(op[op.length - 1]))} up={false} bad={false} />
      </section>

      <section className="x-charts">
        <div className="x-card">
          <h2>Failure rate, monthly %</h2>
          <div className="x-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(2)} interval={5} tickLine={false} axisLine={false} stroke={palette.axis} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} stroke={palette.axis} fontSize={12} domain={[0, "auto"]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <ReferenceLine y={totals.rate * 100} stroke={palette.muted} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="rate" stroke={palette.accent} strokeWidth={3} dot={false} />
          </LineChart></ResponsiveContainer></div>
        </div>
        <div className="x-card">
          <h2>Targets: {met} of {tg.length} met</h2>
          <div className="x-bullets">
            {tg.map((r) => (
              <div key={r.label}>
                <div className="x-brow"><span>{r.label}</span><strong className={r.met ? "x-c-good" : "x-c-bad"}>{r.display}</strong></div>
                <div className="x-bar"><i className={r.met ? "x-bg-good" : "x-bg-bad"} style={{ width: `${Math.min(100, r.v * 100)}%` }} /><b style={{ left: `${r.t * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Charts>
        <Panel title="Failures by section"><Donut data={secs.map((r) => ({ name: r.level, value: r.failures }))} center={formatInteger(secs.reduce((a, r) => a + r.failures, 0))} /></Panel>
        <Panel title="Cpk by section (target 1.33)"><Bars data={caps.map((r) => ({ name: textCell(r, "manufacturing_section"), value: Number(numberCell(r, "cpk").toFixed(2)) }))} fmt={(v) => formatNumber(v, 2)} refValue={targets.cpk} colorOf={(d) => (d.value >= targets.cpk ? palette.good : palette.bad)} /></Panel>
      </Charts>

      <Insights items={[
        { tag: "Opportunity", tone: "accent", text: `5% discount cap: up to +KES ${formatNumber(profit("none"), 1)} m. Pilot in one branch.` },
        { tag: "Risk", tone: "bad", text: `No section meets Cpk 1.33. ${textCell(worst, "manufacturing_section")} at ${formatNumber(numberCell(worst, "cpk"), 2)}.` },
        { tag: "Caution", tone: "warn", text: `Alerts flag ${formatFraction(t.flag_rate, 0)} of batches. They order QA review, not release.` },
      ]} />
      <Alerts items={[creditFail && "Receivables unverified", watch > 0 && `${watch} machines on watch`, unresolved > 0 && `${unresolved} results unreconciled`]} />
    </Page>
  );
}
