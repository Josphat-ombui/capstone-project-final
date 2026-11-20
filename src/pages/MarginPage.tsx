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

const label: Record<string, string> = { none: "No volume lost", half: "Half of lift lost", all: "All lift lost" };

export function MarginPage({ data }: { data: DashboardData }) {
  const d = data.summary.discount, sc = tableRows(data, "discount_cap_scenarios"), mb = tableRows(data, "margin_by_discount");
  const get = (k: string) => numberCell(sc.find((r) => textCell(r, "assumption") === k) ?? {}, "profit_change_KES");
  const worst = get("all");
  const lv = (r: Record<string, unknown>) => `${numberCell(r as never, "Discount_Pct")}%`;
  const margins = mb.map((r) => Number(numberCell(r, "gross_margin_pct").toFixed(1)));
  return (
    <Page title="Margin and discounts" status={worst < 0 ? { tone: "warn", text: "Depends on volume" } : { tone: "good", text: "Upside" }}>
      <Kpis>
        <Kpi label="Gross margin" value={pct(d.overall_margin_pct)} ring={{ value: d.overall_margin_pct / 100 }} tone="accent" />
        <Kpi label="More units per point of discount" value={`+${formatNumber(d.full_period.pct_per_point, 1)}%`} ring={{ value: d.full_period.pct_per_point / 20 }} tone="good" />
        <Kpi label="Proposed cap" value={`${formatNumber(d.cap_pct, 0)}%`} sub={`${formatInteger(numberCell(sc[0] ?? {}, "orders_capped"))} orders`} tone="accent" />
        <Kpi label="Best case, KES" value={`+${formatNumber(get("none") / 1e6, 1)} m`} tone="good" spark={mb.map((r) => numberCell(r, "average_quantity"))} />
        <Kpi label="Worst case, KES" value={`${formatNumber(worst / 1e6, 1)} m`} tone={worst < 0 ? "bad" : "good"} />
      </Kpis>
      <Charts cols={3}>
        <Panel title="Gross margin by discount, %"><Bars data={mb.map((r, i) => ({ name: lv(r), value: margins[i] }))} fmt={pct} /></Panel>
        <Panel title="Units per order by discount"><Bars data={mb.map((r) => ({ name: lv(r), value: Number(numberCell(r, "average_quantity").toFixed(1)) }))} fmt={(v) => formatNumber(v, 1)} colorOf={() => palette.good} /></Panel>
        <Panel title="Orders by discount level"><Donut data={mb.map((r) => ({ name: lv(r), value: numberCell(r, "orders") }))} center={formatInteger(sum(mb.map((r) => numberCell(r, "orders"))))} fmt={formatInteger} /></Panel>
      </Charts>
      <Charts>
        <Panel title="Revenue by discount, KES bn"><Bars data={mb.map((r) => ({ name: lv(r), value: Number((numberCell(r, "net_revenue_KES") / 1e9).toFixed(2)) }))} fmt={(v) => formatNumber(v, 2)} colorOf={() => palette.accent} /></Panel>
        <Panel title="Cap impact on profit, KES m"><Bars data={sc.map((r) => ({ name: label[textCell(r, "assumption")] ?? textCell(r, "assumption"), value: Number((numberCell(r, "profit_change_KES") / 1e6).toFixed(1)) }))} fmt={(v) => formatNumber(v, 1)} colorOf={(x) => (x.value >= 0 ? palette.good : palette.bad)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Opportunity", tone: "accent", text: `Pilot the ${formatNumber(d.cap_pct, 0)}% cap in one branch.` }, { tag: "Caution", tone: "warn", text: `Each discount point lifts volume ${formatNumber(d.full_period.pct_per_point, 1)}%, but R² is ${formatNumber(d.full_period.r_squared, 2)}.` }]} />
    </Page>
  );
}
