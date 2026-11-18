import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber, formatPercent } from "../lib/format";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Pill, Plot, Section, TableCard, Trend, type Finding, type Tone } from "../components/Dash";
import { palette } from "../lib/palette";
import type { ColumnSpec } from "../components/DataTable";

const statusTone: Record<string, Tone> = { PASS: "good", FLAG: "bad", INFO: "accent" };

const qualityColumns: ColumnSpec[] = [
  { key: "area", label: "Area" },
  { key: "check", label: "Check" },
  { key: "observed", label: "Observed", align: "right" },
  { key: "expected", label: "Expected", align: "right" },
  { key: "status", label: "Status" },
  { key: "note", label: "Note" },
];

export function ExplorationPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const q = s.quality_checks;
  const monthly = (data.explore?.monthly_trend ?? []).map((m) => ({ name: m.month, value: Number(m.failure_rate_pct.toFixed(2)) }));
  const importance = [...tableRows(data, "permutation_importance")]
    .sort((a, b) => numberCell(b, "importance_mean") - numberCell(a, "importance_mean"))
    .slice(0, 10)
    .map((r) => ({ name: textCell(r, "label"), value: Number(numberCell(r, "importance_mean").toFixed(4)) }));
  const topDriver = importance[0];
  const crit = tableRows(data, "maintenance_logit").find((r) => textCell(r, "term") === "Maintenance: Critical");
  const maintenance = tableRows(data, "failure_rates")
    .filter((r) => textCell(r, "factor") === "maintenance_status")
    .map((r) => ({ name: textCell(r, "level"), value: Number((numberCell(r, "failure_rate") * 100).toFixed(2)) }));
  const quality = tableRows(data, "quality_register");
  const clean = q.pass + q.info === q.checks;
  const oddsCritical = crit ? numberCell(crit, "odds_ratio") : Number.NaN;

  const findings: Finding[] = [
    { tag: "Risk", tone: "bad", text: `Critical maintenance raises the odds of failure ${formatNumber(oddsCritical, 1)} times, against current maintenance.` },
    { tag: "Driver", tone: "accent", text: `${topDriver?.name ?? "No driver"} ranks first. Shuffling it changes the model's predictions the most.` },
    { tag: "Data", tone: clean ? "good" : "warn", text: `${q.pass} of ${q.checks} checks pass and ${q.info} are for information. The batch file has ${formatInteger(s.rows.batches)} rows.` },
  ];

  return (
    <Page
      eyebrow="Quality and production"
      title="Data and drivers"
      question="Are the records complete and linked, and what drives failures?"
      status={clean ? { tone: "good", text: "Data checks pass" } : { tone: "warn", text: "Data checks open" }}
      questionIds={["data-quality", "factors"]}
    >
      <Kpis>
        <Kpi label="Batches" value={formatInteger(s.rows.batches)} caption={`${formatInteger(s.rows.sales)} sales, ${formatInteger(s.rows.inventory)} inventory rows`} tone="accent" />
        <Kpi label="Failure rate" value={formatPercent(s.failure_rate_pct, 2)} caption="share of batches that failed" tone="warn" />
        <Kpi label="Data checks passed" value={`${q.pass} of ${q.checks}`} caption={`${q.info} for information only`} tone={clean ? "good" : "warn"} />
        <Kpi label="Odds of failure, critical maintenance" value={`${formatNumber(oddsCritical, 1)}x`} caption="against current maintenance" tone="bad" />
        <Kpi label="Top driver" value={topDriver?.name ?? "-"} caption={topDriver ? `importance ${formatNumber(topDriver.value, 3)}` : ""} tone="accent" />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Trends and drivers" note="How failures move over time, which factors matter most, and how failure differs by maintenance status.">
        <Grid cols={2}>
          <Panel title="Failure rate by month, %" note="Each point is one month. The dashed line is the overall rate.">
            <Plot tall>
              <Trend data={monthly} fmt={(v) => `${formatNumber(v, 2)}%`} refValue={s.failure_rate_pct} tickEvery={Math.max(1, Math.floor(monthly.length / 12))} />
            </Plot>
          </Panel>
          <Panel title="Top 10 drivers" note="Longer bars mean the factor changes the model's predictions more.">
            <Plot tall>
              <Bars horizontal data={importance} fmt={(v) => formatNumber(v, 3)} />
            </Plot>
          </Panel>
          <Panel title="Failure rate by maintenance status, %" note="Compare the groups; each bar is the share of batches that failed.">
            <Plot>
              <Bars data={maintenance} fmt={(v) => `${formatNumber(v, 2)}%`} colorOf={(d) => (d.value > s.failure_rate_pct ? palette.bad : palette.accent)} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard
          title="Data quality register"
          note="Each check run on the source files. PASS means the check holds; INFO is a note, not a fault."
          rows={quality}
          columns={qualityColumns}
          fileName="data-quality-register.csv"
          pageSize={10}
          renderCell={(column, row) => (column.key === "status" ? <Pill tone={statusTone[textCell(row, "status")] ?? "neutral"}>{textCell(row, "status")}</Pill> : undefined)}
        />
      </Section>
    </Page>
  );
}
