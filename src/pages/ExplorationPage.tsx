import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, Score, Split, Steps, toneColour } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;
const ex = (d: DashboardData) => d.explore as unknown as Record<string, any>; // eslint-disable-line
const short = (n: string, k = 24) => (n.length > k ? `${n.slice(0, k - 1)}…` : n);
void [Score, Split, Steps, Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour, numberCell, tableRows, textCell, formatFraction, formatInteger, formatKesMillions, palette, targets, sum, pct, ex, short];

export function ExplorationPage({ data }: { data: DashboardData }) {
  const s = data.summary, q = s.quality_checks, X = ex(data);
  const trend = (X.monthly_trend as { month: string; failure_rate_pct: number }[]).slice(-60).map((m) => ({ name: m.month, value: Number(m.failure_rate_pct.toFixed(2)) }));
  const fr = (f: string) => tableRows(data, "failure_rates").filter((r) => textCell(r, "factor") === f).map((r) => ({ name: textCell(r, "level"), value: Number((numberCell(r, "failure_rate") * 100).toFixed(1)), n: numberCell(r, "batches") }));
  const form = fr("dosage_form").sort((a, b) => b.value - a.value), op = fr("operator_band"), age = fr("age_band"), maint = fr("maintenance_status");
  const chi = tableRows(data, "factor_tests").filter((r) => textCell(r, "factor") !== "manufacturing_section").map((r) => ({ name: { operator_band: "Operator experience", age_band: "Equipment age", dosage_form: "Dosage form", maintenance_status: "Maintenance status" }[textCell(r, "factor")] ?? textCell(r, "factor"), value: Number(numberCell(r, "chi_square").toFixed(1)) })).sort((a, b) => b.value - a.value);
  const logit = tableRows(data, "maintenance_logit");
  const orRow = (term: string) => { const r = logit.find((x) => textCell(x, "term") === term) ?? {}; return { name: term.replace("Maintenance: ", ""), value: numberCell(r, "odds_ratio"), lo: numberCell(r, "or_ci_low"), hi: numberCell(r, "or_ci_high") }; };
  const odds = [orRow("Maintenance: Critical"), orRow("Maintenance: Due Soon")].map((r) => ({ ...r, tone: (r.lo > 1 ? "bad" : "accent") as "bad" | "accent" }));
  const split = tableRows(data, "split_summary");
  const base = s.failure_rate_pct, avg = (v: { value: number }) => (v.value > base ? palette.bad : palette.muted);
  const clean = q.pass + q.info === q.checks;
  const names = ["Learn", "Tune", "Test"];
  return (
    <Page title="Data and drivers" status={clean ? { tone: "good", text: "No failed checks" } : { tone: "warn", text: "Data checks open" }}>
      <Kpis>
        <Kpi label="Batch records" value={formatInteger(s.rows.batches)} sub="2007 to 2026" tone="accent" />
        <Kpi label="Maintenance records" value={formatInteger(s.rows.batches)} sub="one per batch" tone="accent" />
        <Kpi label="Sales lines" value={formatInteger(s.rows.sales)} sub="2014 to 2025" tone="accent" />
        <Kpi label="Inventory movements" value={formatInteger(s.rows.inventory)} sub="2014 to 2025" tone="accent" />
        <Kpi label="Data checks passed" value={`${q.pass}/${q.checks}`} sub={`${q.info} notes, 0 failed`} ring={{ value: q.pass / q.checks }} tone="good" />
      </Kpis>
      <Charts cols={2}>
        <Panel title="How the model was tested" h={150}><Split parts={split.map((r, i) => ({ name: `${names[i]} · ${textCell(r, "years")}`, sub: `${formatInteger(numberCell(r, "batches"))} batches, ${formatNumber(numberCell(r, "failure_rate_pct"), 1)}% failed`, weight: Math.sqrt(numberCell(r, "batches")) }))} /></Panel>
        <Panel title="Critical maintenance odds of failure (1 = no effect)" h={150}><Forest max={4} rows={odds} /></Panel>
      </Charts>
      <Charts cols={1}><Panel title="Failure rate, monthly % (line = 12-month average)" h={260}><Area data={trend} fmt={pct} avg id="ex" /></Panel></Charts>
      <Charts cols={3}>
        <Panel title="Failure rate by dosage form, %" h={300}><Bars horizontal data={form} fmt={pct} refValue={base} colorOf={avg} /></Panel>
        <Panel title="Operator experience, failure %" h={300}><Bars data={op} fmt={pct} refValue={base} colorOf={avg} /></Panel>
        <Panel title="Equipment age, failure %" h={300}><Bars data={age} fmt={pct} refValue={base} colorOf={avg} /></Panel>
      </Charts>
      <Charts cols={3}>
        <Panel title="Strength of link to failure (chi-square)"><Bars horizontal data={chi} fmt={(v) => formatNumber(v, 1)} /></Panel>
        <Panel title="Batches by maintenance status"><Donut data={maint.map((r) => ({ name: r.name, value: r.n }))} center={formatInteger(s.rows.batches)} /></Panel>
        <Panel title="How inputs move together"><Heat labels={X.correlations.columns} matrix={X.correlations.matrix} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Driver", tone: "accent", text: "Operator experience matters more than maintenance." }, { tag: "Risk", tone: "bad", text: `Critical maintenance: ${formatNumber(odds[0].value, 1)}x the odds, from ${formatInteger(maint.find((m) => m.name === "Critical")?.n ?? 0)} batches.` }]} />
    </Page>
  );
}
