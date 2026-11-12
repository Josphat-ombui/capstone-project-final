import { useMemo, useState } from "react";
import { Crosshair, ShieldAlert, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable, type ColumnSpec } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { StatusPill } from "../components/StatusPill";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber, formatPercent } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette, seriesColours } from "../lib/palette";
import { useFilters } from "../components/FilterContext";
import { FilterNotice } from "../components/FilterNotice";
import { describeFilters, failureByLevel, isFiltered, type BreakdownColumn } from "../lib/filters";
import { targets } from "../lib/targets";
import { ConfusionMatrixCard, RocCard } from "../components/ClassifierVisuals";

const breakdowns: { value: BreakdownColumn; label: string }[] = [
  { value: "maintenance_status", label: "Maintenance status" },
  { value: "dosage_form", label: "Dosage form" },
  { value: "manufacturing_section", label: "Manufacturing section" },
  { value: "age_band", label: "Equipment age" },
  { value: "operator_band", label: "Operator experience" },
];

/** Batch alerts: how well the classifier separates failing batches, the predictor, and the review queue. */
export function BatchAlertsPage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const { filters } = useFilters();
  const [breakdown, setBreakdown] = useState<BreakdownColumn>("maintenance_status");

  const testRows = summary.classifier.test;
  const chosen = testRows.find((row) => row.model.startsWith("Logistic")) ?? testRows[0];
  const alerts = tableRows(data, "alerts_test");
  const baseRate = summary.failure_rate_pct;
  const decileRows = tableRows(data, "decile_lift_test");
  const topDecile = decileRows.find((row) => numberCell(row, "decile") === 1) ?? {};

  const levelRows = useMemo(
    () =>
      failureByLevel(tableRows(data, "failure_monthly"), filters, breakdown).map((item) => ({
        level: item.level,
        rate: item.rate * 100,
        batches: item.batches,
      })),
    [data, filters, breakdown],
  );

  const backtest = tableRows(data, "risk_backtest");
  const weights = tableRows(data, "risk_weight_sensitivity");
  const importance = [...tableRows(data, "permutation_importance")]
    .sort((first, second) => numberCell(second, "importance_mean") - numberCell(first, "importance_mean"))
    .slice(0, 10)
    .map((row) => ({ label: textCell(row, "label"), importance: numberCell(row, "importance_mean") }));

  const alertColumns: ColumnSpec[] = [
    { key: "batch_id", label: "Batch", nowrap: true },
    { key: "production_start", label: "Start" },
    { key: "equipment_name", label: "Equipment" },
    { key: "dosage_form", label: "Dosage form" },
    { key: "risk_score", label: "Risk score", align: "right", format: (value) => formatNumber(Number(value), 3) },
    { key: "driver_1", label: "Main driver" },
    { key: "recommended_action", label: "Action" },
  ];

  const weightColumns: ColumnSpec[] = [
    { key: "scenario", label: "Weighting" },
    { key: "weight_quality", label: "Quality", align: "right", format: (value) => formatNumber(Number(value), 2) },
    { key: "weight_equipment", label: "Equipment", align: "right", format: (value) => formatNumber(Number(value), 2) },
    { key: "weight_process", label: "Process", align: "right", format: (value) => formatNumber(Number(value), 2) },
    { key: "share_of_batches_flagged", label: "Batches flagged", align: "right", format: (value) => formatFraction(Number(value)) },
    { key: "share_of_failures_caught", label: "Failures caught", align: "right", format: (value) => formatFraction(Number(value)) },
  ];

  const recallOk = chosen.recall >= targets.recall;
  const precisionOk = chosen.precision >= targets.precision;
  const aucOk = chosen.roc_auc >= targets.rocAuc;

  return (
    <>
      <PageHeader questions={["factors", "classifier"]}
        eyebrow="Batch alerts"
        title="Which batches need a quality check before release"
        description="The classifier ranks batches for review, and the batch predictor scores one batch you describe. Both are triage tools; neither releases or rejects a batch."
        aside={<StatusPill tone={recallOk ? "good" : "bad"}>{recallOk ? "Recall target met" : "Recall target missed"}</StatusPill>}
      />

      <SectionSummary
        points={[
          `The adopted logistic model catches ${formatFraction(chosen.recall, 1)} of failing batches on the 2024 to 2026 test data, against a target of ${formatFraction(targets.recall, 0)}.`,
          `Only ${formatFraction(chosen.precision, 1)} of flagged batches fail, against a base rate of ${formatPercent(baseRate, 2)}. The precision target of ${formatFraction(targets.precision, 0)} is missed.`,
          `ROC-AUC is ${formatNumber(chosen.roc_auc, 3)}, short of the ${formatNumber(targets.rocAuc, 2)} target. The batch-level signal is weak, so the classifier orders review rather than deciding release.`,
          `The top decile of predicted risk fails at ${formatPercent(numberCell(topDecile, "failure_rate") * 100, 2)}, a lift of ${formatNumber(numberCell(topDecile, "lift"), 2)} over the base rate.`,
        ]}
      />

      <Section title="Classifier against the project targets" intro="Test period 2024 to 2026. Targets are set in the project plan.">
        <KpiCard icon={Crosshair} label="Recall" value={formatFraction(chosen.recall, 1)} hint={`Target ${formatFraction(targets.recall, 0)}`} tone={recallOk ? "good" : "bad"} />
        <KpiCard icon={Target} label="Precision" value={formatFraction(chosen.precision, 1)} hint={`Target ${formatFraction(targets.precision, 0)}`} tone={precisionOk ? "good" : "bad"} />
        <KpiCard icon={ShieldAlert} label="ROC-AUC" value={formatNumber(chosen.roc_auc, 3)} hint={`Target ${formatNumber(targets.rocAuc, 2)}`} tone={aucOk ? "good" : "bad"} />
        <KpiCard icon={ShieldAlert} label="Batches flagged" value={formatFraction(chosen.flag_rate, 1)} hint={`${formatInteger(alerts.length)} alerts in the exported queue`} tone="info" />
      </Section>

      <Section title="Classifier fit" intro="Where the alerts succeed and where they misfire, on the same test period.">
        <ConfusionMatrixCard counts={chosen} />
        {data.explore && <RocCard points={data.explore.roc.points} auc={data.explore.roc.auc} />}
      </Section>

      <Section title="Where failures concentrate" intro="Failure rate by the groups that the classifier uses. Filters apply here.">
        <Card
          title="Failure rate by group"
          subtitle="Share of batches that failed, with the number of batches in each group"
          actions={
            <select aria-label="Group batches by" value={breakdown} onChange={(event) => setBreakdown(event.target.value as BreakdownColumn)}>
              {breakdowns.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          }
          caption={`Current selection: ${describeFilters(filters)}.`}
        >
          {isFiltered(filters) && <FilterNotice>Filters are applied to this chart.</FilterNotice>}
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelRows}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="level" {...axisProps} />
                <YAxis {...axisProps} unit="%" />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `${formatNumber(Number(value), 2)}%`} />
                <Bar dataKey="rate" name="Failure rate" radius={6}>
                  {levelRows.map((row, index) => (
                    <Cell key={row.level} fill={seriesColours[index % seriesColours.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="What the classifier relies on" subtitle="Drop in ROC-AUC when each feature is shuffled on the test data" caption="Larger bars mean the classifier depends more on that feature.">
          <div className="chart chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={importance} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="label" width={190} {...axisProps} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatNumber(Number(value), 4)} />
                <Bar dataKey="importance" name="ROC-AUC drop" fill={palette.accent} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section title="Rule backtest and risk weights" intro="How much of the failure burden the alert rules would catch, and how sensitive that is to the weights.">
        <Card title="Alert rules compared" subtitle="Share of batches flagged and share of failures caught, 2024 to 2026">
          <DataTable
            rows={backtest}
            fileName="risk_backtest.csv"
            columns={[
              { key: "rule", label: "Rule" },
              { key: "share_of_batches_flagged", label: "Flagged", align: "right", format: (value) => formatFraction(Number(value)) },
              { key: "share_of_failures_caught", label: "Failures caught", align: "right", format: (value) => formatFraction(Number(value)) },
              { key: "lift_flagged_vs_base", label: "Lift", align: "right", format: (value) => formatNumber(Number(value), 2) },
            ]}
            pageSize={5}
          />
        </Card>
        <Card title="Risk weight sensitivity" subtitle="Composite score weights for quality, equipment and process" caption="The weights are a modelling choice. Changing them moves which batches are flagged; the table shows by how much.">
          <DataTable rows={weights} columns={weightColumns} fileName="risk_weight_sensitivity.csv" pageSize={6} />
        </Card>
      </Section>

      <Section title="Alert queue" intro="The batches in the test period that the classifier flagged, with the main drivers for each.">
        <Card title="Flagged batches" subtitle="Sorted by risk score; identifiers masked to the last four characters">
          <DataTable rows={alerts} columns={alertColumns} fileName="alerts_test.csv" pageSize={12} searchKeys={["batch_id", "equipment_name", "driver_1"]} />
        </Card>
      </Section>
    </>
  );
}
