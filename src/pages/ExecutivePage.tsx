import { useMemo } from "react";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { buildQuestions, masterRow } from "../lib/questions";
import { targets } from "../lib/targets";
import { Findings, Grid, Kpi, Kpis, Page, Panel, Plot, Section, TableCard, Targets, Trend, type Finding, type TargetRow, type Tone } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

/** Failure rate over a run of months, as a percentage of all batches in those months. */
const rate = (m: { batches: number; failures: number }[]) =>
  (m.reduce((a, b) => a + b.failures, 0) / Math.max(1, m.reduce((a, b) => a + b.batches, 0))) * 100;

const summaryColumns: ColumnSpec[] = [
  { key: "No.", label: "No.", align: "right" },
  { key: "Question / Problem", label: "Question" },
  { key: "Model / Method", label: "Method" },
  { key: "Target", label: "Target" },
  { key: "Key Result", label: "Key result" },
  { key: "What It Means", label: "What it means" },
];

export function ExecutivePage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const chosen = summary.classifier.test.find((r) => r.model.startsWith("Logistic")) ?? summary.classifier.test[0];
  const f = summary.forecast;
  const questions = useMemo(() => buildQuestions(data), [data]);

  // Failure rate: last 12 full months vs the 12 before. A part-filled final month is dropped.
  let months = data.explore?.monthly_trend ?? [];
  const typical = [...months.slice(-13, -1)].map((m) => m.batches).sort((a, b) => a - b)[6] ?? 0;
  if (months.length && months[months.length - 1].batches < typical * 0.5) months = months.slice(0, -1);
  const now = rate(months.slice(-12));
  const delta = now - rate(months.slice(-24, -12));
  const series = months.slice(-24).map((m) => ({ name: m.month, value: Number(m.failure_rate_pct.toFixed(2)) }));

  const caps = tableRows(data, "capability");
  const capable = caps.filter((r) => numberCell(r, "cpk") >= targets.cpk).length;
  const worst = caps.reduce((a, b) => (numberCell(b, "cpk") < numberCell(a, "cpk") ? b : a), caps[0]);

  const ageing = tableRows(data, "credit_ageing");
  const open = ageing.reduce((a, r) => a + numberCell(r, "open_balance_KES"), 0);
  const overYear = ageing.filter((r) => textCell(r, "bucket").startsWith("over")).reduce((a, r) => a + numberCell(r, "open_balance_KES"), 0);

  const scen = tableRows(data, "discount_cap_scenarios");
  const perYear = (k: string) => numberCell(scen.find((r) => textCell(r, "assumption") === k) ?? {}, "profit_change_KES_per_year");
  const watch = tableRows(data, "equipment_reliability").filter((r) => textCell(r, "priority").startsWith("Watch")).length;
  const unresolved = tableRows(data, "reconciliation").filter((r) => textCell(r, "status") === "Differs").length;

  const targetRows: TargetRow[] = [
    { label: "Failures caught (recall)", actual: chosen.recall, target: targets.recall, max: 1, actualText: formatFraction(chosen.recall, 0), targetText: formatFraction(targets.recall, 0), met: chosen.recall >= targets.recall },
    { label: "Precision of alerts", actual: chosen.precision, target: targets.precision, max: 1, actualText: formatFraction(chosen.precision, 0), targetText: formatFraction(targets.precision, 0), met: chosen.precision >= targets.precision },
    { label: "ROC-AUC (model ranking)", actual: chosen.roc_auc, target: targets.rocAuc, max: 1, actualText: formatNumber(chosen.roc_auc, 2), targetText: formatNumber(targets.rocAuc, 2), met: chosen.roc_auc >= targets.rocAuc },
    { label: "Forecast gain vs naive", actual: f.improvement_vs_seasonal_naive_pct, target: targets.forecastGainPct, max: 50, actualText: `${formatNumber(f.improvement_vs_seasonal_naive_pct, 0)}%`, targetText: `${targets.forecastGainPct}%`, met: f.improvement_vs_seasonal_naive_pct >= targets.forecastGainPct },
  ];
  const met = targetRows.filter((r) => r.met).length;
  const creditFail = summary.credit_gate.status === "FAIL";
  const health: { tone: Tone; text: string } = creditFail || capable === 0 ? { tone: "bad", text: "Needs attention" } : met === targetRows.length ? { tone: "good", text: "On track" } : { tone: "warn", text: "Watch" };

  const findings: Finding[] = [
    { tag: "Opportunity", tone: "accent", text: `Cap discounts at ${formatNumber(summary.discount.cap_pct, 0)}%: up to ${formatKesMillions(perYear("none"), 1)} a year if no volume is lost. Pilot it in one branch first.` },
    { tag: "Risk", tone: "bad", text: `No manufacturing section meets Cpk ${formatNumber(targets.cpk, 2)}. ${textCell(worst, "manufacturing_section")} is weakest at ${formatNumber(numberCell(worst, "cpk"), 2)}.` },
    { tag: "Caution", tone: "warn", text: `Alerts flag ${formatFraction(chosen.flag_rate, 0)} of batches. Use them to triage batches for review, not to release or reject them.` },
    { tag: "Costs", tone: "bad", text: `Purchase costs rise about ${formatNumber(summary.cost_trend.growth_pct_per_year, 1)}% a year, across ${formatInteger(summary.cost_trend.receipts)} receipts.` },
  ];

  return (
    <Page
      eyebrow="Batch quality"
      title="Executive summary"
      question="What were the main results, and were the targets met?"
      status={health}
      alerts={[creditFail && "Receivables not verified: reconcile with finance", watch > 0 && `${watch} machines on watch`, unresolved > 0 && `${unresolved} results unreconciled`]}
    >
      <Kpis>
        <Kpi hero tone={delta > 0.1 ? "bad" : "good"} label="Batch failure rate, last 12 months" value={`${formatNumber(now, 2)}%`} caption={`${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)} points vs the prior 12 months`} />
        <Kpi tone={met === targetRows.length ? "good" : "warn"} label="Targets met" value={`${met} of ${targetRows.length}`} caption="model and forecast" />
        <Kpi tone={capable ? "good" : "bad"} label="Sections at Cpk target" value={`${capable} of ${caps.length}`} caption={`weakest ${formatNumber(numberCell(worst, "cpk"), 2)}`} />
        <Kpi tone="accent" label="Discount cap gain per year" value={formatKesMillions(perYear("none"), 1)} caption={`${formatKesMillions(perYear("all"), 1)} if all lift is lost`} />
        <Kpi tone={creditFail ? "bad" : "good"} label="Open customer balances" value={`KES ${formatNumber(open / 1e9, 2)} bn`} caption={`${formatFraction(overYear / open, 0)} over one year old${creditFail ? ", not verified" : ""}`} />
      </Kpis>

      <Grid cols={2}>
        <Panel title="Batch failure rate by month, %" note="Last 24 full months. The dashed line is the overall rate for the whole period.">
          <Plot tall>
            <Trend data={series} fmt={(v) => `${formatNumber(v, 2)}%`} refValue={summary.failure_rate_pct} tickEvery={3} />
          </Plot>
        </Panel>
        <Panel title="Actual against target" note="The bar is the result; the dark marker is the target. Green means met, red means missed.">
          <Targets rows={targetRows} />
        </Panel>
      </Grid>

      <Section title="Key points" note="What the results mean for decisions.">
        <Findings items={findings} />
      </Section>

      <TableCard
        title="Master summary: every question"
        note="One row per question, with the key result and what it means. Download the full table as CSV."
        rows={questions.map(masterRow)}
        columns={summaryColumns}
        fileName="master-summary.csv"
        pageSize={11}
      />
    </Page>
  );
}
