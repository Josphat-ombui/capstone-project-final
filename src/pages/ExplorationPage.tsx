import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;
const ex = (d: DashboardData) => d.explore as unknown as Record<string, any>; // eslint-disable-line
const short = (n: string, k = 24) => (n.length > k ? `${n.slice(0, k - 1)}…` : n);
void [Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour, numberCell, tableRows, textCell, formatFraction, formatInteger, formatKesMillions, palette, targets, sum, pct, ex, short];

export function ExplorationPage({ data }: { data: DashboardData }) {
  const s = data.summary, q = s.quality_checks, X = ex(data);
  const trend = (X.monthly_trend as { month: string; failure_rate_pct: number }[]).slice(-60).map((m) => ({ name: m.month, value: Number(m.failure_rate_pct.toFixed(2)) }));
  const lv = (k: string) => (X.category_counts[k] as { level: string; batches: number; failure_rate_pct: number }[]).map((r) => ({ name: r.level, value: Number(r.failure_rate_pct.toFixed(1)), n: r.batches }));
  const imp = [...tableRows(data, "permutation_importance")].sort((a, b) => numberCell(b, "importance_mean") - numberCell(a, "importance_mean")).slice(0, 6).map((r) => ({ name: textCell(r, "label"), value: numberCell(r, "importance_mean") }));
  const crit = tableRows(data, "maintenance_logit").find((r) => textCell(r, "term") === "Maintenance: Critical");
  const form = lv("dosage_form"), sec = lv("manufacturing_section");
  const clean = q.pass + q.info === q.checks;
  return (
    <Page title="Data and drivers" status={clean ? { tone: "good", text: "Data checks pass" } : { tone: "warn", text: "Data checks open" }}>
      <Kpis>
        <Kpi label="Batches" value={formatInteger(s.rows.batches)} spark={trend.map((t) => t.value)} tone="accent" />
        <Kpi label="Failure rate" value={pct(s.failure_rate_pct)} tone="warn" spark={trend.map((t) => t.value)} />
        <Kpi label="Checks passed" value={`${q.pass}/${q.checks}`} ring={{ value: q.pass / q.checks }} tone={clean ? "good" : "warn"} />
        <Kpi label="Top driver" value={imp[0]?.name ?? "-"} tone="accent" />
      </Kpis>
      <Charts cols={1}><Panel title="Failure rate, monthly % (line = 12-month average)" h={280}><Area data={trend} fmt={pct} avg id="ex" /></Panel></Charts>
      <Charts cols={3}>
        <Panel title="Failure rate by section, %"><Bars horizontal data={sec} fmt={pct} refValue={s.failure_rate_pct} colorOf={(d) => (d.value > s.failure_rate_pct ? palette.bad : palette.muted)} /></Panel>
        <Panel title="Failure rate by dosage form, %"><Bars horizontal data={form} fmt={pct} refValue={s.failure_rate_pct} colorOf={(d) => (d.value > s.failure_rate_pct ? palette.bad : palette.muted)} /></Panel>
        <Panel title="Driver importance"><Bars horizontal data={imp} fmt={(v) => formatNumber(v, 3)} /></Panel>
      </Charts>
      <Charts>
        <Panel title="Batches by maintenance status"><Donut data={lv("maintenance_status").map((r) => ({ name: r.name, value: r.n }))} center={formatInteger(s.rows.batches)} /></Panel>
        <Panel title="How inputs move together"><Heat labels={X.correlations.columns} matrix={X.correlations.matrix} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: crit ? `Critical maintenance: ${formatNumber(numberCell(crit, "odds_ratio"), 1)}x the odds of failure.` : "Maintenance drives failures." }, { tag: "Driver", tone: "accent", text: `${imp[0]?.name} ranks first.` }]} />
    </Page>
  );
}
