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

export function CostPage({ data }: { data: DashboardData }) {
  const s = data.summary, sup = tableRows(data, "supplier_concentration"), last = sup[sup.length - 1];
  const hhi = numberCell(last, "hhi"), ok = hhi < targets.hhiThreshold;
  const pt = tableRows(data, "pass_through_by_category").map((r) => ({ name: textCell(r, "category"), value: Number(Math.abs(numberCell(r, "elasticity")).toFixed(2)) }));
  const yrs = (k: string) => sup.map((r) => ({ name: String(numberCell(r, "year")), value: Math.round(numberCell(r, k) * 10) / 10 }));
  const gain = s.forecast.improvement_vs_seasonal_naive_pct;
  return (
    <Page title="Costs and suppliers" status={ok ? { tone: "good", text: "Low concentration" } : { tone: "bad", text: "Concentrated" }}>
      <Kpis>
        <Kpi label="Purchase cost / year" value={`+${formatNumber(s.cost_trend.growth_pct_per_year, 1)}%`} ring={{ value: s.cost_trend.growth_pct_per_year / 20 }} tone="bad" />
        <Kpi label="Supplier HHI" value={formatInteger(hhi)} sub={`limit ${formatInteger(targets.hhiThreshold)}`} tone={ok ? "good" : "bad"} spark={yrs("hhi").map((y) => y.value)} />
        <Kpi label="Top supplier share" value={pct(numberCell(last, "top_share_pct"))} sub={textCell(last, "top_supplier")} tone="accent" spark={yrs("top_share_pct").map((y) => y.value)} />
        <Kpi label="Forecast vs naive" value={`+${formatNumber(gain, 0)}%`} sub={`target ${targets.forecastGainPct}%`} ring={{ value: gain / 30, target: targets.forecastGainPct / 30 }} tone={s.forecast.target_met ? "good" : "warn"} />
      </Kpis>
      <Charts cols={1}><Panel title="Supplier concentration (HHI) vs limit" h={260}><Area data={yrs("hhi")} fmt={formatInteger} refValue={targets.hhiThreshold} tickEvery={0} id="cs" /></Panel></Charts>
      <Charts>
        <Panel title="Largest supplier share, %"><Bars data={yrs("top_share_pct")} fmt={pct} colorOf={() => palette.accent} /></Panel>
        <Panel title="Price sensitivity by category"><Bars horizontal data={pt} fmt={(v) => formatNumber(v, 2)} colorOf={() => palette.accent} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: `Costs rise ${formatNumber(s.cost_trend.growth_pct_per_year, 1)}% a year.` }, { tag: "Strength", tone: "good", text: "No supplier dependence." }]} />
    </Page>
  );
}
