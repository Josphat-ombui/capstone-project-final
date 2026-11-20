import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { useFilters } from "../components/FilterContext";
import { FilterNotice } from "../components/FilterNotice";
import { passesBranch } from "../lib/filters";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;
const ex = (d: DashboardData) => d.explore as unknown as Record<string, any>; // eslint-disable-line
const short = (n: string, k = 24) => (n.length > k ? `${n.slice(0, k - 1)}…` : n);
void [Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour, numberCell, tableRows, textCell, formatFraction, formatInteger, formatKesMillions, palette, targets, sum, pct, ex, short];

export function InventoryPage({ data }: { data: DashboardData }) {
  const { filters } = useFilters();
  const c = tableRows(data, "cancelled_stock_outflows").filter((r) => passesBranch(textCell(r, "Branch_Code"), filters));
  const total = sum(c.map((r) => numberCell(r, "value_KES")));
  const agg = new Map<string, { v: number; o: number; u: number }>();
  c.forEach((r) => { const k = textCell(r, "Branch_Code"), a = agg.get(k) ?? { v: 0, o: 0, u: 0 }; agg.set(k, { v: a.v + numberCell(r, "value_KES"), o: a.o + numberCell(r, "orders"), u: a.u + numberCell(r, "units") }); });
  const br = [...agg].sort((a, b) => b[1].v - a[1].v);
  const top = [...c].sort((a, b) => numberCell(b, "value_KES") - numberCell(a, "value_KES")).slice(0, 8);
  const topShare = sum(top.map((r) => numberCell(r, "value_KES"))) / total;
  const lead = br[0];
  return (
    <Page title="Inventory and stock" status={{ tone: "warn", text: "Cancelled outflows" }}>
      <FilterNotice>Stock figures follow the branch filter. Batch filters such as section, dosage and years do not apply to stock data.</FilterNotice>
      <Kpis>
        <Kpi label="Cancelled value, KES" value={`${formatNumber(total / 1e9, 2)} bn`} tone="bad" />
        <Kpi label="Cancelled orders" value={formatInteger(sum(br.map((b) => b[1].o)))} tone="accent" />
        <Kpi label="Top branch share" value={formatFraction(lead[1].v / total, 0)} sub={lead[0]} ring={{ value: lead[1].v / total }} tone="warn" />
        <Kpi label="Top 8 lines share" value={formatFraction(topShare, 0)} ring={{ value: topShare }} tone="accent" />
        <Kpi label="Items with reorder points" value={formatInteger(tableRows(data, "reorder_points").filter((r) => passesBranch(textCell(r, "Branch_Code"), filters)).length)} tone="good" />
      </Kpis>
      <Charts cols={3}>
        <Panel title="Cancelled value by branch"><Donut data={br.map(([n, a]) => ({ name: n, value: Math.round(a.v / 1e6) }))} center={`${formatNumber(total / 1e9, 2)} bn`} fmt={(v) => `KES ${formatInteger(v)} m`} /></Panel>
        <Panel title="Cancelled units by branch"><Bars data={br.map(([n, a]) => ({ name: n, value: a.u }))} fmt={formatInteger} colorOf={(d) => (d.name === lead[0] ? palette.bad : palette.accent)} /></Panel>
        <Panel title="Value per cancelled order, KES k"><Bars data={br.map(([n, a]) => ({ name: n, value: Math.round(a.v / a.o / 1e3) }))} fmt={formatInteger} colorOf={() => palette.warn} /></Panel>
      </Charts>
      <Charts cols={1}><Panel title="Top 8 product lines, KES m" h={300}><Bars horizontal data={top.map((r) => ({ name: `${textCell(r, "Branch_Code")} ${textCell(r, "Product_ID").slice(-5)}`, value: Math.round(numberCell(r, "value_KES") / 1e6) }))} fmt={formatInteger} colorOf={() => palette.warn} /></Panel></Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: `${lead[0]} holds ${formatFraction(lead[1].v / total, 0)} of cancelled value.` }, { tag: "Opportunity", tone: "accent", text: `8 product lines are ${formatFraction(topShare, 0)} of it.` }]} />
    </Page>
  );
}
