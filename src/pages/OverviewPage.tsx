import { Link } from "react-router-dom";
import { ArrowRight, FileText, Gauge, ShieldAlert, Target } from "lucide-react";
import { Card } from "../components/Card";
import { DataTable, type ColumnSpec } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { StatusPill } from "../components/StatusPill";
import { type DashboardData, numberCell, tableRows, textCell, type Row } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber, formatPercent } from "../lib/format";
import { targets } from "../lib/targets";
import { buildQuestions, masterRow } from "../lib/questions";
import { failureTotals } from "../lib/filters";
import { useFilters } from "../components/FilterContext";

interface TargetRow {
  label: string;
  value: number;
  display: string;
  target: number;
  targetDisplay: string;
  max: number;
  met: boolean;
}

/** One target as a bar with a marker at the target value. Shows the gap at a glance. */
function TargetBullet({ row }: { row: TargetRow }) {
  const width = Math.min(100, (row.value / row.max) * 100);
  const marker = Math.min(100, (row.target / row.max) * 100);
  return (
    <div className="target-row">
      <div className="target-head">
        <span>{row.label}</span>
        <strong className={row.met ? "target-met" : "target-missed"}>{row.display}</strong>
      </div>
      <div className="bullet" role="img" aria-label={`${row.label}: ${row.display}, target ${row.targetDisplay}`}>
        <div className={`bullet-bar ${row.met ? "is-met" : "is-missed"}`} style={{ width: `${width}%` }} />
        <div className="bullet-target" style={{ left: `${marker}%` }} />
      </div>
      <span className="target-note">Target {row.targetDisplay}</span>
    </div>
  );
}

