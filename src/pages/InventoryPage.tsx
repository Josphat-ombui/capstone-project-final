import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { Bars, Charts, Insights, Kpi, Kpis, Page, Panel } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function InventoryPage({ data }: { data: DashboardData }) {
  const c = tableRows(data, "cancelled_stock_outflows");
  const total = sum(c.map((r) => numberCell(r, "value_KES")));
  const byBranch = new Map<string, number>();
  c.forEach((r) => byBranch.set(textCell(r, "Branch_Code"), (byBranch.get(textCell(r, "Branch_Code")) ?? 0) + numberCell(r, "value_KES")));
  const branches = [...byBranch].sort((a, b) => b[1] - a[1]);
  const top = [...c].sort((a, b) => numberCell(b, "value_KES") - numberCell(a, "value_KES")).slice(0, 8);
  const topShare = sum(top.map((r) => numberCell(r, "value_KES"))) / total;
  return (
    <Page title="Inventory and stock" status={{ tone: "warn", text: "Cancelled outflows" }}>
      <Kpis>
        <Kpi label="Cancelled value, KES" value={`${formatNumber(total / 1e9, 2)} bn`} tone="bad" />
        <Kpi label="Cancelled orders" value={formatInteger(sum(c.map((r) => numberCell(r, "orders"))))} tone="accent" />
        <Kpi label="Top branch share" value={formatFraction((branches[0]?.[1] ?? 0) / total, 0)} sub={branches[0]?.[0]} tone="warn" />
        <Kpi label="Items with reorder points" value={formatInteger(tableRows(data, "reorder_points").length)} tone="good" />
      </Kpis>
      <Charts>
        <Panel title="Cancelled value by branch, KES m"><Bars data={branches.map(([name, v]) => ({ name, value: Math.round(v / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={(d) => (d.name === branches[0]?.[0] ? palette.bad : palette.accent)} /></Panel>
        <Panel title="Top 8 products, KES m"><Bars horizontal data={top.map((r) => ({ name: `${textCell(r, "Branch_Code")} ${textCell(r, "Product_ID").slice(-5)}`, value: Math.round(numberCell(r, "value_KES") / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={() => palette.warn} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: `${branches[0]?.[0]} holds ${formatFraction((branches[0]?.[1] ?? 0) / total, 0)} of cancelled value.` }, { tag: "Opportunity", tone: "accent", text: `8 product lines are ${formatFraction(topShare, 0)} of it.` }]} />
    </Page>
  );
}
