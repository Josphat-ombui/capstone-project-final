import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { Bars, Charts, Insights, Kpi, Kpis, Page, Panel, Trendline } from "../components/Exec";
const pct = (v: number) => `${formatNumber(v, 1)}%`;

export function ExplorationPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const q = s.quality_checks;
  const trend = (data.explore?.monthly_trend ?? []).slice(-60).map((m) => ({ name: m.month, value: Number(m.failure_rate_pct.toFixed(2)) }));
  const imp = [...tableRows(data, "permutation_importance")].sort((a, b) => numberCell(b, "importance_mean") - numberCell(a, "importance_mean")).slice(0, 6).map((r) => ({ name: textCell(r, "label"), value: numberCell(r, "importance_mean") }));
  const crit = tableRows(data, "maintenance_logit").find((r) => textCell(r, "term") === "Maintenance: Critical");
  const clean = q.pass + q.info === q.checks;
  return (
    <Page title="Data and drivers" status={clean ? { tone: "good", text: "Data checks pass" } : { tone: "warn", text: "Data checks open" }}>
      <Kpis>
        <Kpi label="Batches" value={formatInteger(s.rows.batches)} tone="accent" />
        <Kpi label="Failure rate" value={pct(s.failure_rate_pct)} tone="warn" />
        <Kpi label="Checks passed" value={`${q.pass}/${q.checks}`} sub={`${q.info} info`} tone={clean ? "good" : "warn"} />
        <Kpi label="Top driver" value={imp[0]?.name ?? "-"} tone="accent" />
      </Kpis>
      <Charts>
        <Panel title="Failure rate, monthly %"><Trendline data={trend} fmt={pct} tickEvery={11} /></Panel>
        <Panel title="Driver importance"><Bars horizontal data={imp} fmt={(v) => formatNumber(v, 3)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: crit ? `Critical maintenance: ${formatNumber(numberCell(crit, "odds_ratio"), 1)}x the odds of failure.` : "Maintenance drives failures." }, { tag: "Driver", tone: "accent", text: `${imp[0]?.name} ranks first.` }]} />
    </Page>
  );
}
