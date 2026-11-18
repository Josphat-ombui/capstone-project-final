import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber, formatPercent } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Plot, Section, TableCard, type Finding } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

const forecastColumns: ColumnSpec[] = [
  { key: "method", label: "Forecast method" },
  { key: "series", label: "Product lines", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "rmse", label: "Error (RMSE)", align: "right", format: (v) => formatNumber(Number(v), 1) },
  { key: "wape_pct", label: "Error (WAPE)", align: "right", format: (v) => formatPercent(Number(v), 1) },
  { key: "bias_pct", label: "Bias", align: "right", format: (v) => formatPercent(Number(v), 1) },
];

const reorderColumns: ColumnSpec[] = [
  { key: "Branch_Code", label: "Branch", nowrap: true },
  { key: "Product_ID", label: "Product", nowrap: true },
  { key: "monthly_mean", label: "Average per month", align: "right", format: (v) => formatNumber(Number(v), 0) },
  { key: "daily_mean", label: "Average per day", align: "right", format: (v) => formatNumber(Number(v), 1) },
  { key: "reorder_point_14d", label: "Reorder point, 14 days", align: "right", format: (v) => formatNumber(Number(v), 0) },
  { key: "reorder_point_30d", label: "Reorder point, 30 days", align: "right", format: (v) => formatNumber(Number(v), 0) },
  { key: "reorder_point_60d", label: "Reorder point, 60 days", align: "right", format: (v) => formatNumber(Number(v), 0) },
];

export function InventoryPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const cancelled = tableRows(data, "cancelled_stock_outflows");
  const total = sum(cancelled.map((r) => numberCell(r, "value_KES")));
  const byBranch = new Map<string, number>();
  cancelled.forEach((r) => byBranch.set(textCell(r, "Branch_Code"), (byBranch.get(textCell(r, "Branch_Code")) ?? 0) + numberCell(r, "value_KES")));
  const branches = [...byBranch].sort((a, b) => b[1] - a[1]);
  const topBranch = branches[0];
  const topProducts = [...cancelled].sort((a, b) => numberCell(b, "value_KES") - numberCell(a, "value_KES")).slice(0, 8);
  const topShare = sum(topProducts.map((r) => numberCell(r, "value_KES"))) / total;
  const forecasts = tableRows(data, "forecast_holdout");
  const chosen = s.forecast.chosen_method;
  const reorder = tableRows(data, "reorder_points");

  const findings: Finding[] = [
    { tag: "Risk", tone: "bad", text: `${topBranch?.[0] ?? "One branch"} holds ${formatFraction(topBranch ? topBranch[1] / total : 0, 0)} of cancelled stock value, so most of the loss is concentrated.` },
    { tag: "Opportunity", tone: "accent", text: `Eight product lines account for ${formatFraction(topShare, 0)} of cancelled value. Start the review there.` },
    { tag: "Forecast", tone: s.forecast.target_met ? "good" : "warn", text: `${chosen} beats the seasonal baseline by ${formatNumber(s.forecast.improvement_vs_seasonal_naive_pct, 0)}%, against a target of ${targets.forecastGainPct}%.` },
  ];

  return (
    <Page
      eyebrow="Commercial and supply"
      title="Inventory and stock"
      question="How much stock is cancelled, when should each product be reordered, and does the forecast beat a simple baseline?"
      status={{ tone: "warn", text: "Cancelled outflows" }}
      questionIds={["inventory", "forecast"]}
    >
      <Kpis>
        <Kpi tone="bad" label="Cancelled stock value" value={`KES ${formatNumber(total / 1e9, 2)} bn`} caption="stock outflows later cancelled" />
        <Kpi tone="accent" label="Cancelled orders" value={formatInteger(sum(cancelled.map((r) => numberCell(r, "orders"))))} caption={`${formatInteger(sum(cancelled.map((r) => numberCell(r, "units"))))} units`} />
        <Kpi tone="warn" label="Largest branch share" value={formatFraction(topBranch ? topBranch[1] / total : 0, 0)} caption={topBranch?.[0]} />
        <Kpi tone={s.forecast.target_met ? "good" : "warn"} label="Forecast gain vs baseline" value={`+${formatNumber(s.forecast.improvement_vs_seasonal_naive_pct, 0)}%`} caption={`target ${targets.forecastGainPct}%`} />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="Where cancelled stock value sits, and how the forecast methods compare on the holdout year.">
        <Grid cols={2}>
          <Panel title="Cancelled value by branch, KES m" note="Red marks the largest branch.">
            <Plot>
              <Bars data={branches.map(([name, v]) => ({ name, value: Math.round(v / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={(d) => (d.name === topBranch?.[0] ? palette.bad : palette.accent)} />
            </Plot>
          </Panel>
          <Panel title="Top eight products, KES m" note="Cancelled value for the products with the most cancelled stock.">
            <Plot>
              <Bars horizontal data={topProducts.map((r) => ({ name: `${textCell(r, "Branch_Code")} ${textCell(r, "Product_ID").slice(-5)}`, value: Math.round(numberCell(r, "value_KES") / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={() => palette.warn} />
            </Plot>
          </Panel>
          <Panel title="Forecast error by method, %" note="Lower is better. The method in green is the one chosen for the forecast.">
            <Plot>
              <Bars horizontal data={forecasts.map((r) => ({ name: textCell(r, "method"), value: Number(numberCell(r, "wape_pct").toFixed(1)) }))} fmt={(v) => `${formatNumber(v, 1)}%`} colorOf={(d) => (d.name === chosen ? palette.good : palette.muted)} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard title="Forecast methods on the holdout year" note="The error of each method on the year held back from the fit." rows={forecasts} columns={forecastColumns} fileName="forecast-holdout.csv" pageSize={5} />
        <TableCard title="Reorder points by product" note="Stock level at which to reorder, for 14, 30 and 60 days of cover. Search for a branch or product." rows={reorder} columns={reorderColumns} fileName="reorder-points.csv" pageSize={12} />
      </Section>
    </Page>
  );
}
