import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Alerts, Bars, Charts, Insights, Kpi, Kpis, Page, Panel } from "../components/Exec";
const pct = (v: number) => `${formatNumber(v, 1)}%`;

export function BatchAlertsPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const t = s.classifier.test[0];
  const comp = tableRows(data, "risk_backtest").find((r) => textCell(r, "rule").startsWith("Composite"));
  const dec = tableRows(data, "decile_lift_test").map((r) => ({ name: `D${numberCell(r, "decile")}`, value: Number((numberCell(r, "failure_rate") * 100).toFixed(1)) }));
  const cf = comp ? numberCell(comp, "share_of_batches_flagged") : 0;
  const cc = comp ? numberCell(comp, "share_of_failures_caught") : 0;
  const lift = comp ? numberCell(comp, "lift_flagged_vs_base") : 0;
  const miss = (!s.classifier.meets_precision_target_on_test ? 1 : 0) + (!s.classifier.meets_roc_auc_target_on_test ? 1 : 0);
  return (
    <Page title="Batch alerts" status={miss ? { tone: "warn", text: "Triage aid only" } : { tone: "good", text: "On target" }}>
      <Kpis>
        <Kpi label="Batches flagged" value={formatFraction(t.flag_rate, 0)} sub={`${formatInteger(s.classifier.alerts_on_test)} alerts`} tone="bad" />
        <Kpi label="Failures caught" value={formatFraction(t.recall, 0)} sub={`target ${formatFraction(targets.recall, 0)}`} tone="good" />
        <Kpi label="Precision" value={formatFraction(t.precision, 0)} sub={`target ${formatFraction(targets.precision, 0)}`} tone="bad" />
        <Kpi label="High tier lift" value={`${formatNumber(lift, 1)}x`} sub={`${formatFraction(cf, 0)} flagged, ${formatFraction(cc, 0)} caught`} tone="accent" />
      </Kpis>
      <Charts>
        <Panel title="Failure rate by risk decile, %"><Bars data={dec} fmt={pct} refValue={s.failure_rate_pct} colorOf={(d) => (d.value > s.failure_rate_pct ? palette.bad : palette.muted)} /></Panel>
        <Panel title="Share of batches vs failures"><Bars horizontal data={[{ name: "Alerts: flagged", value: t.flag_rate * 100 }, { name: "Alerts: caught", value: t.recall * 100 }, { name: "High tier: flagged", value: cf * 100 }, { name: "High tier: caught", value: cc * 100 }]} fmt={(v) => `${formatNumber(v, 0)}%`} colorOf={(d) => (d.name.endsWith("caught") ? palette.good : palette.muted)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Caution", tone: "warn", text: `Alerts flag ${formatFraction(t.flag_rate, 0)} of batches.` }, { tag: "Opportunity", tone: "accent", text: `High tier: ${formatFraction(cf, 0)} of batches, ${formatNumber(lift, 1)}x failure rate.` }]} />
      <Alerts items={[!s.classifier.meets_precision_target_on_test && "Precision below target", !s.classifier.meets_roc_auc_target_on_test && "ROC-AUC below target"]} />
    </Page>
  );
}
