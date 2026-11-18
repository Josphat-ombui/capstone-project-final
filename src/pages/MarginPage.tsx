import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { Bars, Charts, Insights, Kpi, Kpis, Page, Panel } from "../components/Exec";
const pct = (v: number) => `${formatNumber(v, 1)}%`;

const label: Record<string, string> = { none: "No volume lost", half: "Half of lift lost", all: "All lift lost" };

export function MarginPage({ data }: { data: DashboardData }) {
  const d = data.summary.discount;
  const sc = tableRows(data, "discount_cap_scenarios");
  const m = tableRows(data, "margin_by_discount").map((r) => ({ name: `${numberCell(r, "Discount_Pct")}%`, value: Number(numberCell(r, "gross_margin_pct").toFixed(1)) }));
  const get = (k: string) => numberCell(sc.find((r) => textCell(r, "assumption") === k) ?? {}, "profit_change_KES");
  const worst = get("all");
  return (
    <Page title="Margin and discounts" status={worst < 0 ? { tone: "warn", text: "Depends on volume" } : { tone: "good", text: "Upside" }}>
      <Kpis>
        <Kpi label="Gross margin" value={pct(d.overall_margin_pct)} tone="accent" />
        <Kpi label="Proposed cap" value={`${formatNumber(d.cap_pct, 0)}%`} sub={`${formatInteger(numberCell(sc[0] ?? {}, "orders_capped"))} orders`} tone="accent" />
        <Kpi label="Best case, KES" value={`+${formatNumber(get("none") / 1e6, 0)} m`} tone="good" />
        <Kpi label="Worst case, KES" value={`${formatNumber(worst / 1e6, 0)} m`} tone={worst < 0 ? "bad" : "good"} />
      </Kpis>
      <Charts>
        <Panel title="Gross margin by discount, %"><Bars data={m} fmt={pct} colorOf={() => palette.accent} /></Panel>
        <Panel title="Cap impact on profit, KES m"><Bars data={sc.map((r) => ({ name: label[textCell(r, "assumption")] ?? textCell(r, "assumption"), value: Math.round(numberCell(r, "profit_change_KES") / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={(x) => (x.value >= 0 ? palette.good : palette.bad)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Opportunity", tone: "accent", text: `Pilot the ${formatNumber(d.cap_pct, 0)}% cap in one branch.` }, { tag: "Caution", tone: "warn", text: `Each discount point lifts volume ${formatNumber(d.full_period.pct_per_point, 1)}%, but R² is ${formatNumber(d.full_period.r_squared, 2)}.` }]} />
    </Page>
  );
}
