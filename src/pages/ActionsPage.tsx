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
import { buildTargets } from "../lib/scorecard";

export function ActionsPage({ data }: { data: DashboardData }) {
  const tg = buildTargets(data), met = tg.filter((r) => r.met).length;
  const w = tableRows(data, "risk_weight_sensitivity")[0] ?? {};
  const rec = ["Use the alert list to order QA review, highest risk first.", "Treat Critical maintenance as a pre-release check.", "Track variance readings more closely than averages.", "Pilot the 5% discount cap in one branch first.", "Reconcile the credit balance with the finance ledger before collections."];
  const dec = ["Sign off the risk-score weights: quality 0.6, equipment 0.2, process 0.2.", "Confirm the assay specification (95 to 105%), reorder lead times and the discount cap.", "Provide repair and downtime records, plus fuller raw-material and dissolution-time records."];
  return (
    <Page title="Actions and decisions" status={{ tone: "warn", text: `${met} of ${tg.length} targets met` }}>
      <Kpis>
        <Kpi label="Targets met" value={`${met}/${tg.length}`} ring={{ value: met / tg.length }} tone="warn" />
        <Kpi label="Targets missed" value={String(tg.length - met)} sub="both in the classifier" tone="bad" />
        <Kpi label="Recommendations" value={String(rec.length)} tone="accent" />
        <Kpi label="Decisions needed" value={String(dec.length)} tone="accent" />
      </Kpis>
      <Charts>
        <Panel title="Targets scorecard" h={300}><Score rows={tg} /></Panel>
        <Panel title="Risk-score weights to sign off" h={300}><Donut data={[{ name: "Quality", value: numberCell(w, "weight_quality") }, { name: "Equipment", value: numberCell(w, "weight_equipment") }, { name: "Process", value: numberCell(w, "weight_process") }]} fmt={(v) => formatNumber(v, 1)} center="0.6 / 0.2 / 0.2" /></Panel>
      </Charts>
      <Charts>
        <Steps title="What we recommend" items={rec} />
        <Steps title="Decisions needed" items={dec} />
      </Charts>
      <Insights items={[{ tag: "Why the misses", tone: "warn", text: "At a 3.1% base rate, the batch files lack the detail for high precision." }]} />
    </Page>
  );
}
