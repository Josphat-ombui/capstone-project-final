import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Bars, Charts, Insights, Kpi, Kpis, Page, Panel, Trendline } from "../components/Exec";
const pct = (v: number) => `${formatNumber(v, 1)}%`;

export function CostPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const sup = tableRows(data, "supplier_concentration");
  const last = sup[sup.length - 1];
  const hhi = numberCell(last, "hhi");
  const pt = [...tableRows(data, "pass_through_by_category")].map((r) => ({ name: textCell(r, "category"), value: Number(Math.abs(numberCell(r, "elasticity")).toFixed(2)) }));
  return (
    <Page title="Costs and suppliers" status={hhi < targets.hhiThreshold ? { tone: "good", text: "Low concentration" } : { tone: "bad", text: "Concentrated" }}>
      <Kpis>
        <Kpi label="Purchase cost / year" value={`+${formatNumber(s.cost_trend.growth_pct_per_year, 1)}%`} tone="bad" />
        <Kpi label="Supplier HHI" value={formatInteger(hhi)} sub={`limit ${formatInteger(targets.hhiThreshold)}`} tone={hhi < targets.hhiThreshold ? "good" : "bad"} />
        <Kpi label="Top supplier share" value={pct(numberCell(last, "top_share_pct"))} sub={textCell(last, "top_supplier")} tone="accent" />
        <Kpi label="Forecast vs naive" value={`+${formatNumber(s.forecast.improvement_vs_seasonal_naive_pct, 0)}%`} sub={`target ${targets.forecastGainPct}%`} tone={s.forecast.target_met ? "good" : "warn"} />
      </Kpis>
      <Charts>
        <Panel title="Supplier concentration (HHI)"><Trendline data={sup.map((r) => ({ name: String(numberCell(r, "year")), value: Math.round(numberCell(r, "hhi")) }))} fmt={(v) => formatInteger(v)} refValue={targets.hhiThreshold} tickEvery={1} /></Panel>
        <Panel title="Price sensitivity by category"><Bars horizontal data={pt} fmt={(v) => formatNumber(v, 2)} colorOf={() => palette.accent} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: `Costs rise ${formatNumber(s.cost_trend.growth_pct_per_year, 1)}% a year.` }, { tag: "Strength", tone: "good", text: "No supplier dependence." }]} />
    </Page>
  );
}
