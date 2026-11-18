import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatDate, formatFraction, formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Pill, Plot, Section, TableCard, type Finding } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const pvalue = (p: number) => (p < 0.001 ? "< 0.001" : formatNumber(p, 3));

const factorColumns: ColumnSpec[] = [
  { key: "factor", label: "Factor" },
  { key: "chi_square", label: "Chi-square", align: "right", format: (v) => formatNumber(Number(v), 1) },
  { key: "degrees_of_freedom", label: "Degrees of freedom", align: "right" },
  { key: "p_value", label: "p-value", align: "right", format: (v) => pvalue(Number(v)) },
  { key: "clear", label: "Clear link to failure?" },
];

const alertColumns: ColumnSpec[] = [
  { key: "production_start", label: "Production start", nowrap: true, format: (v) => formatDate(String(v)) },
  { key: "equipment_name", label: "Equipment" },
  { key: "manufacturing_section", label: "Section" },
  { key: "dosage_form", label: "Dosage form" },
  { key: "risk_score", label: "Risk score (0 to 1)", align: "right", format: (v) => formatNumber(Number(v), 3) },
  { key: "driver_1", label: "Main driver" },
  { key: "recommended_action", label: "Recommended action" },
];

export function BatchAlertsPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const chosen = s.classifier.test.find((r) => r.model.startsWith("Logistic")) ?? s.classifier.test[0];
  const composite = tableRows(data, "risk_backtest").find((r) => textCell(r, "rule").startsWith("Composite"));
  const flagged = composite ? numberCell(composite, "share_of_batches_flagged") : 0;
  const caught = composite ? numberCell(composite, "share_of_failures_caught") : 0;
  const lift = composite ? numberCell(composite, "lift_flagged_vs_base") : 0;

  const deciles = tableRows(data, "decile_lift_test").map((r) => ({ name: `D${numberCell(r, "decile")}`, value: Number((numberCell(r, "failure_rate") * 100).toFixed(2)) }));
  const byYear = tableRows(data, "risk_backtest_by_year")
    .filter((r) => textCell(r, "rule") === "Classifier alert")
    .map((r) => ({ name: String(numberCell(r, "year")), value: Number((numberCell(r, "share_of_failures_caught") * 100).toFixed(1)) }));

  const factors = tableRows(data, "factor_tests").map((r) => ({ ...r, clear: numberCell(r, "p_value") < 0.05 ? "Yes" : "No" }));
  const topBatches = [...tableRows(data, "alerts_test")].sort((a, b) => numberCell(b, "risk_score") - numberCell(a, "risk_score")).slice(0, 50);

  const precisionMet = chosen.precision >= targets.precision;
  const aucMet = chosen.roc_auc >= targets.rocAuc;
  const findings: Finding[] = [
    { tag: "Caution", tone: "warn", text: `Alerts flag ${formatFraction(chosen.flag_rate, 0)} of batches. That is a triage list, not a release decision.` },
    { tag: "Accuracy", tone: precisionMet && aucMet ? "good" : "bad", text: `Precision is ${formatFraction(chosen.precision, 0)} against a target of ${formatFraction(targets.precision, 0)}, and ROC-AUC is ${formatNumber(chosen.roc_auc, 2)} against ${formatNumber(targets.rocAuc, 2)}. Most flagged batches do not fail.` },
    { tag: "Opportunity", tone: "accent", text: `The high tier flags ${formatFraction(flagged, 0)} of batches and holds ${formatFraction(caught, 0)} of failures, at ${formatNumber(lift, 1)} times the base failure rate.` },
  ];

  return (
    <Page
      eyebrow="Quality and production"
      title="Batch alerts"
      question="Can the model flag batches likely to fail, and which factors go with failure?"
      status={precisionMet && aucMet ? { tone: "good", text: "On target" } : { tone: "warn", text: "Triage aid only" }}
      questionIds={["factors", "classifier"]}
    >
      <Kpis>
        <Kpi tone="bad" label="Batches flagged" value={formatFraction(chosen.flag_rate, 0)} caption={`${formatInteger(s.classifier.alerts_on_test)} alerts on the test period`} />
        <Kpi tone={chosen.recall >= targets.recall ? "good" : "warn"} label="Failures caught" value={formatFraction(chosen.recall, 0)} caption={`target ${formatFraction(targets.recall, 0)}`} />
        <Kpi tone={precisionMet ? "good" : "bad"} label="Precision" value={formatFraction(chosen.precision, 0)} caption={`target ${formatFraction(targets.precision, 0)}`} />
        <Kpi tone={aucMet ? "good" : "bad"} label="ROC-AUC" value={formatNumber(chosen.roc_auc, 2)} caption={`target ${formatNumber(targets.rocAuc, 2)}`} />
        <Kpi tone="accent" label="High-tier lift" value={`${formatNumber(lift, 1)}x`} caption={`${formatFraction(flagged, 0)} of batches flagged, ${formatFraction(caught, 0)} of failures caught`} />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="Where failures sit by risk tier, and how much of the failure total the alerts catch each year.">
        <Grid cols={2}>
          <Panel title="Failure rate by risk tenth, %" note="D1 is the highest-risk tenth of batches. The dashed line is the overall failure rate.">
            <Plot tall>
              <Bars data={deciles} fmt={(v) => `${formatNumber(v, 1)}%`} refValue={s.failure_rate_pct} colorOf={(d) => (d.value > s.failure_rate_pct ? palette.bad : palette.muted)} />
            </Plot>
          </Panel>
          <Panel title="Share of failures caught by year, %" note="Alerts that flagged a batch which later failed, out of all failures that year.">
            <Plot tall>
              <Bars data={byYear} fmt={(v) => `${formatNumber(v, 0)}%`} colorOf={() => palette.accent} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard
          title="Do the factors go with failure?"
          note="A small p-value (under 0.05) means the factor is linked to failure in the data. A link is not proof of cause."
          rows={factors}
          columns={factorColumns}
          fileName="factor-tests.csv"
          pageSize={10}
        />
        <TableCard
          title="Highest-risk batches in the test period"
          note="The 50 batches with the highest risk score, with the main driver and the suggested action. Search or sort to focus."
          rows={topBatches}
          columns={alertColumns}
          fileName="highest-risk-batches.csv"
          pageSize={10}
          renderCell={(column, row) =>
            column.key === "recommended_action" ? <Pill tone={textCell(row, "recommended_action").toLowerCase().includes("hold") ? "bad" : "warn"}>{textCell(row, "recommended_action")}</Pill> : undefined
          }
        />
      </Section>
    </Page>
  );
}