/** Executive summary: the headline numbers, the targets, the master table and the recommendations. */
export function OverviewPage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const { filters } = useFilters();
  const totals = failureTotals(tableRows(data, "failure_monthly"), filters);
  const chosen = summary.classifier.test.find((row) => row.model.startsWith("Logistic")) ?? summary.classifier.test[0];
  const forecast = summary.forecast;
  const scenarios = tableRows(data, "discount_cap_scenarios");
  const profit = (key: string) => numberCell(scenarios.find((row) => textCell(row, "assumption") === key) ?? {}, "profit_change_KES");
  const questions = buildQuestions(data);
  const records = summary.rows.batches + summary.rows.sales + summary.rows.inventory;
  const cap = summary.assumptions.discount_cap_pct;

  const targetRows: TargetRow[] = [
    { label: "Recall (batch alerts)", value: chosen.recall, display: formatFraction(chosen.recall, 1), target: targets.recall, targetDisplay: `at least ${formatFraction(targets.recall, 0)}`, max: 1, met: chosen.recall >= targets.recall },
    { label: "Precision (batch alerts)", value: chosen.precision, display: formatFraction(chosen.precision, 1), target: targets.precision, targetDisplay: `at least ${formatFraction(targets.precision, 0)}`, max: 1, met: chosen.precision >= targets.precision },
    { label: "ROC-AUC (batch alerts)", value: chosen.roc_auc, display: formatNumber(chosen.roc_auc, 3), target: targets.rocAuc, targetDisplay: `at least ${formatNumber(targets.rocAuc, 2)}`, max: 1, met: chosen.roc_auc >= targets.rocAuc },
    { label: "Forecast gain over seasonal naive", value: forecast.improvement_vs_seasonal_naive_pct, display: `${formatNumber(forecast.improvement_vs_seasonal_naive_pct, 1)}%`, target: targets.forecastGainPct, targetDisplay: `at least ${formatNumber(targets.forecastGainPct, 0)}%`, max: 30, met: forecast.target_met },
  ];
  const metCount = targetRows.filter((row) => row.met).length;

  const masterColumns: ColumnSpec[] = [
    { key: "No.", label: "No.", align: "right" },
    { key: "Question / Problem", label: "Question / Problem" },
    { key: "Model / Method", label: "Model / Method" },
    { key: "Target", label: "Target" },
    { key: "Key Result", label: "Key Result" },
    { key: "What It Means", label: "What It Means" },
  ];
  const masterRows: Row[] = questions.map(masterRow);

  const recommendations = [
    `Use the batch alerts to order QA checks. They catch ${formatFraction(chosen.recall, 0)} of failures but flag ${formatFraction(chosen.flag_rate, 0)} of batches, so they cannot release or reject batches.`,
    "Inspect the Watch machines first, then confirm the gap with more data before major spending.",
    `Pilot a ${formatNumber(cap, 0)}% discount cap in one branch and track volume before a full rollout.`,
    "Reconcile the credit balances with the finance ledger, and count stock, before acting on collections or reorder points.",
  ];

  const limits = [
    "Batch failure stands in for equipment failure. There are no repair or downtime records, so time between failures and repair time cannot be measured.",
    "The inventory file has no opening balances, so stock on hand cannot be verified. Opening stock is shown as a range.",
    "Cancelled orders still show stock leaving. These outflows are corrected before stock ranges and demand are calculated.",
    "The credit balance check fails. Open credit is not collected from these records until the finance ledger is reconciled.",
    "The batch classifier misses the precision and ROC-AUC targets. Use it to order QA review, not as a release gate.",
    `Risk weights and the ${formatNumber(cap, 0)}% discount cap are assumptions. The Batch alerts page shows how the flagged set changes with the weights.`,
    "Predictions for settings outside the training range are extrapolations and are marked on the predictor page.",
  ];

  return (
    <>
      <PageHeader
        eyebrow="Batch quality and machine reliability"
        title="Where batches fail, what drives it, and what to act on first"
        description={`${formatInteger(summary.rows.batches)} batches, ${formatInteger(summary.rows.sales)} sales lines and ${formatInteger(summary.rows.inventory)} stock movements. ${metCount} of ${targetRows.length} project targets met.`}
        aside={<StatusPill tone={metCount === targetRows.length ? "good" : "warn"}>{`${metCount} of ${targetRows.length} targets met`}</StatusPill>}
      />

      <SectionSummary
        points={[
          `${formatInteger(metCount)} of ${formatInteger(targetRows.length)} project targets are met. The classifier is a review aid, not a release gate.`,
          `A ${formatNumber(cap, 0)}% discount cap is worth ${formatKesMillions(profit("none"))} over 2024 to 2025 only if no volume is lost. Pilot it in one branch first.`,
          "Open credit cannot be collected from these records until the finance ledger is reconciled.",
        ]}
      />

      <Section title="Headline numbers">
        <KpiCard icon={Gauge} label="Records" value={formatInteger(records)} tone="info" />
        <KpiCard icon={Gauge} label="Questions answered" value={formatInteger(questions.length)} tone="accent" />
        <KpiCard icon={Target} label="Best model score" value={formatNumber(chosen.roc_auc, 3)} hint="ROC-AUC, target 0.80" tone={chosen.roc_auc >= targets.rocAuc ? "good" : "bad"} />
        <KpiCard icon={ShieldAlert} label="Batch failure rate" value={formatPercent(totals.rate * 100, 2)} hint={`${formatInteger(totals.batches)} batches in the current filter`} tone="warn" />
        <KpiCard icon={Target} label="Failures caught" value={formatFraction(chosen.recall, 0)} hint="Share of failing batches flagged" tone="accent" />
      </Section>

      <Section title="Project targets">
        <Card title="Targets against the test period" subtitle="Test data, 2024 to 2026. The marker shows each target.">
          <div className="target-list">
            {targetRows.map((row) => (
              <TargetBullet key={row.label} row={row} />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Master summary">
        <Card
          title="Questions, methods and results"
          subtitle="One row per question, matching the question panel on each page"
          actions={<Link className="btn" to="/print">Open printable full summary</Link>}
        >
          <DataTable rows={masterRows} columns={masterColumns} fileName="master-summary.csv" pageSize={11} emptyMessage="No questions to show." />
        </Card>
      </Section>

      <Section title="Recommendations">
        <Card title="Next steps">
          <ol className="recommendation-list">
            {recommendations.map((text) => (
              <li key={text}>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </Card>
      </Section>

      <Section title="Analysis notebook">
        <Card title="Download the notebook" subtitle="Charts, summaries and the consistency check, executed top to bottom">
          <a className="page-link" href="downloads/Batch_Quality_Final_Notebook.ipynb" download>
            <FileText size={18} aria-hidden="true" />
            <span>
              <strong>Batch_Quality_Final_Notebook.ipynb</strong>
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </Card>
      </Section>

      <Section title="Limits">
        <details className="limits-box">
          <summary>Seven limits to read before acting on a result</summary>
          <ol>
            {limits.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
        </details>
      </Section>
    </>
  );
}
