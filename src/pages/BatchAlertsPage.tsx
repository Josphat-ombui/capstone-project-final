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

export function BatchAlertsPage({ data }: { data: DashboardData }) {
  const s = data.summary, c = s.classifier, t = c.test[0];
  const comp = tableRows(data, "risk_backtest").find((r) => textCell(r, "rule").startsWith("Composite"));
  const decR = tableRows(data, "decile_lift_test");
  const dec = decR.map((r) => ({ name: `D${numberCell(r, "decile")}`, value: Number((numberCell(r, "failure_rate") * 100).toFixed(1)) }));
  const gains = [{ x: 0, y: 0 }, ...decR.map((r, i) => ({ x: (i + 1) / decR.length, y: numberCell(r, "cumulative_share_of_failures") }))];
  const roc = (ex(data).roc.points as { fpr: number; tpr: number }[]).map((p) => ({ x: p.fpr, y: p.tpr }));
  const cf = comp ? numberCell(comp, "share_of_batches_flagged") : 0, cc = comp ? numberCell(comp, "share_of_failures_caught") : 0, lift = comp ? numberCell(comp, "lift_flagged_vs_base") : 0;
  const miss = (!c.meets_precision_target_on_test ? 1 : 0) + (!c.meets_roc_auc_target_on_test ? 1 : 0);
  return (
    <Page title="Batch alerts" status={miss ? { tone: "warn", text: "Triage aid only" } : { tone: "good", text: "On target" }}>
      <Kpis>
        <Kpi label="Batches flagged" value={formatFraction(t.flag_rate, 0)} ring={{ value: t.flag_rate }} tone="bad" />
        <Kpi label="Failures caught" value={formatFraction(t.recall, 0)} ring={{ value: t.recall, target: targets.recall }} tone="good" />
        <Kpi label="Precision" value={formatFraction(t.precision, 0)} ring={{ value: t.precision, target: targets.precision }} tone="bad" />
        <Kpi label="ROC-AUC" value={formatNumber(t.roc_auc, 2)} ring={{ value: t.roc_auc, target: targets.rocAuc }} tone="bad" />
        <Kpi label="High tier lift" value={`${formatNumber(lift, 1)}x`} sub={`${formatFraction(cf, 0)} flagged, ${formatFraction(cc, 0)} caught`} tone="accent" />
      </Kpis>
      <Charts cols={3}>
        <Panel title="ROC curve (dashed = chance)"><Curve points={roc} /></Panel>
        <Panel title="Failures caught as batches are reviewed"><Curve points={gains} /></Panel>
        <Panel title="Outcomes on test batches"><Matrix2 cells={[{ label: "Caught", value: t.tp, tone: "good" }, { label: "False alarm", value: t.fp, tone: "warn" }, { label: "Missed", value: t.fn, tone: "bad" }, { label: "Correct pass", value: t.tn, tone: "accent" }]} /></Panel>
      </Charts>
      <Charts>
        <Panel title="Failure rate by risk decile, %"><Bars data={dec} fmt={pct} refValue={s.failure_rate_pct} colorOf={(d) => (d.value > s.failure_rate_pct ? palette.bad : palette.muted)} /></Panel>
        <Panel title="Share of batches vs failures"><Bars horizontal data={[{ name: "Alerts: flagged", value: t.flag_rate * 100 }, { name: "Alerts: caught", value: t.recall * 100 }, { name: "High tier: flagged", value: cf * 100 }, { name: "High tier: caught", value: cc * 100 }]} fmt={(v) => `${formatNumber(v, 0)}%`} colorOf={(d) => (d.name.endsWith("caught") ? palette.good : palette.muted)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Caution", tone: "warn", text: `Alerts flag ${formatFraction(t.flag_rate, 0)} of batches.` }, { tag: "Opportunity", tone: "accent", text: `High tier: ${formatFraction(cf, 0)} of batches, ${formatNumber(lift, 1)}x failure rate.` }]} />
      <Alerts items={[!c.meets_precision_target_on_test && "Precision below target", !c.meets_roc_auc_target_on_test && "ROC-AUC below target"]} />
    </Page>
  );
}
